/**
 * Safe summaries.
 *
 * Tool responses and ledger entries use these shapes so no code path returns
 * the whole room, the raw activity ledger, or unredacted buyer text by accident.
 */
import { conditionLabel } from "./conditions.ts";
import { decisionBlockers } from "./invariants.ts";
import type {
  EvidenceRecord,
  Requirement,
  RequirementStatus,
  RoiResult,
  RoomState,
} from "./types.ts";

export type RequirementSummary = {
  id: string;
  label: string;
  priority: Requirement["priority"];
  nonNegotiable: boolean;
  status: RequirementStatus;
  attachedEvidenceCount: number;
  coveredConditions: string[];
  gaps: string[];
  gapLabels: string[];
  limitationCount: number;
  openQuestionCount: number;
  blocksReadyDecision: boolean;
};

export type RoiSummary = {
  currency: RoiResult["currency"];
  annualHoursSaved: number;
  annualLaborValue: number;
  firstYearCost: number;
  firstYearNetValue: number;
  paybackMonths: number | null;
  withinBudget: boolean;
  budgetCeiling: number;
};

export type RoomSummary = {
  roomId: string;
  schemaVersion: number;
  revision: number;
  vendor: { id: string; name: string; category: string };
  demoNotice: string;
  approvedBuyerContext:
    | null
    | {
        companyName: string;
        industry: string;
        employeeBand: string;
        personaCount: number;
        priorityCount: number;
        hardRequirementCount: number;
        budgetCeiling: number;
        paybackTargetMonths: number;
      };
  requirementTotals: {
    total: number;
    supported: number;
    partially_supported: number;
    unsupported: number;
    unknown: number;
  };
  blockingRequirementIds: string[];
  requirements?: RequirementSummary[];
  roi: RoiSummary;
  briefs: { cfo: boolean; ciso: boolean };
  proposals: {
    buyerContext: null | {
      id: string;
      status: string;
      baseRevision: number;
      expiresAt: string;
      inputDigest: string;
    };
    decision: null | {
      id: string;
      status: string;
      proposedStatus: string;
      baseRevision: number;
      expiresAt: string;
      inputDigest: string;
    };
  };
  decision: null | {
    status: string;
    approvedAt: string;
    approvedAtRevision: number;
    receiptId: string;
    rationale?: string;
    blockingRequirementIds?: string[];
  };
  activityEventCount: number;
  recoveryNotice: RoomState["recoveryNotice"];
  recommendedNextActions: string[];
};

export function countLimitations(
  requirement: Requirement,
  catalog: readonly EvidenceRecord[],
): number {
  return requirement.attachedEvidenceIds.reduce((total, evidenceId) => {
    const record = catalog.find((entry) => entry.id === evidenceId);
    return total + (record?.limitations.length ?? 0);
  }, 0);
}

export function requirementSummary(
  requirement: Requirement,
  catalog: readonly EvidenceRecord[],
  blockingIds: readonly string[],
): RequirementSummary {
  return {
    id: requirement.id,
    label: requirement.label,
    priority: requirement.priority,
    nonNegotiable: requirement.nonNegotiable,
    status: requirement.status,
    attachedEvidenceCount: requirement.attachedEvidenceIds.length,
    coveredConditions: [...requirement.coveredConditions],
    gaps: [...requirement.gaps],
    gapLabels: requirement.gaps.map((conditionId) => conditionLabel(conditionId)),
    limitationCount: countLimitations(requirement, catalog),
    openQuestionCount: requirement.openQuestions.length,
    blocksReadyDecision: blockingIds.includes(requirement.id),
  };
}

export function requirementTotals(requirements: readonly Requirement[]): RoomSummary["requirementTotals"] {
  const totals = {
    total: requirements.length,
    supported: 0,
    partially_supported: 0,
    unsupported: 0,
    unknown: 0,
  };

  for (const requirement of requirements) {
    totals[requirement.status] += 1;
  }

  return totals;
}

export function roiSummary(state: RoomState): RoiSummary {
  return {
    currency: state.roiResult.currency,
    annualHoursSaved: state.roiResult.annualHoursSaved,
    annualLaborValue: state.roiResult.annualLaborValue,
    firstYearCost: state.roiResult.firstYearCost,
    firstYearNetValue: state.roiResult.firstYearNetValue,
    paybackMonths: state.roiResult.paybackMonths,
    withinBudget: state.roiResult.withinBudget,
    budgetCeiling: state.roiAssumptions.budgetCeiling,
  };
}

/**
 * Deterministic next-step guidance. Ordered by what the room is missing, and
 * always explicit that approvals are not agent work.
 */
