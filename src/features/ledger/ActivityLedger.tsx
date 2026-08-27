import { useState } from "react";
import {
  LEDGER_PAGE_SIZE,
  ledgerPage,
  type LedgerFilter,
} from "../../domain/actions/ledger.ts";
import type { ActivityEvent, Panel, RoomState } from "../../domain/types.ts";

const PANEL_OPTIONS: readonly Panel[] = [
  "product",
  "context",
  "evaluation",
  "roi",
  "briefs",
  "decision",
  "ledger",
  "system",
];

const ORIGIN_LABELS: Record<ActivityEvent["origin"], string> = {
  webmcp: "Agent",
  ui: "Person",
  system: "System",
};

const ORIGIN_GLYPHS: Record<ActivityEvent["origin"], string> = {
  webmcp: "A",
  ui: "P",
  system: "S",
};

function kindLabel(event: ActivityEvent): string {
  if (event.origin === "system") {
    return "System lifecycle";
  }
  return event.mutating ? "Mutation" : "Read";
}

function toolLabel(event: ActivityEvent): string {
  if (event.toolName) {
    return event.toolName;
  }
  return event.origin === "system" ? "system" : "page only";
}

function EventRow({ event }: { event: ActivityEvent }) {
  return (
    <tr data-event-id={event.id}>
      <th scope="row" data-label="Event">
        <span className="ledger-event__sequence mono">#{event.sequence}</span>
        <span className="mono">{event.id}</span>
      </th>
      <td data-label="UTC timestamp">
        <time className="mono" dateTime={event.createdAt}>
          {event.createdAt}
        </time>
      </td>
      <td data-label="Origin">
        <span className={`ledger-mark ledger-mark--${event.origin}`}>
          <span aria-hidden="true">{ORIGIN_GLYPHS[event.origin]}</span>
          {ORIGIN_LABELS[event.origin]}
        </span>
      </td>
      <td data-label="Action and tool">
        <strong className="mono">{event.action}</strong>
        <span className="ledger-event__secondary mono">{toolLabel(event)}</span>
      </td>
      <td data-label="Panel and kind">
        <span>{event.panel}</span>
        <span className={`ledger-mark ledger-mark--${event.mutating ? "mutation" : "read"}`}>
          <span aria-hidden="true">{event.mutating ? "M" : event.origin === "system" ? "S" : "R"}</span>
          {kindLabel(event)}
        </span>
      </td>
      <td data-label="Revision">
        <span className="mono">
          {event.revisionBefore} → {event.revisionAfter}
        </span>
      </td>
      <td data-label="Result">
        <span className={`ledger-mark ledger-mark--${event.resultStatus}`}>
          <span aria-hidden="true">{event.resultStatus === "ok" ? "✓" : "×"}</span>
          {event.resultStatus}
        </span>
        {event.untrustedContent ? (
          <span className="ledger-mark ledger-mark--untrusted">
            <span aria-hidden="true">!</span>
            Untrusted content
          </span>
        ) : null}
      </td>
      <td data-label="Safe detail">
        <p>{event.inputSummary}</p>
        <details className="ledger-event__detail">
          <summary>Inspect safe metadata</summary>
          <dl>
            <div>
              <dt>Input digest</dt>
              <dd className="mono">{event.inputDigest}</dd>
            </div>
            <div>
              <dt>Affected IDs</dt>
              <dd className="mono">
                {event.affectedIds.length > 0 ? event.affectedIds.join(", ") : "none"}
              </dd>
            </div>
          </dl>
        </details>
      </td>
    </tr>
  );
}

export function ActivityLedger({ room }: { room: RoomState }) {
  const [origin, setOrigin] = useState<NonNullable<LedgerFilter["origin"]>>("all");
  const [kind, setKind] = useState<NonNullable<LedgerFilter["kind"]>>("all");
  const [panel, setPanel] = useState<NonNullable<LedgerFilter["panel"]>>("all");
  const [visibleCount, setVisibleCount] = useState(LEDGER_PAGE_SIZE);
  const page = ledgerPage(room.activityLedger, { origin, kind, panel }, visibleCount);

  return (
    <section className="activity-ledger" aria-labelledby="activity-ledger-heading">
      <header className="activity-ledger__head">
        <div>
          <h2 id="activity-ledger-heading">Inspect the authoritative activity register.</h2>
          <p>
            This workspace projects the room ledger only. Filters and pagination never change the
            room or create an event.
          </p>
        </div>
        <p className="mono">newest first / 400 event cap</p>
      </header>

      <div className="activity-ledger__filters" aria-label="Activity ledger filters">
        <label>
          <span>Origin</span>
          <select
            value={origin}
            onChange={(event) => {
              setOrigin(event.target.value as typeof origin);
              setVisibleCount(LEDGER_PAGE_SIZE);
            }}
          >
            <option value="all">All origins</option>
            <option value="webmcp">Agent</option>
            <option value="ui">Person</option>
            <option value="system">System</option>
          </select>
        </label>
        <label>
          <span>Kind</span>
          <select
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as typeof kind);
              setVisibleCount(LEDGER_PAGE_SIZE);
            }}
          >
            <option value="all">All kinds</option>
            <option value="read">Reads</option>
            <option value="mutate">Mutations</option>
          </select>
        </label>
        <label>
          <span>Panel</span>
          <select
            value={panel}
            onChange={(event) => {
              setPanel(event.target.value as typeof panel);
              setVisibleCount(LEDGER_PAGE_SIZE);
            }}
          >
            <option value="all">All panels</option>
            {PANEL_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="activity-ledger__count mono" aria-live="polite">
        Showing {page.visibleCount} of {page.filteredTotal} filtered events. {page.allTotal} total
        events in the room ledger.
      </p>

      {page.events.length === 0 ? (
        <div className="activity-ledger__empty" role="status">
          <span aria-hidden="true">○</span>
          <div>
            <h3>No ledger events match these filters.</h3>
            <p>Change one or more filters. The authoritative ledger remains unchanged.</p>
          </div>
        </div>
      ) : (
        <div className="activity-ledger__table-wrap">
          <table className="activity-ledger__table">
            <caption className="visually-hidden">
              Authoritative room activity, newest event first
            </caption>
            <thead>
              <tr>
                <th scope="col">Event</th>
                <th scope="col">UTC timestamp</th>
                <th scope="col">Origin</th>
                <th scope="col">Action and tool</th>
                <th scope="col">Panel and kind</th>
                <th scope="col">Revision</th>
                <th scope="col">Result</th>
                <th scope="col">Safe detail</th>
              </tr>
            </thead>
            <tbody>
              {page.events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {page.hasMore ? (
        <button
          className="button button--quiet activity-ledger__more"
          type="button"
          onClick={() => setVisibleCount((count) => count + LEDGER_PAGE_SIZE)}
        >
          Show 25 more
        </button>
      ) : null}
    </section>
  );
}
