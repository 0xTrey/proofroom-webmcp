/**
 * Approval receipts.
 *
 * A receipt records what the person approved, at which revision, and against
 * which staged payload digest. It is a demo-state record, not a legal artifact.
 */
import { inputDigest } from "./hash.ts";
import type { Receipt, RoomState } from "./types.ts";

export type ReceiptKind = Receipt["kind"];

export function buildReceipt(input: {
  kind: ReceiptKind;
  sequence: number;
  proposalId: string | null;
  revision: number;
  inputDigest: string;
  issuedAt: string;
  summary: string;
}): Receipt {
  return {
    id: `rcp_${String(input.sequence).padStart(4, "0")}`,
    kind: input.kind,
    proposalId: input.proposalId,
    revision: input.revision,
    inputDigest: input.inputDigest,
    issuedAt: input.issuedAt,
    summary: input.summary,
  };
}

/**
 * Current rooms persist the exact buyer-context receipt in authoritative state.
 * The ledger reconstruction is limited to schema-version-1 rooms saved by the
 * item 6 implementation before that field existed.
 */
export function buyerContextReceipt(room: RoomState): Receipt | null {
  if (room.approvedBuyerContextReceipt) {
    return room.approvedBuyerContextReceipt;
  }

  if (!room.approvedBuyerContext) {
    return null;
  }

  const approvalEvent = room.activityLedger.findLast(
    (event) =>
      event.action === "approve_buyer_context" &&
      event.affectedIds.some((id) => id.startsWith("pcx_")) &&
      event.affectedIds.some((id) => id.startsWith("rcp_")),
  );

  if (!approvalEvent) {
    return null;
  }

  const proposalId = approvalEvent.affectedIds.find((id) => id.startsWith("pcx_"));
  if (!proposalId) {
    return null;
  }

  return buildReceipt({
    kind: "buyer_context",
    sequence: approvalEvent.sequence,
    proposalId,
    revision: approvalEvent.revisionAfter,
    inputDigest: inputDigest(room.approvedBuyerContext),
    issuedAt: approvalEvent.createdAt,
    summary: `Buyer context approved in the page at revision ${approvalEvent.revisionAfter}.`,
  });
}
