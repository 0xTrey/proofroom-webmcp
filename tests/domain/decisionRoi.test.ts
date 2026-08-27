import { describe, expect, it } from "vitest";
import { calculateRoi, paybackMeetsTarget } from "../../src/domain/roi.ts";
import { roiAssumptionsSchema } from "../../src/domain/schemas.ts";
import { CANONICAL_ROI_ASSUMPTIONS } from "../../src/fixtures/demoScenario.ts";
import {
  attachCanonicalEvidence,
  createTestRoom,
} from "../support/room.ts";
import { MERIDIAN_CONTEXT_DRAFT } from "../../src/fixtures/buyer.ts";

describe("ROI canonical math and bounds", () => {
  it("calculates the canonical assumption set exactly", () => {
    const result = calculateRoi(CANONICAL_ROI_ASSUMPTIONS);
    expect(result.annualHoursSaved).toBe(1440);
    expect(result.annualLaborValue).toBe(122400);
    expect(result.monthlyLaborValue).toBe(10200);
    expect(result.firstYearCost).toBe(114000);
    expect(result.firstYearNetValue).toBe(8400);
    expect(result.paybackMonths).toBe(11.2);
    expect(result.withinBudget).toBe(true);
  });

  it("returns null payback when monthly labor value is zero", () => {
    const result = calculateRoi({
      ...CANONICAL_ROI_ASSUMPTIONS,
      campaignsPerMonth: 0,
      hoursSavedPerCampaign: 0,
    });
    expect(result.paybackMonths).toBeNull();
    expect(result.monthlyLaborValue).toBe(0);
    expect(result.firstYearNetValue).toBe(-114000);
  });

  it("rejects assumptions outside the bounded ranges", () => {
    expect(
      roiAssumptionsSchema.safeParse({ ...CANONICAL_ROI_ASSUMPTIONS, campaignsPerMonth: 501 })
        .success,
    ).toBe(false);
    expect(
      roiAssumptionsSchema.safeParse({ ...CANONICAL_ROI_ASSUMPTIONS, loadedHourlyCost: -1 })
        .success,
    ).toBe(false);
  });

  it("compares payback against a target", () => {
    const result = calculateRoi(CANONICAL_ROI_ASSUMPTIONS);
    expect(paybackMeetsTarget(result, 12)).toBe(true);
    expect(paybackMeetsTarget(result, 6)).toBe(false);
  });
});

