import { describe, expect, it } from "vitest";
import { createRoomStore } from "../../src/state/createRoomStore.ts";
import { hydrateRoom } from "../../src/state/migrations.ts";
import {
  createLocalRoomStorage,
  createMemoryRoomStorage,
  ROOM_STORAGE_KEY,
} from "../../src/state/persistence.ts";
import { selectLedgerTotals, selectRequirementSummaries } from "../../src/state/selectors.ts";
import { attachCanonicalEvidence, createTestRoom, FIXED_NOW } from "../support/room.ts";

describe("persistence round trip", () => {
  it("reloads the saved room from the same storage", () => {
    const storage = createMemoryRoomStorage();
    const first = createTestRoom({ storage });
    attachCanonicalEvidence(first);
    const revision = first.room().revision;

    const second = createTestRoom({ storage });

    expect(second.hydration.source).toBe("persisted");
    expect(second.room().revision).toBe(revision);
    expect(
      second.room().requirements.find((entry) => entry.id === "req_salesforce")?.status,
    ).toBe("supported");
  });

  it("uses the fixture when storage is empty", () => {
    const handle = createTestRoom({ storage: createMemoryRoomStorage() });
    expect(handle.hydration.source).toBe("fixture");
    expect(handle.room().recoveryNotice).toBeNull();
  });

  it("recovers from a corrupted payload with a visible notice", () => {
    const storage = createMemoryRoomStorage({ seed: { schemaVersion: 1, savedAt: "nope", room: {} } });
    const handle = createTestRoom({ storage });

    expect(handle.hydration.source).toBe("fixture");
    expect(handle.room().recoveryNotice?.code).toBe("invalid_persisted_state");
    expect(handle.room().requirements).toHaveLength(6);
  });

  it("recovers from an unsupported schema version", () => {
    const storage = createMemoryRoomStorage({
      seed: { schemaVersion: 99, savedAt: FIXED_NOW, room: { schemaVersion: 99 } },
    });
    const handle = createTestRoom({ storage });

    expect(handle.room().recoveryNotice?.code).toBe("unsupported_schema_version");
    expect(handle.room().recoveryNotice?.message).toContain("99");
  });

  it("keeps working when storage is unavailable", () => {
    const storage = createMemoryRoomStorage({ failReads: true, failWrites: true });
    const handle = createTestRoom({ storage });

    expect(handle.room().recoveryNotice?.code).toBe("storage_unavailable");
    expect(handle.store.getState().storageStatus).toBe("unavailable");

    const result = handle.agentActions.attachEvidence({
      requirementId: "req_salesforce",
      evidenceIds: ["ev_002"],
    });

    expect(result.ok).toBe(true);
    expect(handle.room().revision).toBe(1);

    const retried = handle.retryPersist();
    expect(retried.ok).toBe(false);
    expect(retried.ok === false && retried.error.code).toBe("PERSISTENCE_UNAVAILABLE");
  });

  it("lets a person dismiss the recovery notice", () => {
    const storage = createMemoryRoomStorage({ seed: { nonsense: true } });
    const handle = createTestRoom({ storage });

    expect(handle.room().recoveryNotice).not.toBeNull();
    const result = handle.actions.dismissRecoveryNotice();

    expect(result.ok).toBe(true);
    expect(handle.room().recoveryNotice).toBeNull();
    expect(handle.actions.dismissRecoveryNotice().ok).toBe(false);
  });

  it("does not trust a persisted supported status when the evidence expired", () => {
    const storage = createMemoryRoomStorage();
    const seeded = createTestRoom({ storage, startIso: "2025-01-15T00:00:00.000Z" });

    const attached = seeded.agentActions.attachEvidence({
      requirementId: "req_soc2",
      evidenceIds: ["ev_005"],
    });
    expect(attached.ok).toBe(true);
    expect(seeded.room().requirements.find((entry) => entry.id === "req_soc2")?.status).toBe(
      "supported",
    );

    const later = createTestRoom({ storage, startIso: FIXED_NOW });
    expect(later.hydration.source).toBe("persisted");
    expect(later.room().requirements.find((entry) => entry.id === "req_soc2")?.status).toBe(
      "unknown",
    );
  });

  it("hydrates directly from a storage read result", () => {
    const result = hydrateRoom({ status: "empty" }, FIXED_NOW);
    expect(result.source).toBe("fixture");
    expect(result.room.activityLedger[0]?.createdAt).toBe(FIXED_NOW);
  });
});

describe("local storage adapter", () => {
  it("writes and reads through the browser storage key", () => {
    const storage = createLocalRoomStorage();
    const handle = createTestRoom({ storage });

    handle.agentActions.attachEvidence({ requirementId: "req_sso", evidenceIds: ["ev_006"] });

    expect(globalThis.localStorage.getItem(ROOM_STORAGE_KEY)).toContain("req_sso");
    expect(storage.load().status).toBe("found");

    expect(storage.clear().status).toBe("saved");
    expect(storage.load().status).toBe("empty");
  });

  it("reports unavailable storage instead of throwing", () => {
    const storage = createLocalRoomStorage(() => null);
    expect(storage.load()).toEqual({
      status: "unavailable",
      detail: "Local storage is not available in this context.",
    });
    expect(storage.clear().status).toBe("unavailable");
  });

  it("reports an unreadable payload", () => {
    globalThis.localStorage.setItem(ROOM_STORAGE_KEY, "{not json");
    const storage = createLocalRoomStorage();
    expect(storage.load().status).toBe("unreadable");
  });
});

describe("selectors", () => {
  it("does not count the canonical system lifecycle event as a read", () => {
    const totals = selectLedgerTotals(createTestRoom().room());

    expect(totals.total).toBe(1);
    expect(totals.byOrigin.system).toBe(1);
    expect(totals.reads).toBe(0);
    expect(totals.mutations).toBe(0);
  });

  it("projects requirement summaries with blockers and limitation counts", () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);

    const summaries = selectRequirementSummaries(handle.room());
    const eu = summaries.find((entry) => entry.id === "req_eu_residency");
    const salesforce = summaries.find((entry) => entry.id === "req_salesforce");

    expect(eu?.blocksReadyDecision).toBe(true);
    expect(eu?.gapLabels).toContain("EU data region storage");
    expect(salesforce?.blocksReadyDecision).toBe(false);
    expect(salesforce?.limitationCount).toBeGreaterThan(0);
  });

  it("totals the ledger by origin and kind", () => {
    const handle = createTestRoom();
    handle.agentActions.getRoomState();
    handle.actions.applyRoiAssumptions(handle.room().roiAssumptions);

    const totals = selectLedgerTotals(handle.room());
    expect(totals.total).toBe(3);
    expect(totals.reads).toBe(1);
    expect(totals.mutations).toBe(1);
    expect(totals.byOrigin.webmcp).toBe(1);
    expect(totals.byOrigin.ui).toBe(1);
    expect(totals.byOrigin.system).toBe(1);
  });

  it("creates independent stores so tests never share a room", () => {
    const first = createRoomStore({ storage: createMemoryRoomStorage(), now: () => FIXED_NOW });
    const second = createRoomStore({ storage: createMemoryRoomStorage(), now: () => FIXED_NOW });

    first.actions.applyRoiAssumptions(first.store.getState().room.roiAssumptions);

    expect(first.store.getState().room.revision).toBe(1);
    expect(second.store.getState().room.revision).toBe(0);
  });
});
