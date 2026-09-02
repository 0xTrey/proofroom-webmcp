import type { RoomState } from "../../src/domain/types.ts";
import type { CaseTerminalSummary } from "./types.ts";

export function summarizeCaseTerminal(room: RoomState): CaseTerminalSummary {
  const eu = room.requirements.find((entry) => entry.id === "req_eu_residency");
  return {
    revision: room.revision,
    ledgerEventCount: room.activityLedger.length,
    requirementStatuses: Object.fromEntries(
      [...room.requirements]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((entry) => [entry.id, entry.status]),
    ),
    buyerContextProposalStatus: room.buyerContextProposal?.status ?? null,
    approvedBuyerContextPresent: room.approvedBuyerContext !== null,
    decisionProposalStatus: room.decisionProposal?.status ?? null,
    approvedDecisionPresent: room.approvedDecision !== null,
    euResidencyStatus: eu?.status ?? null,
  };
}
