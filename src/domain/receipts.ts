/**
 * Approval receipts.
 *
 * A receipt records what the person approved, at which revision, and against
 * which staged payload digest. It is a demo-state record, not a legal artifact.
 */
import type { Receipt } from "./types.ts";

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
