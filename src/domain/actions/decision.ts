/**
 * Decision actions.
 *
 * A browser agent may propose a decision. Only the person approves or rejects
 * one, in the page. Every hard requirement must be fully supported for a ready
 * decision, at proposal time and again at approval time.
 */
import { failure } from "../errors.ts";
import { inputDigest } from "../hash.ts";
import {
  assertDecisionProposalConsistent,
  assertProposalApprovable,
  decisionBlockers,
  proposalExpiry,
} from "../invariants.ts";
import { buildReceipt } from "../receipts.ts";
import type { ApprovedDecision, DecisionProposal, Receipt, RoomState } from "../types.ts";
import { APPROVAL_INSTRUCTION, type ApprovalApplied, type ProposalRejected } from "./context.ts";
import {
  approvalInputSchema,
  proposeDecisionStatusInputSchema,
  rejectionInputSchema,
} from "./inputs.ts";
import { defineAction, outcome } from "./runtime.ts";

export type DecisionBlockerSummary = {
  requirementId: string;
  label: string;
  status: string;
  priority: string;
  nonNegotiable: boolean;
};

export type DecisionStaged = {
  proposalId: string;
  proposalType: "decision";
  proposedStatus: string;
  baseRevision: number;
  inputDigest: string;
  expiresAt: string;
  revision: number;
  blockers: DecisionBlockerSummary[];
  approvalInstruction: string;
};

export type DecisionApproved = ApprovalApplied & {
  status: string;
  blockingRequirementIds: string[];
};

function blockerSummaries(state: RoomState): DecisionBlockerSummary[] {
  return decisionBlockers(state.requirements).map((requirement) => ({
    requirementId: requirement.id,
    label: requirement.label,
    status: requirement.status,
    priority: requirement.priority,
    nonNegotiable: requirement.nonNegotiable,
  }));
}

export const proposeDecisionStatusAction = defineAction({
  action: "propose_decision_status",
  toolName: "propose_decision_status",
  panel: "decision",
  mutating: true,
  schema: proposeDecisionStatusInputSchema,
  run: (state, input, context) => {
    const overstated = input.supportingRequirementIds.filter((requirementId) => {
      const requirement = state.requirements.find((entry) => entry.id === requirementId);
      return requirement?.status === "unknown" || requirement?.status === "unsupported";
    });

    if (overstated.length > 0) {
      return failure(
        "EVIDENCE_INSUFFICIENT",
        "A requirement cannot support the decision while its own status is unknown or unsupported.",
        {
          issues: overstated.map((requirementId) => ({
            path: "supportingRequirementIds",
            message: `${requirementId} is not proven by evidence.`,
          })),
          relatedIds: overstated,
        },
      );
    }

    const consistent = assertDecisionProposalConsistent(input, state.requirements);
    if (!consistent.ok) {
      return consistent;
    }

    const proposal: DecisionProposal = {
      id: `pdc_${String(context.nextRevision).padStart(4, "0")}`,
      type: "decision",
      baseRevision: context.nextRevision,
      inputDigest: inputDigest(input),
      createdBy: context.origin === "webmcp" ? "webmcp" : "ui",
      createdAt: context.nowIso,
      expiresAt: proposalExpiry(context.nowIso),
      status: "pending",
      payload: input,
    };

    const value: DecisionStaged = {
      proposalId: proposal.id,
      proposalType: "decision",
      proposedStatus: input.status,
      baseRevision: proposal.baseRevision,
      inputDigest: proposal.inputDigest,
      expiresAt: proposal.expiresAt,
      revision: context.nextRevision,
      blockers: blockerSummaries(state),
      approvalInstruction: APPROVAL_INSTRUCTION,
    };

    return outcome({
      value,
      patch: (current: RoomState) => ({ ...current, decisionProposal: proposal }),
      affectedIds: [proposal.id],
      inputSummary: `Staged a ${input.status} decision proposal with ${input.supportingRequirementIds.length} supporting and ${input.blockingRequirementIds.length} blocking requirements.`,
    });
  },
});

export const approveDecisionAction = defineAction({
  action: "approve_decision",
  toolName: null,
  panel: "decision",
  mutating: true,
  schema: approvalInputSchema,
  run: (state, input, context) => {
    const guard = assertProposalApprovable(
      state.decisionProposal,
      state.revision,
      context.nowIso,
      input.proposalId,
    );

    if (!guard.ok) {
      return guard;
    }

    const proposal = guard.value;

    // The full proposal claim is re-checked at approval time so semantically
    // inconsistent persisted or tampered payloads cannot become authoritative.
    const consistent = assertDecisionProposalConsistent(proposal.payload, state.requirements);
    if (!consistent.ok) {
      return consistent;
    }

    const receipt: Receipt = buildReceipt({
      kind: "decision",
      sequence: context.nextSequence,
      proposalId: proposal.id,
      revision: context.nextRevision,
      inputDigest: proposal.inputDigest,
      issuedAt: context.nowIso,
      summary: `Decision ${proposal.payload.status} approved in the page at revision ${context.nextRevision}.`,
    });

    const approved: ApprovedDecision = {
      ...proposal.payload,
      proposalId: proposal.id,
      approvedAt: context.nowIso,
      approvedAtRevision: context.nextRevision,
      receipt,
    };

    const value: DecisionApproved = {
      revision: context.nextRevision,
      receipt,
      panel: "decision",
      status: approved.status,
      blockingRequirementIds: [...approved.blockingRequirementIds],
    };

    return outcome({
      value,
      patch: (current: RoomState) => ({
        ...current,
        approvedDecision: approved,
        decisionProposal: { ...proposal, status: "approved" },
      }),
      affectedIds: [proposal.id, receipt.id],
      inputSummary: `Approved decision proposal ${proposal.id} with status ${approved.status}.`,
    });
  },
});

export const rejectDecisionAction = defineAction({
  action: "reject_decision",
  toolName: null,
  panel: "decision",
  mutating: true,
  schema: rejectionInputSchema,
  run: (state, input, context) => {
    const guard = assertProposalApprovable(
      state.decisionProposal,
      state.revision,
      context.nowIso,
      input.proposalId,
    );
    if (!guard.ok) {
      return guard;
    }

    const proposal = guard.value;
    const consistent = assertDecisionProposalConsistent(proposal.payload, state.requirements);
    if (!consistent.ok) {
      return consistent;
    }

    const value: ProposalRejected = {
      proposalId: proposal.id,
      revision: context.nextRevision,
      status: "rejected",
    };

    return outcome({
      value,
      patch: (current: RoomState) => ({
        ...current,
        decisionProposal: { ...proposal, status: "rejected" },
      }),
      affectedIds: [proposal.id],
      inputSummary: `Rejected decision proposal ${proposal.id}.`,
    });
  },
});
