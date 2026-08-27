import { describe, expect, it } from "vitest";
import { inputDigest } from "../../src/domain/hash.ts";
import { PROPOSAL_TTL_MS } from "../../src/domain/invariants.ts";
import { attachCanonicalEvidence, createTestRoom, type TestRoom } from "../support/room.ts";

function stageDecision(handle: TestRoom): string {
  attachCanonicalEvidence(handle);
  const staged = handle.agentActions.proposeDecisionStatus({
    status: "not_ready",
    rationale: "EU data residency cannot be proven.",
    supportingRequirementIds: ["req_salesforce", "req_soc2", "req_campaign_volume"],
    blockingRequirementIds: ["req_eu_residency", "req_sso"],
    risks: ["No EU region commitment."],
    nextStep: "Request an EU region commitment.",
  });
  if (!staged.ok) throw new Error(`Could not stage decision: ${staged.error.code}`);
  return staged.value.proposalId;
}

function expectAtomicFailure(
  handle: TestRoom,
  proposalId: string,
  code: string,
): void {
  const before = structuredClone(handle.room());
  const result = handle.actions.rejectDecision({
    proposalId,
    reason: "Rejected during a domain guard test.",
  });
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.code).toBe(code);
  expect(handle.room()).toEqual(before);
}

describe("decision rejection guards", () => {
  it("rejects a missing proposal atomically", () => {
    const handle = createTestRoom();
    expectAtomicFailure(handle, "pdc_9999", "NOT_FOUND");
  });

  it("rejects a stale proposal atomically", () => {
    const handle = createTestRoom();
    const proposalId = stageDecision(handle);
    handle.actions.applyRoiAssumptions({
      ...handle.room().roiAssumptions,
      budgetCeiling: 100000,
    });
    expectAtomicFailure(handle, proposalId, "PROPOSAL_STALE");
  });

  it("rejects an expired proposal atomically", () => {
    const handle = createTestRoom();
    const proposalId = stageDecision(handle);
    handle.clock.advance(PROPOSAL_TTL_MS + 1);
    expectAtomicFailure(handle, proposalId, "PROPOSAL_EXPIRED");
  });

  it("rejects an already resolved proposal atomically", () => {
    const handle = createTestRoom();
    const proposalId = stageDecision(handle);
    const first = handle.actions.rejectDecision({
      proposalId,
      reason: "The person rejected the proposal.",
    });
    expect(first.ok).toBe(true);
    expectAtomicFailure(handle, proposalId, "PROPOSAL_RESOLVED");
  });

  it("rejects a digest-tampered proposal atomically", () => {
    const handle = createTestRoom();
    const proposalId = stageDecision(handle);
    const room = handle.room();
    handle.store.setState({
      room: {
        ...room,
        decisionProposal: {
          ...room.decisionProposal!,
          inputDigest: "deadbeefdeadbeef",
        },
      },
    });
    expectAtomicFailure(handle, proposalId, "INVALID_INPUT");
  });

  it("rejects a semantically inconsistent proposal atomically", () => {
    const handle = createTestRoom();
    const proposalId = stageDecision(handle);
    const room = handle.room();
    const payload = {
      ...room.decisionProposal!.payload,
      supportingRequirementIds: [
        ...room.decisionProposal!.payload.supportingRequirementIds,
        "req_payback",
      ],
    };
    handle.store.setState({
      room: {
        ...room,
        decisionProposal: {
          ...room.decisionProposal!,
          payload,
          inputDigest: inputDigest(payload),
        },
      },
    });
    expectAtomicFailure(handle, proposalId, "INVALID_INPUT");
  });

  it("increments revision once and appends one event on successful rejection", () => {
    const handle = createTestRoom();
    const proposalId = stageDecision(handle);
    const beforeRevision = handle.room().revision;
    const beforeEvents = handle.room().activityLedger.length;

    const result = handle.actions.rejectDecision({
      proposalId,
      reason: "The person rejected the proposal.",
    });

    expect(result.ok).toBe(true);
    expect(handle.room().revision).toBe(beforeRevision + 1);
    expect(handle.room().activityLedger).toHaveLength(beforeEvents + 1);
    expect(handle.room().decisionProposal?.status).toBe("rejected");
  });
});
