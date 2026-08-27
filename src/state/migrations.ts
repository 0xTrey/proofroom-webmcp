/**
 * Hydration, migration, and recovery.
 *
 * Persisted data is untrusted input. It is parsed by the strict room schema
 * before it is allowed near the store. Anything unexpected falls back to the
 * canonical fixture and records a visible recovery notice.
 */
import { deriveRequirement } from "../domain/evidence.ts";
import { buyerContextReceipt } from "../domain/receipts.ts";
import { persistedRoomSchema } from "../domain/schemas.ts";
import type { RecoveryNotice, RoomState } from "../domain/types.ts";
import { createCanonicalRoom } from "../fixtures/demoScenario.ts";
import type { StorageReadResult } from "./persistence.ts";

export const CURRENT_SCHEMA_VERSION = 1;

/** Versions this build can read. Older versions get a migration step here. */
export const SUPPORTED_SCHEMA_VERSIONS: readonly number[] = [1];

export type HydrationResult = {
  room: RoomState;
  source: "persisted" | "fixture";
  notice: RecoveryNotice | null;
};

function notice(
  code: RecoveryNotice["code"],
  message: string,
  detail: string | null,
  nowIso: string,
): RecoveryNotice {
  return { code, message, detail: detail === null ? null : detail.slice(0, 240), detectedAt: nowIso };
}

function readVersion(raw: unknown): number | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const version = (raw as { schemaVersion?: unknown }).schemaVersion;
  return typeof version === "number" ? version : null;
}

/**
 * Recomputes evidence derived requirement state at load time. Evidence can
 * expire between sessions, and a stored `supported` status must not outlive the
 * record that proved it. This is not an action, so it does not touch revision.
 */
function refreshDerivedState(room: RoomState, nowIso: string): RoomState {
  return {
    ...room,
    approvedBuyerContextReceipt: buyerContextReceipt(room),
    requirements: room.requirements.map((requirement) =>
      deriveRequirement(requirement, room.evidenceCatalog, nowIso),
    ),
  };
}

export function hydrateRoom(read: StorageReadResult, nowIso: string): HydrationResult {
  if (read.status === "empty") {
    return { room: createCanonicalRoom(nowIso), source: "fixture", notice: null };
  }

  if (read.status === "unavailable") {
    return {
      room: createCanonicalRoom(nowIso),
      source: "fixture",
      notice: notice(
        "storage_unavailable",
        "This browser will not store the room, so the demo runs in memory for this session.",
        read.detail,
        nowIso,
      ),
    };
  }

  if (read.status === "unreadable") {
    return {
      room: createCanonicalRoom(nowIso),
      source: "fixture",
      notice: notice(
        "invalid_persisted_state",
        "The saved room could not be read, so the canonical fixture was restored.",
        read.detail,
        nowIso,
      ),
    };
  }

  const version = readVersion(read.raw);

  if (version !== null && !SUPPORTED_SCHEMA_VERSIONS.includes(version)) {
    return {
      room: createCanonicalRoom(nowIso),
      source: "fixture",
      notice: notice(
        "unsupported_schema_version",
        `The saved room uses schema version ${version}, which this build cannot read. The canonical fixture was restored.`,
        null,
        nowIso,
      ),
    };
  }

  const parsed = persistedRoomSchema.safeParse(read.raw);

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      room: createCanonicalRoom(nowIso),
      source: "fixture",
      notice: notice(
        "invalid_persisted_state",
        "The saved room failed validation, so the canonical fixture was restored.",
        first ? `${first.path.join(".") || "(root)"}: ${first.message}` : null,
        nowIso,
      ),
    };
  }

  const reconstructedReceipt =
    parsed.data.room.approvedBuyerContext !== null &&
    parsed.data.room.approvedBuyerContextReceipt === null
      ? buyerContextReceipt(parsed.data.room)
      : null;
  const migratedLegacyReceipt = reconstructedReceipt !== null;
  const refreshed = refreshDerivedState(parsed.data.room, nowIso);

  if (migratedLegacyReceipt) {
    return {
      room: refreshed,
      source: "persisted",
      notice: notice(
        "persisted_state_migrated",
        "An older saved room was upgraded in place, and its buyer-context receipt was restored from the existing approval event.",
        "Schema version 1 buyer-context receipt reconstruction completed.",
        nowIso,
      ),
    };
  }

  return {
    room: refreshed,
    source: "persisted",
    notice: null,
  };
}
