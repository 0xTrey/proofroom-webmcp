/**
 * Room reading and buyer context actions.
 *
 * A browser agent may stage buyer context. It may never approve it. The approval
 * actions in this file exist for the visible UI control and are deliberately
 * absent from the WebMCP registry.
 */
import { failure } from "../errors.ts";
import { inputDigest } from "../hash.ts";
import { assertProposalApprovable, proposalExpiry } from "../invariants.ts";
import { buildReceipt } from "../receipts.ts";
import { roomSummary } from "../summaries.ts";
import type { BuyerContextProposal, Receipt, RoomState } from "../types.ts";
import {
  approvalInputSchema,
  getRoomStateInputSchema,
  proposeBuyerContextInputSchema,
  rejectionInputSchema,
} from "./inputs.ts";
import { defineAction, outcome } from "./runtime.ts";

export const APPROVAL_INSTRUCTION =
  "Only the person can approve this. Open the context panel in the page and choose approve or reject.";

export type ProposalStaged = {
  proposalId: string;
  proposalType: "buyer_context" | "decision";
  baseRevision: number;
  inputDigest: string;
  expiresAt: string;
  revision: number;
  panel: string;
  stagedFields: string[];
  approvalInstruction: string;
};

export type ApprovalApplied = {
  revision: number;
  receipt: Receipt;
  panel: string;
};

export type ProposalRejected = {
  proposalId: string;
  revision: number;
  status: "rejected";
};

export const getRoomStateAction = defineAction({
  action: "get_room_state",
  toolName: "get_room_state",
  panel: "product",
  mutating: false,
  schema: getRoomStateInputSchema,
  run: (state, input, context) => {
    const detail = input.detail ?? "summary";
    return outcome({
      value: roomSummary(state, detail, context.nowIso),
      inputSummary: `Read room state with detail ${detail}.`,
      affectedIds: [state.roomId],
    });
  },
});

export const proposeBuyerContextAction = defineAction({
  action: "propose_buyer_context",
  toolName: "propose_buyer_context",
  panel: "context",
  mutating: true,
  schema: proposeBuyerContextInputSchema,
  run: (_state, input, context) => {
    const proposal: BuyerContextProposal = {
      id: `pcx_${String(context.nextRevision).padStart(4, "0")}`,
      type: "buyer_context",
      baseRevision: context.nextRevision,
      inputDigest: inputDigest(input),
      createdBy: context.origin === "webmcp" ? "webmcp" : "ui",
      createdAt: context.nowIso,
      expiresAt: proposalExpiry(context.nowIso),
      status: "pending",
      payload: input,
    };

    const value: ProposalStaged = {
      proposalId: proposal.id,
      proposalType: "buyer_context",
      baseRevision: proposal.baseRevision,
      inputDigest: proposal.inputDigest,
      expiresAt: proposal.expiresAt,
      revision: context.nextRevision,
      panel: "context",
      stagedFields: Object.keys(input).sort(),
      approvalInstruction: APPROVAL_INSTRUCTION,
    };

    return outcome({
      value,
      // A newer proposal replaces an unresolved older one. The ledger keeps both.
      patch: (current: RoomState) => ({ ...current, buyerContextProposal: proposal }),
      affectedIds: [proposal.id],
      inputSummary: `Staged buyer context with ${Object.keys(input).length} fields. Values are not stored in the ledger.`,
    });
  },
});

export const approveBuyerContextAction = defineAction({
  action: "approve_buyer_context",
  toolName: null,
  panel: "context",
  mutating: true,
  schema: approvalInputSchema,
  run: (state, input, context) => {
    const guard = assertProposalApprovable(
      state.buyerContextProposal,
      state.revision,
      context.nowIso,
      input.proposalId,
    );

    if (!guard.ok) {
      return guard;
    }

    const proposal = guard.value;
    const receipt = buildReceipt({
      kind: "buyer_context",
      sequence: context.nextSequence,
      proposalId: proposal.id,
      revision: context.nextRevision,
      inputDigest: proposal.inputDigest,
      issuedAt: context.nowIso,
      summary: `Buyer context approved in the page at revision ${context.nextRevision}.`,
    });

    const value: ApprovalApplied = {
      revision: context.nextRevision,
      receipt,
      panel: "context",
    };

    return outcome({
      value,
      patch: (current: RoomState) => ({
        ...current,
        approvedBuyerContext: proposal.payload,
        approvedBuyerContextReceipt: receipt,
        buyerContextProposal: { ...proposal, status: "approved" },
      }),
      affectedIds: [proposal.id, receipt.id],
      inputSummary: `Approved buyer context proposal ${proposal.id}.`,
    });
  },
});

export const rejectBuyerContextAction = defineAction({
  action: "reject_buyer_context",
  toolName: null,
  panel: "context",
  mutating: true,
  schema: rejectionInputSchema,
  run: (state, input, context) => {
    const proposal = state.buyerContextProposal;

    if (!proposal || proposal.id !== input.proposalId) {
      return failure("NOT_FOUND", "There is no staged buyer context with that ID.", {
        relatedIds: [input.proposalId],
      });
    }

    if (proposal.status !== "pending") {
      return failure("PROPOSAL_RESOLVED", `This proposal is already ${proposal.status}.`, {
        relatedIds: [proposal.id],
      });
    }

    const value: ProposalRejected = {
      proposalId: proposal.id,
      revision: context.nextRevision,
      status: "rejected",
    };

    return outcome({
      value,
      // Rejection never touches approved context. Nothing becomes authoritative.
      patch: (current: RoomState) => ({
        ...current,
        buyerContextProposal: { ...proposal, status: "rejected" },
      }),
      affectedIds: [proposal.id],
      inputSummary: `Rejected buyer context proposal ${proposal.id}.`,
    });
  },
});
