import { describe, expect, it } from "vitest";
import { MERIDIAN_CONTEXT_DRAFT } from "../../src/fixtures/buyer.ts";
import { CANONICAL_ROI_ASSUMPTIONS } from "../../src/fixtures/demoScenario.ts";
import { PROPOSAL_TTL_MS } from "../../src/domain/invariants.ts";
import type { ProposeDecisionStatusInput } from "../../src/domain/actions/inputs.ts";
import { attachCanonicalEvidence, createTestRoom, FIXED_NOW } from "../support/room.ts";

describe("revision and ledger discipline", () => {
  it("starts at revision zero with the single canonical system event", () => {
    const handle = createTestRoom();
    expect(handle.room().revision).toBe(0);
    expect(handle.room().activityLedger).toHaveLength(1);
  });

  it("increments revision exactly once per successful mutation", () => {
    const handle = createTestRoom();
    const before = handle.room().revision;

    const result = handle.agentActions.attachEvidence({
      requirementId: "req_salesforce",
      evidenceIds: ["ev_002"],
    });

    expect(result.ok).toBe(true);
    expect(handle.room().revision).toBe(before + 1);
    expect(handle.room().activityLedger).toHaveLength(2);
  });

  it("appends one event for a read without changing revision", () => {
    const handle = createTestRoom();
    const before = handle.room().revision;

    const result = handle.agentActions.getRoomState({ detail: "requirements" });

    expect(result.ok).toBe(true);
    expect(handle.room().revision).toBe(before);
    expect(handle.room().activityLedger).toHaveLength(2);
    const event = handle.room().activityLedger.at(-1);
    expect(event?.mutating).toBe(false);
    expect(event?.origin).toBe("webmcp");
    expect(event?.toolName).toBe("get_room_state");
  });

  it("records the origin of a page action separately from an agent action", () => {
    const handle = createTestRoom();
    handle.actions.getRoomState();
    handle.agentActions.getRoomState();

    const origins = handle.room().activityLedger.map((event) => event.origin);
    expect(origins).toEqual(["system", "ui", "webmcp"]);
  });

  it("changes nothing at all when an action fails", () => {
    const handle = createTestRoom();
    const before = structuredClone(handle.room());

    const result = handle.agentActions.attachEvidence({
      requirementId: "req_missing",
      evidenceIds: ["ev_002"],
    });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error.code).toBe("NOT_FOUND");
    expect(handle.room()).toEqual(before);
    expect(handle.store.getState().lastError?.code).toBe("NOT_FOUND");
  });

  it("keeps the ledger free of raw buyer text", () => {
    const handle = createTestRoom();
    handle.agentActions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT);

    const event = handle.room().activityLedger.at(-1);
    expect(event?.inputSummary).not.toContain(MERIDIAN_CONTEXT_DRAFT.companyName);
    expect(event?.inputSummary).toContain("8 fields");
    expect(event?.inputDigest).toMatch(/^[0-9a-f]{16}$/);
  });

  it("marks an untrusted search result on the event", () => {
    const handle = createTestRoom();
    const result = handle.agentActions.searchProductEvidence({ query: "testimonial program review" });

    expect(result.ok).toBe(true);
    expect(handle.room().activityLedger.at(-1)?.untrustedContent).toBe(true);
  });
});

