/**
 * Activity ledger queries.
 *
 * The ledger is append only and is written exclusively by the action runtime.
 * Nothing here creates an event. These helpers only filter and describe events
 * that already happened.
 */
import type { ActivityEvent, RoomState } from "../types.ts";

export type LedgerFilter = {
  origin?: ActivityEvent["origin"] | "all";
  kind?: "all" | "read" | "mutate";
  panel?: ActivityEvent["panel"] | "all";
};

export const LEDGER_PAGE_SIZE = 25;

export function filterLedger(
  events: readonly ActivityEvent[],
  filter: LedgerFilter = {},
): ActivityEvent[] {
  const origin = filter.origin ?? "all";
  const kind = filter.kind ?? "all";
  const panel = filter.panel ?? "all";

  return events
    .filter((event) => {
      if (origin !== "all" && event.origin !== origin) {
        return false;
      }
      if (panel !== "all" && event.panel !== panel) {
        return false;
      }
      if (kind === "read" && (event.mutating || event.origin === "system")) {
        return false;
      }
      if (kind === "mutate" && !event.mutating) {
        return false;
      }
      return true;
    })
    .toReversed();
}

export function ledgerPage(
  events: readonly ActivityEvent[],
  filter: LedgerFilter = {},
  visibleCount = LEDGER_PAGE_SIZE,
): {
  events: ActivityEvent[];
  filteredTotal: number;
  allTotal: number;
  visibleCount: number;
  hasMore: boolean;
} {
  const filtered = filterLedger(events, filter);
  const boundedVisibleCount = Math.max(0, visibleCount);
  const visible = filtered.slice(0, boundedVisibleCount);

  return {
    events: visible,
    filteredTotal: filtered.length,
    allTotal: events.length,
    visibleCount: visible.length,
    hasMore: visible.length < filtered.length,
  };
}

export type LedgerTotals = {
  total: number;
  reads: number;
  mutations: number;
  byOrigin: Record<ActivityEvent["origin"], number>;
  untrustedContentEvents: number;
};

export function ledgerTotals(events: readonly ActivityEvent[]): LedgerTotals {
  const totals: LedgerTotals = {
    total: events.length,
    reads: 0,
    mutations: 0,
    byOrigin: { ui: 0, webmcp: 0, system: 0 },
    untrustedContentEvents: 0,
  };

  for (const event of events) {
    if (event.mutating) {
      totals.mutations += 1;
    } else if (event.origin !== "system") {
      totals.reads += 1;
    }
    totals.byOrigin[event.origin] += 1;
    if (event.untrustedContent) {
      totals.untrustedContentEvents += 1;
    }
  }

  return totals;
}

export function latestEvent(state: RoomState): ActivityEvent | undefined {
  return state.activityLedger.at(-1);
}
