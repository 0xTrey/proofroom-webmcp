/**
 * Selectors.
 *
 * Read-only projections. A selector may reshape state; it may never decide a
 * product rule. Anything that decides a rule belongs in the domain.
 *
 * Store level selectors take the whole store value and return a referentially
 * stable slice, because a Zustand subscription must not produce a new object on
 * every read. Derived projections take `RoomState` and are called during render
 * from an already subscribed room.
 */
import { filterLedger, ledgerTotals, type LedgerFilter } from "../domain/actions/ledger.ts";
import { decisionBlockers } from "../domain/invariants.ts";
import {
  requirementSummary,
  requirementTotals,
  roiSummary,
  type RequirementSummary,
} from "../domain/summaries.ts";
import type { ActivityEvent, EvidenceRecord, Requirement, RoomState } from "../domain/types.ts";
import type { RoomStoreValue } from "./createRoomStore.ts";

/* Store level slices ------------------------------------------------------ */

export const selectRoom = (value: RoomStoreValue): RoomState => value.room;
export const selectRevision = (value: RoomStoreValue): number => value.room.revision;
export const selectLastError = (value: RoomStoreValue) => value.lastError;
export const selectStorageStatus = (value: RoomStoreValue) => value.storageStatus;
export const selectRecoveryNotice = (value: RoomStoreValue) => value.room.recoveryNotice;
export const selectApprovedContext = (value: RoomStoreValue) => value.room.approvedBuyerContext;
export const selectContextProposal = (value: RoomStoreValue) => value.room.buyerContextProposal;
export const selectDecisionProposal = (value: RoomStoreValue) => value.room.decisionProposal;
export const selectApprovedDecision = (value: RoomStoreValue) => value.room.approvedDecision;
export const selectRequirements = (value: RoomStoreValue): Requirement[] => value.room.requirements;
export const selectEvidenceCatalog = (value: RoomStoreValue): EvidenceRecord[] =>
  value.room.evidenceCatalog;

/* Derived projections ----------------------------------------------------- */

export function selectRequirementTotals(room: RoomState) {
  return requirementTotals(room.requirements);
}

export function selectBlockingRequirements(room: RoomState): Requirement[] {
  return decisionBlockers(room.requirements);
}

export function selectRequirementSummaries(room: RoomState): RequirementSummary[] {
  const blockingIds = decisionBlockers(room.requirements).map((requirement) => requirement.id);
  return room.requirements.map((requirement) =>
    requirementSummary(requirement, room.evidenceCatalog, blockingIds),
  );
}

export function selectRoiSummary(room: RoomState) {
  return roiSummary(room);
}

export function selectEvidenceById(room: RoomState, evidenceId: string): EvidenceRecord | undefined {
  return room.evidenceCatalog.find((record) => record.id === evidenceId);
}

export function selectAttachedEvidence(room: RoomState, requirementId: string): EvidenceRecord[] {
  const requirement = room.requirements.find((entry) => entry.id === requirementId);
  if (!requirement) {
    return [];
  }
  return requirement.attachedEvidenceIds
    .map((evidenceId) => room.evidenceCatalog.find((record) => record.id === evidenceId))
    .filter((record): record is EvidenceRecord => record !== undefined);
}

export function selectLedger(room: RoomState, filter: LedgerFilter = {}): ActivityEvent[] {
  return filterLedger(room.activityLedger, filter);
}

export function selectLedgerTotals(room: RoomState) {
  return ledgerTotals(room.activityLedger);
}

export function selectUntrustedEvidenceIds(room: RoomState): string[] {
  return room.evidenceCatalog
    .filter((record) => record.untrustedContent)
    .map((record) => record.id);
}