describe("ROI preview and apply behavior", () => {
  it("calculateRoi is read-only and does not change room revision", () => {
    const handle = createTestRoom();
    const revisionBefore = handle.room().revision;
    const result = handle.agentActions.calculateRoi(CANONICAL_ROI_ASSUMPTIONS);
    expect(result.ok).toBe(true);
    expect(handle.room().revision).toBe(revisionBefore);
    expect(handle.room().roiAssumptions).toEqual(CANONICAL_ROI_ASSUMPTIONS);
  });

  it("calculateRoi returns full explanation and budget comparison", () => {
    const handle = createTestRoom();
    const result = handle.actions.calculateRoi(CANONICAL_ROI_ASSUMPTIONS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.explanation.length).toBeGreaterThan(4);
    expect(result.value.budgetComparison.withinBudget).toBe(true);
    expect(result.value.budgetComparison.headroom).toBe(24000);
    expect(result.value.applied).toBe(false);
  });

  it("calculateRoi reports the payback target when buyer context is approved", () => {
    const handle = createTestRoom();
    const staged = handle.agentActions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT);
    expect(staged.ok).toBe(true);
    if (!staged.ok) return;
    const approved = handle.actions.approveBuyerContext({ proposalId: staged.value.proposalId });
    expect(approved.ok).toBe(true);

    const result = handle.actions.calculateRoi(CANONICAL_ROI_ASSUMPTIONS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.paybackTargetMonths).toBe(12);
    expect(result.value.meetsPaybackTarget).toBe(true);
  });

  it("calculateRoi reports null target when no buyer context is approved", () => {
    const handle = createTestRoom();
    const result = handle.actions.calculateRoi(CANONICAL_ROI_ASSUMPTIONS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.paybackTargetMonths).toBeNull();
    expect(result.value.meetsPaybackTarget).toBeNull();
  });

  it("applyRoiAssumptions increments revision once and stores exact assumptions", () => {
    const handle = createTestRoom();
    const revisionBefore = handle.room().revision;
    const changed = { ...CANONICAL_ROI_ASSUMPTIONS, budgetCeiling: 100000 };
    const result = handle.actions.applyRoiAssumptions(changed);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.revision).toBe(revisionBefore + 1);
    expect(result.value.assumptions).toEqual(changed);
    expect(result.value.changedFields).toEqual(["budgetCeiling"]);
    expect(handle.room().roiAssumptions).toEqual(changed);
    expect(handle.room().revision).toBe(revisionBefore + 1);
  });

  it("rejects an unchanged apply atomically without touching persisted state", () => {
    const handle = createTestRoom();
    const roomBefore = structuredClone(handle.room());
    const persistedBefore = structuredClone(handle.storage.load());
    const result = handle.actions.applyRoiAssumptions(CANONICAL_ROI_ASSUMPTIONS);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_INPUT");
    expect(result.error.message).toBe("No ROI assumptions changed.");
    expect(handle.room()).toEqual(roomBefore);
    expect(handle.storage.load()).toEqual(persistedBefore);
  });

  it("applied assumptions persist after reload", () => {
    const storage = createTestRoom().storage;
    const first = createTestRoom({ storage });
    const changed = { ...CANONICAL_ROI_ASSUMPTIONS, budgetCeiling: 90000 };
    first.actions.applyRoiAssumptions(changed);

    const second = createTestRoom({ storage });
    expect(second.room().roiAssumptions).toEqual(changed);
    expect(second.room().roiResult.withinBudget).toBe(false);
  });
});

describe("budget revision makes a pending decision proposal stale", () => {
  it("an unchanged apply cannot stale a pending proposal", () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);

    const staged = handle.agentActions.proposeDecisionStatus({
      status: "not_ready",
      rationale: "EU data residency cannot be proven.",
      supportingRequirementIds: ["req_salesforce", "req_soc2", "req_campaign_volume"],
      blockingRequirementIds: ["req_eu_residency", "req_sso"],
      risks: ["No EU region commitment."],
      nextStep: "Request an EU region commitment.",
    });
    expect(staged.ok).toBe(true);
    if (!staged.ok) return;

    const before = structuredClone(handle.room());
    const result = handle.actions.applyRoiAssumptions({ ...handle.room().roiAssumptions });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_INPUT");
      expect(result.error.message).toBe("No ROI assumptions changed.");
    }
    expect(handle.room()).toEqual(before);
    expect(handle.room().decisionProposal?.baseRevision).toBe(handle.room().revision);
  });

  it("a budget change after staging makes the proposal stale", () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);

    const staged = handle.agentActions.proposeDecisionStatus({
      status: "not_ready",
      rationale: "EU data residency cannot be proven.",
      supportingRequirementIds: ["req_salesforce", "req_soc2", "req_campaign_volume"],
      blockingRequirementIds: ["req_eu_residency", "req_sso"],
      risks: ["No EU region commitment."],
      nextStep: "Request an EU region commitment.",
    });
    expect(staged.ok).toBe(true);
    if (!staged.ok) return;
    const proposalId = staged.value.proposalId;
    const baseRevision = handle.room().revision;

    handle.actions.applyRoiAssumptions({
      ...CANONICAL_ROI_ASSUMPTIONS,
      budgetCeiling: 90000,
    });

    expect(handle.room().revision).toBe(baseRevision + 1);
    expect(handle.room().decisionProposal?.baseRevision).toBe(baseRevision);

    const approval = handle.actions.approveDecision({ proposalId });
    expect(approval.ok).toBe(false);
    if (!approval.ok) {
      expect(approval.error.code).toBe("PROPOSAL_STALE");
    }
    expect(handle.room().approvedDecision).toBeNull();
  });
});