export function recommendedNextActions(state: RoomState, nowIso: string): string[] {
  const actions: string[] = [];
  const pendingContext =
    state.buyerContextProposal?.status === "pending" &&
    Date.parse(state.buyerContextProposal.expiresAt) > Date.parse(nowIso);

  if (pendingContext) {
    actions.push(
      "A buyer context proposal is waiting in the context panel. Only the person can approve it.",
    );
  } else if (!state.approvedBuyerContext) {
    actions.push("Call propose_buyer_context with the company details from the prompt.");
  }

  const withoutEvidence = state.requirements.filter(
    (requirement) => requirement.attachedEvidenceIds.length === 0,
  );

  if (withoutEvidence.length > 0) {
    actions.push(
      `Call search_product_evidence then attach_evidence for ${withoutEvidence
        .slice(0, 3)
        .map((requirement) => requirement.id)
        .join(", ")}.`,
    );
  }

  const missingBriefs = (["cfo", "ciso"] as const).filter((role) => !state.stakeholderBriefs[role]);
  if (withoutEvidence.length === 0 && missingBriefs.length > 0) {
    actions.push(`Call save_stakeholder_brief for ${missingBriefs.join(" and ")}.`);
  }

  const pendingDecision =
    state.decisionProposal?.status === "pending" &&
    Date.parse(state.decisionProposal.expiresAt) > Date.parse(nowIso);

  if (pendingDecision) {
    actions.push(
      "A decision proposal is waiting in the decision panel. Only the person can approve or reject it.",
    );
  } else if (withoutEvidence.length === 0 && missingBriefs.length === 0) {
    actions.push("Call propose_decision_status with the evidence backed synthesis.");
  }

  return actions.slice(0, 3);
}

export function roomSummary(
  state: RoomState,
  detail: "summary" | "requirements" | "decision",
  nowIso: string,
): RoomSummary {
  const blockingIds = decisionBlockers(state.requirements).map((requirement) => requirement.id);

  const summary: RoomSummary = {
    roomId: state.roomId,
    schemaVersion: state.schemaVersion,
    revision: state.revision,
    vendor: { id: state.vendor.id, name: state.vendor.name, category: state.vendor.category },
    demoNotice: state.vendor.fictionalDisclosure,
    approvedBuyerContext: state.approvedBuyerContext
      ? {
          companyName: state.approvedBuyerContext.companyName,
          industry: state.approvedBuyerContext.industry,
          employeeBand: state.approvedBuyerContext.employeeBand,
          personaCount: state.approvedBuyerContext.personas.length,
          priorityCount: state.approvedBuyerContext.priorities.length,
          hardRequirementCount: state.approvedBuyerContext.hardRequirements.length,
          budgetCeiling: state.approvedBuyerContext.budgetCeiling,
          paybackTargetMonths: state.approvedBuyerContext.paybackTargetMonths,
        }
      : null,
    requirementTotals: requirementTotals(state.requirements),
    blockingRequirementIds: blockingIds,
    roi: roiSummary(state),
    briefs: {
      cfo: Boolean(state.stakeholderBriefs.cfo),
      ciso: Boolean(state.stakeholderBriefs.ciso),
    },
    proposals: {
      buyerContext: state.buyerContextProposal
        ? {
            id: state.buyerContextProposal.id,
            status: state.buyerContextProposal.status,
            baseRevision: state.buyerContextProposal.baseRevision,
            expiresAt: state.buyerContextProposal.expiresAt,
            inputDigest: state.buyerContextProposal.inputDigest,
          }
        : null,
      decision: state.decisionProposal
        ? {
            id: state.decisionProposal.id,
            status: state.decisionProposal.status,
            proposedStatus: state.decisionProposal.payload.status,
            baseRevision: state.decisionProposal.baseRevision,
            expiresAt: state.decisionProposal.expiresAt,
            inputDigest: state.decisionProposal.inputDigest,
          }
        : null,
    },
    decision: state.approvedDecision
      ? {
          status: state.approvedDecision.status,
          approvedAt: state.approvedDecision.approvedAt,
          approvedAtRevision: state.approvedDecision.approvedAtRevision,
          receiptId: state.approvedDecision.receipt.id,
        }
      : null,
    // The full ledger is never part of a tool response. Only the count is.
    activityEventCount: state.activityLedger.length,
    recoveryNotice: state.recoveryNotice,
    recommendedNextActions: recommendedNextActions(state, nowIso),
  };

  if (detail === "requirements") {
    summary.requirements = state.requirements.map((requirement) =>
      requirementSummary(requirement, state.evidenceCatalog, blockingIds),
    );
  }

  if (detail === "decision" && state.approvedDecision && summary.decision) {
    summary.decision.rationale = state.approvedDecision.rationale;
    summary.decision.blockingRequirementIds = [...state.approvedDecision.blockingRequirementIds];
  }

  return summary;
}