describe("evidence and requirement actions", () => {
  it("rejects evidence that cannot support the requirement and mutates nothing", () => {
    const handle = createTestRoom();
    const before = structuredClone(handle.room());

    const result = handle.agentActions.attachEvidence({
      requirementId: "req_soc2",
      evidenceIds: ["ev_005", "ev_011"],
    });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error.code).toBe("EVIDENCE_INELIGIBLE");
    expect(handle.room()).toEqual(before);
  });

  it("accepts eligible records, reports rejected records, and derives status", () => {
    const handle = createTestRoom();
    const result = handle.agentActions.attachEvidence({
      requirementId: "req_soc2",
      evidenceIds: ["ev_004", "ev_005"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.accepted).toEqual(["ev_004"]);
    expect(result.value.rejected[0]?.evidenceId).toBe("ev_005");
    expect(result.value.requirement.status).toBe("supported");
  });

  it("cannot set requirement status through stage_requirement", () => {
    const handle = createTestRoom();
    const result = handle.agentActions.stageRequirement({
      requirementId: "req_eu_residency",
      nonNegotiable: true,
      buyerNotes: "The risk committee will not accept a US only region.",
    });

    expect(result.ok).toBe(true);
    expect(handle.room().requirements.find((entry) => entry.id === "req_eu_residency")?.status).toBe(
      "unknown",
    );
    expect(
      handle.room().requirements.find((entry) => entry.id === "req_eu_residency")?.nonNegotiable,
    ).toBe(true);
  });

  it("requires at least one field on stage_requirement", () => {
    const handle = createTestRoom();
    const result = handle.agentActions.stageRequirement({ requirementId: "req_sso" });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error.code).toBe("INVALID_INPUT");
    expect(handle.room().revision).toBe(0);
  });

  it("does not mutate on evaluate_requirement", () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);
    const revision = handle.room().revision;

    const result = handle.agentActions.evaluateRequirement({ requirementId: "req_eu_residency" });

    expect(result.ok).toBe(true);
    expect(result.ok && result.value.proposedStatus).toBe("unknown");
    expect(result.ok && result.value.applied).toBe(false);
    expect(handle.room().revision).toBe(revision);
  });
});

describe("human only approvals", () => {
  it("stages context without personalizing authoritative state", () => {
    const handle = createTestRoom();
    const staged = handle.agentActions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT);

    expect(staged.ok).toBe(true);
    expect(handle.room().approvedBuyerContext).toBeNull();
    expect(handle.room().buyerContextProposal?.status).toBe("pending");
    expect(handle.room().buyerContextProposal?.createdBy).toBe("webmcp");
  });

  it("applies approved context and issues a receipt", () => {
    const handle = createTestRoom();
    const staged = handle.agentActions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT);
    expect(staged.ok).toBe(true);
    if (!staged.ok) {
      return;
    }

    const approved = handle.actions.approveBuyerContext({ proposalId: staged.value.proposalId });

    expect(approved.ok).toBe(true);
    expect(handle.room().approvedBuyerContext?.companyName).toBe(MERIDIAN_CONTEXT_DRAFT.companyName);
    expect(approved.ok && approved.value.receipt.kind).toBe("buyer_context");
    expect(handle.room().activityLedger.at(-1)?.origin).toBe("ui");
  });

  it("rejects a stale approval and leaves context unapproved", () => {
    const handle = createTestRoom();
    const staged = handle.agentActions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT);
    expect(staged.ok).toBe(true);
    if (!staged.ok) {
      return;
    }

    handle.agentActions.attachEvidence({
      requirementId: "req_salesforce",
      evidenceIds: ["ev_002"],
    });

    const approved = handle.actions.approveBuyerContext({ proposalId: staged.value.proposalId });

    expect(approved.ok).toBe(false);
    expect(approved.ok === false && approved.error.code).toBe("PROPOSAL_STALE");
    expect(handle.room().approvedBuyerContext).toBeNull();
  });

  it("rejects an expired approval", () => {
    const handle = createTestRoom();
    const staged = handle.agentActions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT);
    expect(staged.ok).toBe(true);
    if (!staged.ok) {
      return;
    }

    handle.clock.advance(PROPOSAL_TTL_MS + 1000);
    const approved = handle.actions.approveBuyerContext({ proposalId: staged.value.proposalId });

    expect(approved.ok === false && approved.error.code).toBe("PROPOSAL_EXPIRED");
    expect(handle.room().approvedBuyerContext).toBeNull();
  });

  it("cannot approve the same proposal twice", () => {
    const handle = createTestRoom();
    const staged = handle.agentActions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT);
    expect(staged.ok).toBe(true);
    if (!staged.ok) {
      return;
    }

    handle.actions.approveBuyerContext({ proposalId: staged.value.proposalId });
    const again = handle.actions.approveBuyerContext({ proposalId: staged.value.proposalId });

    expect(again.ok === false && again.error.code).toBe("PROPOSAL_RESOLVED");
  });

  it("keeps authoritative context unchanged on rejection", () => {
    const handle = createTestRoom();
    const staged = handle.agentActions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT);
    expect(staged.ok).toBe(true);
    if (!staged.ok) {
      return;
    }

    const rejected = handle.actions.rejectBuyerContext({
      proposalId: staged.value.proposalId,
      reason: "Too much detail for a first pass.",
    });

    expect(rejected.ok).toBe(true);
    expect(handle.room().approvedBuyerContext).toBeNull();
    expect(handle.room().buyerContextProposal?.status).toBe("rejected");
  });
});

