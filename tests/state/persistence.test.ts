import { describe, expect, it } from "vitest";
import { buyerContextReceipt } from "../../src/domain/receipts.ts";
import type { RoomState } from "../../src/domain/types.ts";
import { MERIDIAN_CONTEXT_DRAFT } from "../../src/fixtures/buyer.ts";
import { createRoomStore } from "../../src/state/createRoomStore.ts";
import { hydrateRoom } from "../../src/state/migrations.ts";
import {
  createLocalRoomStorage,
  createMemoryRoomStorage,
  ROOM_STORAGE_KEY,
} from "../../src/state/persistence.ts";
import { selectLedgerTotals, selectRequirementSummaries } from "../../src/state/selectors.ts";
import {
  attachCanonicalEvidence,
  canonicalRoom,
  createTestRoom,
  FIXED_NOW,
} from "../support/room.ts";

type PersistedApprovedContext = {
  schemaVersion: 1;
  savedAt: string;
  room: RoomState;
};

function persistedApprovedContext(): PersistedApprovedContext {
  const handle = createTestRoom();
  const staged = handle.agentActions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT);
  if (!staged.ok) {
    throw new Error(`Could not stage buyer context: ${staged.error.code}`);
  }
  const approved = handle.actions.approveBuyerContext({ proposalId: staged.value.proposalId });
  if (!approved.ok) {
    throw new Error(`Could not approve buyer context: ${approved.error.code}`);
  }

  return {
    schemaVersion: 1,
    savedAt: FIXED_NOW,
    room: structuredClone(handle.room()),
  };
}

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

  it("reloads approved buyer context and its real approval receipt", () => {
    const storage = createMemoryRoomStorage();
    const first = createTestRoom({ storage });
    const staged = first.agentActions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT);
    expect(staged.ok).toBe(true);
    if (!staged.ok) {
      return;
    }
    const approved = first.actions.approveBuyerContext({ proposalId: staged.value.proposalId });
    expect(approved.ok).toBe(true);
    if (!approved.ok) {
      return;
    }

    const second = createTestRoom({ storage });
    const reloadedReceipt = buyerContextReceipt(second.room());

    expect(second.hydration.source).toBe("persisted");
    expect(second.hydration.notice).toBeNull();
    expect(second.room().recoveryNotice).toBeNull();
    expect(second.room().approvedBuyerContext).toEqual(MERIDIAN_CONTEXT_DRAFT);
    expect(second.room().approvedBuyerContextReceipt).toEqual(approved.value.receipt);
    expect(reloadedReceipt).toEqual(approved.value.receipt);
  });

  it.each([
    {
      corruption: "a decision receipt in the buyer-context field",
      apply: (seed: PersistedApprovedContext) => {
        seed.room.approvedBuyerContextReceipt!.kind = "decision";
      },
    },
    {
      corruption: "a buyer-context receipt without a proposal ID",
      apply: (seed: PersistedApprovedContext) => {
        seed.room.approvedBuyerContextReceipt!.proposalId = null;
      },
    },
    {
      corruption: "a buyer-context receipt from a future revision",
      apply: (seed: PersistedApprovedContext) => {
        seed.room.approvedBuyerContextReceipt!.revision = seed.room.revision + 1;
      },
    },
    {
      corruption: "a buyer-context receipt with a different valid digest",
      apply: (seed: PersistedApprovedContext) => {
        seed.room.approvedBuyerContextReceipt!.inputDigest = "differentdigest1";
      },
    },
    {
      corruption: "a buyer-context receipt without approved context",
      apply: (seed: PersistedApprovedContext) => {
        seed.room.approvedBuyerContext = null;
      },
    },
  ])("recovers from $corruption", ({ apply }) => {
    const seed = persistedApprovedContext();
    apply(seed);

    const handle = createTestRoom({
      storage: createMemoryRoomStorage({ seed }),
    });

    expect(handle.hydration.source).toBe("fixture");
    expect(handle.hydration.room).toEqual(canonicalRoom());
    expect(handle.room().recoveryNotice?.code).toBe("invalid_persisted_state");
    expect(handle.room().approvedBuyerContext).toBeNull();
    expect(handle.room().approvedBuyerContextReceipt).toBeNull();
  });

  it("hydrates an item 6 schema-version-1 room and reconstructs its legacy receipt", () => {
    const first = createTestRoom();
    const staged = first.agentActions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT);
    expect(staged.ok).toBe(true);
    if (!staged.ok) {
      return;
    }
    const approved = first.actions.approveBuyerContext({ proposalId: staged.value.proposalId });
    expect(approved.ok).toBe(true);
    if (!approved.ok) {
      return;
    }
    const legacyRoom = Object.fromEntries(
      Object.entries(structuredClone(first.room())).filter(
        ([key]) => key !== "approvedBuyerContextReceipt",
      ),
    );
    const storage = createMemoryRoomStorage({
      seed: { schemaVersion: 1, savedAt: FIXED_NOW, room: legacyRoom },
    });

    const second = createTestRoom({ storage });

    expect(second.hydration.source).toBe("persisted");
    expect(second.hydration.notice).toBeNull();
    expect(second.room().recoveryNotice).toBeNull();
    expect(second.room().approvedBuyerContextReceipt).toEqual(approved.value.receipt);
    expect(buyerContextReceipt(second.room())).toEqual(approved.value.receipt);
  });

  it("keeps the exact buyer-context receipt after its approval event leaves the ledger", () => {
    const handle = createRoomStore({
      storage: createMemoryRoomStorage(),
      now: () => FIXED_NOW,
      persist: false,
    });
    const staged = handle.agentActions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT);
    expect(staged.ok).toBe(true);
    if (!staged.ok) {
      return;
    }
    const approved = handle.actions.approveBuyerContext({ proposalId: staged.value.proposalId });
    expect(approved.ok).toBe(true);
    if (!approved.ok) {
      return;
    }

    for (let event = 0; event < 401; event += 1) {
      expect(handle.agentActions.getRoomState().ok).toBe(true);
    }

    const room = handle.store.getState().room;
    expect(room.activityLedger).toHaveLength(400);
    expect(room.activityLedger.some((entry) => entry.action === "approve_buyer_context")).toBe(
      false,
    );
    expect(room.approvedBuyerContextReceipt).toEqual(approved.value.receipt);
    expect(buyerContextReceipt(room)).toEqual(approved.value.receipt);
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
    handle.actions.applyRoiAssumptions({
      ...handle.room().roiAssumptions,
      budgetCeiling: 100000,
    });

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

    first.actions.applyRoiAssumptions({
      ...first.store.getState().room.roiAssumptions,
      budgetCeiling: 100000,
    });

    expect(first.store.getState().room.revision).toBe(1);
    expect(second.store.getState().room.revision).toBe(0);
  });
});
