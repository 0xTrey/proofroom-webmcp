import { describe, expect, it } from "vitest";
import type { RoomState } from "../../src/domain/types.ts";
import { createMemoryRoomStorage } from "../../src/state/persistence.ts";
import { attachCanonicalEvidence, createTestRoom, FIXED_NOW } from "../support/room.ts";
import { MERIDIAN_CONTEXT_DRAFT } from "../../src/fixtures/buyer.ts";

type PersistedDecision = {
  schemaVersion: 1;
  savedAt: string;
  room: RoomState;
};

function persistedApprovedDecision(): {
  room: RoomState;
  proposalId: string;
  receiptId: string;
} {
  const handle = createTestRoom();
  const staged = handle.agentActions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT);
  if (!staged.ok) throw new Error("Could not stage context");
  const approved = handle.actions.approveBuyerContext({ proposalId: staged.value.proposalId });
  if (!approved.ok) throw new Error("Could not approve context");
  attachCanonicalEvidence(handle);

  const decisionStaged = handle.agentActions.proposeDecisionStatus({
    status: "not_ready",
    rationale: "EU data residency cannot be proven.",
    supportingRequirementIds: ["req_salesforce", "req_soc2", "req_campaign_volume"],
    blockingRequirementIds: ["req_eu_residency", "req_sso"],
    risks: ["No EU region commitment."],
    nextStep: "Request an EU region commitment.",
  });
  if (!decisionStaged.ok) throw new Error("Could not stage decision");

  const decisionApproved = handle.actions.approveDecision({
    proposalId: decisionStaged.value.proposalId,
  });
  if (!decisionApproved.ok) throw new Error("Could not approve decision");

  return {
    room: structuredClone(handle.room()),
    proposalId: decisionStaged.value.proposalId,
    receiptId: decisionApproved.value.receipt.id,
  };
}