describe("briefs and decisions", () => {
  it("refuses a brief that overstates an unproven requirement", () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);
    const before = structuredClone(handle.room());

    const result = handle.agentActions.saveStakeholderBrief({
      role: "ciso",
      summary: "EU data residency is confirmed and SOC 2 is current.",
      evidenceIds: ["ev_004"],
      risks: [],
      openQuestions: [],
      nextStep: "Sign the order form.",
    });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error.code).toBe("EVIDENCE_INSUFFICIENT");
    expect(handle.room()).toEqual(before);
  });

  it("saves an honest brief and warns about unlisted risks", () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);

    const result = handle.agentActions.saveStakeholderBrief({
      role: "ciso",
      summary:
        "The SOC 2 Type II summary covers a current observation period. EU data residency is not proven by the catalog and SCIM provisioning is missing.",
      evidenceIds: ["ev_004", "ev_007"],
      risks: ["EU data residency remains unproven."],
      openQuestions: ["Will an EU region be committed in writing?"],
      nextStep: "Ask the vendor for an EU region commitment and an EU subprocessor list.",
    });

    expect(result.ok).toBe(true);
    expect(handle.room().stakeholderBriefs.ciso?.savedBy).toBe("webmcp");
    expect(result.ok && result.value.warnings.length).toBeGreaterThan(0);
  });

  it("refuses a brief that cites an evidence ID outside the catalog", () => {
    const handle = createTestRoom();
    const result = handle.agentActions.saveStakeholderBrief({
      role: "cfo",
      summary: "The commercial case is workable at the current list price.",
      evidenceIds: ["ev_404"],
      risks: [],
      openQuestions: [],
      nextStep: "Model a lower campaign volume.",
    });

    expect(result.ok === false && result.error.code).toBe("NOT_FOUND");
  });

  it("blocks a ready decision while a hard requirement is unknown", () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);

    const result = handle.agentActions.proposeDecisionStatus({
      status: "ready",
      rationale: "Everything the committee asked for is documented.",
      supportingRequirementIds: ["req_salesforce", "req_soc2"],
      blockingRequirementIds: [],
      risks: [],
      nextStep: "Move to contracting.",
    });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error.code).toBe("DECISION_BLOCKED");
    expect(handle.room().decisionProposal).toBeNull();
  });

  it("refuses to cite an unproven requirement as support", () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);

    const result = handle.agentActions.proposeDecisionStatus({
      status: "not_ready",
      rationale: "EU residency is unproven.",
      supportingRequirementIds: ["req_eu_residency"],
      blockingRequirementIds: [],
      risks: [],
      nextStep: "Ask for an EU commitment.",
    });

    expect(result.ok === false && result.error.code).toBe("EVIDENCE_INSUFFICIENT");
  });

  it("rejects inconsistent decision arrays without state or ledger mutation", () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);
    const hardBlockers = ["req_eu_residency", "req_sso"];
    const base = {
      status: "not_ready",
      rationale: "The proposal records current evidence gaps.",
      supportingRequirementIds: [],
      blockingRequirementIds: hardBlockers,
      risks: [],
      nextStep: "Resolve the hard blockers.",
    } satisfies ProposeDecisionStatusInput;
    const cases: Array<{ input: ProposeDecisionStatusInput; code: string }> = [
      {
        input: {
          ...base,
          supportingRequirementIds: ["req_salesforce", "req_salesforce"],
        },
        code: "INVALID_INPUT",
      },
      {
        input: {
          ...base,
          blockingRequirementIds: [...hardBlockers, "req_eu_residency"],
        },
        code: "INVALID_INPUT",
      },
      {
        input: {
          ...base,
          supportingRequirementIds: ["req_sso"],
        },
        code: "INVALID_INPUT",
      },
      {
        input: {
          ...base,
          blockingRequirementIds: [...hardBlockers, "req_salesforce"],
        },
        code: "INVALID_INPUT",
      },
      {
        input: {
          ...base,
          status: "ready_with_conditions",
          blockingRequirementIds: ["req_eu_residency"],
        },
        code: "DECISION_BLOCKED",
      },
      {
        input: {
          ...base,
          status: "ready",
          blockingRequirementIds: ["req_eu_residency"],
        },
        code: "INVALID_INPUT",
      },
    ];

    for (const testCase of cases) {
      const before = structuredClone(handle.room());
      const result = handle.agentActions.proposeDecisionStatus(testCase.input);

      expect(result.ok).toBe(false);
      expect(result.ok === false && result.error.code).toBe(testCase.code);
      expect(handle.room()).toEqual(before);
      expect(handle.room().decisionProposal).toBeNull();
    }
  });

  it("stages a not_ready decision and lets a person approve it", () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);

    const staged = handle.agentActions.proposeDecisionStatus({
      status: "not_ready",
      rationale:
        "Salesforce and SOC 2 are proven. EU data residency cannot be proven by the catalog, so the committee cannot proceed.",
      supportingRequirementIds: ["req_salesforce", "req_soc2"],
      blockingRequirementIds: ["req_eu_residency", "req_sso"],
      risks: ["EU data residency has no documented region commitment."],
      nextStep: "Request an EU region commitment and an EU subprocessor list.",
    });

    expect(staged.ok).toBe(true);
    if (!staged.ok) {
      return;
    }
    expect(staged.value.blockers.map((entry) => entry.requirementId)).toContain("req_eu_residency");
    expect(handle.room().approvedDecision).toBeNull();

    const approved = handle.actions.approveDecision({ proposalId: staged.value.proposalId });
    expect(approved.ok).toBe(true);
    expect(handle.room().approvedDecision?.status).toBe("not_ready");
    expect(handle.room().approvedDecision?.receipt.kind).toBe("decision");
  });
});

