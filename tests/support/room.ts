/**
 * Test helpers.
 *
 * Every test store uses a fixed clock and in-memory storage, so assertions are
 * about behavior rather than about the machine running them.
 */
import { createRoomStore, type RoomStoreHandle } from "../../src/state/createRoomStore.ts";
import { createMemoryRoomStorage, type RoomStorage } from "../../src/state/persistence.ts";
import { createCanonicalRoom } from "../../src/fixtures/demoScenario.ts";
import type { RoomState } from "../../src/domain/types.ts";

export const FIXED_NOW = "2026-08-26T12:00:00.000Z";

export function clockFrom(startIso: string = FIXED_NOW, stepMs = 1000) {
  let current = Date.parse(startIso);
  return {
    now: () => new Date(current).toISOString(),
    advance(ms: number) {
      current += ms;
    },
    tick() {
      current += stepMs;
      return new Date(current).toISOString();
    },
  };
}

export type TestRoom = RoomStoreHandle & {
  clock: ReturnType<typeof clockFrom>;
  room(): RoomState;
};

export function createTestRoom(
  options: { storage?: RoomStorage; startIso?: string } = {},
): TestRoom {
  const clock = clockFrom(options.startIso ?? FIXED_NOW);
  const handle = createRoomStore({
    storage: options.storage ?? createMemoryRoomStorage(),
    now: clock.now,
  });

  return {
    ...handle,
    clock,
    room: () => handle.store.getState().room,
  };
}

export function canonicalRoom(nowIso: string = FIXED_NOW): RoomState {
  return createCanonicalRoom(nowIso);
}

/** The full canonical evidence attachment an agent would make. */
export const CANONICAL_ATTACHMENTS: Array<{ requirementId: string; evidenceIds: string[] }> = [
  { requirementId: "req_salesforce", evidenceIds: ["ev_002", "ev_003"] },
  { requirementId: "req_eu_residency", evidenceIds: ["ev_007", "ev_008"] },
  { requirementId: "req_sso", evidenceIds: ["ev_006"] },
  { requirementId: "req_soc2", evidenceIds: ["ev_004"] },
  { requirementId: "req_campaign_volume", evidenceIds: ["ev_009"] },
  { requirementId: "req_payback", evidenceIds: ["ev_010"] },
];

export function attachCanonicalEvidence(handle: TestRoom): void {
  for (const attachment of CANONICAL_ATTACHMENTS) {
    const result = handle.agentActions.attachEvidence(attachment);
    if (!result.ok) {
      throw new Error(
        `Canonical attachment failed for ${attachment.requirementId}: ${result.error.code} ${result.error.message}`,
      );
    }
  }
}