describe("approved decision reload", () => {
  it("reloads the exact approved decision and receipt", () => {
    const storage = createMemoryRoomStorage();
    const first = createTestRoom({ storage });
    const staged = first.agentActions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT);
    expect(staged.ok).toBe(true);
    if (!staged.ok) return;
    first.actions.approveBuyerContext({ proposalId: staged.value.proposalId });
    attachCanonicalEvidence(first);

    const decisionStaged = first.agentActions.proposeDecisionStatus({
      status: "not_ready",
      rationale: "EU data residency cannot be proven.",
      supportingRequirementIds: ["req_salesforce", "req_soc2", "req_campaign_volume"],
      blockingRequirementIds: ["req_eu_residency", "req_sso"],
      risks: ["No EU region commitment."],
      nextStep: "Request an EU region commitment.",
    });
    expect(decisionStaged.ok).toBe(true);
    if (!decisionStaged.ok) return;

    const approved = first.actions.approveDecision({
      proposalId: decisionStaged.value.proposalId,
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;

    const second = createTestRoom({ storage });
    expect(second.hydration.source).toBe("persisted");
    expect(second.hydration.notice).toBeNull();
    expect(second.room().approvedDecision).not.toBeNull();
    expect(second.room().approvedDecision?.status).toBe("not_ready");
    expect(second.room().approvedDecision?.proposalId).toBe(decisionStaged.value.proposalId);
    expect(second.room().approvedDecision?.receipt).toEqual(approved.value.receipt);
  });
});

describe("proposal type narrowing", () => {
  it("rejects a buyer-context proposal with a decision type", () => {
    const { room } = persistedApprovedDecision();
    const seed = {
      schemaVersion: 1 as const,
      savedAt: FIXED_NOW,
      room: { ...room },
    };
    if (seed.room.buyerContextProposal) {
      seed.room.buyerContextProposal.type = "decision" as never;
    } else {
      seed.room.buyerContextProposal = {
        ...room.decisionProposal!,
        type: "decision" as never,
      } as never;
    }

    const handle = createTestRoom({ storage: createMemoryRoomStorage({ seed }) });
    expect(handle.hydration.source).toBe("fixture");
    expect(handle.room().recoveryNotice?.code).toBe("invalid_persisted_state");
  });

  it("rejects a decision proposal with a buyer_context type", () => {
    const { room } = persistedApprovedDecision();
    const seed = {
      schemaVersion: 1 as const,
      savedAt: FIXED_NOW,
      room: { ...room },
    };
    if (seed.room.decisionProposal) {
      seed.room.decisionProposal.type = "buyer_context" as never;
    }

    const handle = createTestRoom({ storage: createMemoryRoomStorage({ seed }) });
    expect(handle.hydration.source).toBe("fixture");
    expect(handle.room().recoveryNotice?.code).toBe("invalid_persisted_state");
  });
});

describe("approved decision receipt corruption", () => {
  it("recovers from a wrong receipt kind", () => {
    const { room } = persistedApprovedDecision();
    const seed: PersistedDecision = {
      schemaVersion: 1,
      savedAt: FIXED_NOW,
      room: structuredClone(room),
    };
    seed.room.approvedDecision!.receipt.kind = "buyer_context" as never;

    const handle = createTestRoom({ storage: createMemoryRoomStorage({ seed }) });
    expect(handle.hydration.source).toBe("fixture");
    expect(handle.room().recoveryNotice?.code).toBe("invalid_persisted_state");
  });

  it("recovers from a mismatched proposal ID", () => {
    const { room } = persistedApprovedDecision();
    const seed: PersistedDecision = {
      schemaVersion: 1,
      savedAt: FIXED_NOW,
      room: structuredClone(room),
    };
    seed.room.approvedDecision!.receipt.proposalId = "pdc_9999";

    const handle = createTestRoom({ storage: createMemoryRoomStorage({ seed }) });
    expect(handle.hydration.source).toBe("fixture");
    expect(handle.room().recoveryNotice?.code).toBe("invalid_persisted_state");
  });

  it("recovers from a future receipt revision", () => {
    const { room } = persistedApprovedDecision();
    const seed: PersistedDecision = {
      schemaVersion: 1,
      savedAt: FIXED_NOW,
      room: structuredClone(room),
    };
    seed.room.approvedDecision!.receipt.revision = room.revision + 100;
    seed.room.approvedDecision!.approvedAtRevision = room.revision + 100;

    const handle = createTestRoom({ storage: createMemoryRoomStorage({ seed }) });
    expect(handle.hydration.source).toBe("fixture");
    expect(handle.room().recoveryNotice?.code).toBe("invalid_persisted_state");
  });

  it("recovers from a mismatched digest", () => {
    const { room } = persistedApprovedDecision();
    const seed: PersistedDecision = {
      schemaVersion: 1,
      savedAt: FIXED_NOW,
      room: structuredClone(room),
    };
    seed.room.approvedDecision!.receipt.inputDigest = "deadbeefdeadbeef";

    const handle = createTestRoom({ storage: createMemoryRoomStorage({ seed }) });
    expect(handle.hydration.source).toBe("fixture");
    expect(handle.room().recoveryNotice?.code).toBe("invalid_persisted_state");
  });

  it("recovers from a mismatched timestamp", () => {
    const { room } = persistedApprovedDecision();
    const seed: PersistedDecision = {
      schemaVersion: 1,
      savedAt: FIXED_NOW,
      room: structuredClone(room),
    };
    seed.room.approvedDecision!.receipt.issuedAt = "2025-01-01T00:00:00.000Z";

    const handle = createTestRoom({ storage: createMemoryRoomStorage({ seed }) });
    expect(handle.hydration.source).toBe("fixture");
    expect(handle.room().recoveryNotice?.code).toBe("invalid_persisted_state");
  });

  it("recovers from a null receipt proposal ID", () => {
    const { room } = persistedApprovedDecision();
    const seed: PersistedDecision = {
      schemaVersion: 1,
      savedAt: FIXED_NOW,
      room: structuredClone(room),
    };
    seed.room.approvedDecision!.receipt.proposalId = null;

    const handle = createTestRoom({ storage: createMemoryRoomStorage({ seed }) });
    expect(handle.hydration.source).toBe("fixture");
    expect(handle.room().recoveryNotice?.code).toBe("invalid_persisted_state");
  });
});

describe("historical approved decision", () => {
  it("preserves the approved decision when the room advances", () => {
    const storage = createMemoryRoomStorage();
    const first = createTestRoom({ storage });
    const staged = first.agentActions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT);
    expect(staged.ok).toBe(true);
    if (!staged.ok) return;
    first.actions.approveBuyerContext({ proposalId: staged.value.proposalId });
    attachCanonicalEvidence(first);

    const decisionStaged = first.agentActions.proposeDecisionStatus({
      status: "not_ready",
      rationale: "EU data residency cannot be proven.",
      supportingRequirementIds: ["req_salesforce", "req_soc2", "req_campaign_volume"],
      blockingRequirementIds: ["req_eu_residency", "req_sso"],
      risks: ["No EU region commitment."],
      nextStep: "Request an EU region commitment.",
    });
    expect(decisionStaged.ok).toBe(true);
    if (!decisionStaged.ok) return;

    const approved = first.actions.approveDecision({
      proposalId: decisionStaged.value.proposalId,
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;

    const approvedRevision = first.room().revision;
    first.actions.applyRoiAssumptions({
      ...first.room().roiAssumptions,
      budgetCeiling: 100000,
    });

    expect(first.room().approvedDecision).not.toBeNull();
    expect(first.room().approvedDecision?.approvedAtRevision).toBe(approvedRevision);
    expect(first.room().revision).toBeGreaterThan(approvedRevision);
  });
});