describe("commercial model application", () => {
  it("applies assumptions from the page and recalculates deterministically", () => {
    const handle = createTestRoom();
    const result = handle.actions.applyRoiAssumptions({
      ...CANONICAL_ROI_ASSUMPTIONS,
      budgetCeiling: 90000,
    });

    expect(result.ok).toBe(true);
    expect(handle.room().roiResult.withinBudget).toBe(false);
    expect(handle.room().roiAssumptions.budgetCeiling).toBe(90000);
    expect(handle.room().activityLedger.at(-1)?.action).toBe("apply_roi_assumptions");
  });

  it("does not apply assumptions from calculate_roi", () => {
    const handle = createTestRoom();
    const result = handle.agentActions.calculateRoi({
      ...CANONICAL_ROI_ASSUMPTIONS,
      annualSubscriptionCost: 42000,
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.value.applied).toBe(false);
    expect(handle.room().roiAssumptions.annualSubscriptionCost).toBe(
      CANONICAL_ROI_ASSUMPTIONS.annualSubscriptionCost,
    );
  });
});

describe("reset", () => {
  it("reproduces the canonical room except for the reset event timestamp", () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);
    handle.agentActions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT);
    handle.clock.advance(5000);

    const result = handle.actions.resetRoom();
    expect(result.ok).toBe(true);

    const room = handle.room();
    const canonical = createTestRoom().room();

    expect(room.revision).toBe(0);
    expect(room.requirements).toEqual(canonical.requirements);
    expect(room.evidenceCatalog).toEqual(canonical.evidenceCatalog);
    expect(room.buyerContextProposal).toBeNull();
    expect(room.approvedBuyerContext).toBeNull();
    expect(room.activityLedger).toHaveLength(1);
    expect(room.activityLedger[0]?.createdAt).not.toBe(FIXED_NOW);
    expect({ ...room.activityLedger[0], createdAt: FIXED_NOW }).toEqual(canonical.activityLedger[0]);
  });
});
