/**
 * Reset and recovery actions.
 *
 * Reset replaces the room with the canonical fixture. It is a state replacement
 * rather than an incremental mutation, so it bypasses the revision counter and
 * rebuilds the ledger with the single canonical system event. That is what makes
 * a judge able to reproduce the demo exactly.
 */
import { createCanonicalRoom } from "../../fixtures/demoScenario.ts";
import { failure } from "../errors.ts";
import { inputDigest } from "../hash.ts";
import { buildReceipt } from "../receipts.ts";
import type { Receipt, RoomState } from "../types.ts";
import { emptyInputSchema } from "./inputs.ts";
import { defineAction, outcome } from "./runtime.ts";

export type RoomReset = {
  roomId: string;
  revision: number;
  requirementCount: number;
  evidenceCount: number;
  resetAt: string;
  receipt: Receipt;
};

export function canonicalResetState(nowIso: string, roomId?: string): RoomState {
  const canonical = createCanonicalRoom(nowIso);
  if (!roomId || roomId === canonical.roomId) {
    return canonical;
  }

  return {
    ...canonical,
    roomId,
    activityLedger: canonical.activityLedger.map((event) => ({
      ...event,
      affectedIds: event.affectedIds.map((id) => (id === canonical.roomId ? roomId : id)),
      inputDigest: inputDigest({ roomId, schemaVersion: canonical.schemaVersion }),
    })),
  };
}

export function buildResetResult(room: RoomState, nowIso: string): RoomReset {
  return {
    roomId: room.roomId,
    revision: room.revision,
    requirementCount: room.requirements.length,
    evidenceCount: room.evidenceCatalog.length,
    resetAt: nowIso,
    receipt: buildReceipt({
      kind: "reset",
      sequence: 1,
      proposalId: null,
      revision: room.revision,
      inputDigest: inputDigest({ roomId: room.roomId, action: "reset_room" }),
      issuedAt: nowIso,
      summary: "Room reset to the canonical fixture from a visible confirmation.",
    }),
  };
}

export const dismissRecoveryNoticeAction = defineAction({
  action: "dismiss_recovery_notice",
  toolName: null,
  panel: "system",
  mutating: true,
  schema: emptyInputSchema,
  run: (state, _input, context) => {
    if (!state.recoveryNotice) {
      return failure("NOT_FOUND", "There is no recovery notice to dismiss.", {
        relatedIds: [state.roomId],
      });
    }

    return outcome({
      value: { revision: context.nextRevision },
      patch: (current: RoomState) => ({ ...current, recoveryNotice: null }),
      affectedIds: [state.roomId],
      inputSummary: `Dismissed the ${state.recoveryNotice.code} recovery notice.`,
    });
  },
});
