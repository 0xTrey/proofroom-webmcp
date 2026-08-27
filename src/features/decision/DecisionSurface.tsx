import type { ReactNode } from "react";
import { StatusMark } from "../../components/StatusMark.tsx";
import type { RoomState } from "../../domain/types.ts";
import {
  selectLedgerTotals,
  selectRequirementSummaries,
  selectRoiSummary,
} from "../../state/selectors.ts";
import { TOOL_NAMES } from "../../webmcp/toolDefinitions.ts";

const READ_ONLY_TOOLS = new Set([
  "get_room_state",
  "search_product_evidence",
  "evaluate_requirement",
  "calculate_roi",
]);

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function DecisionSurface({ room, context }: { room: RoomState; context?: ReactNode }) {
  const roi = selectRoiSummary(room);
  const ledger = selectLedgerTotals(room);
  const blockers = selectRequirementSummaries(room).filter(
    (requirement) => requirement.blocksReadyDecision,
  );
  const decision = room.approvedDecision;

  return (
    <article className="surface surface--decision motion-rise">
      <header className="surface-intro surface-intro--decision">
        <div>
          <h1>The agent can stage the case. Only a person can decide.</h1>
          <p>
            Commercial assumptions, evidence blockers, and agent activity remain inspectable before
            a final status exists. In this reset state, no decision has been proposed or approved.
          </p>
        </div>
        <aside className="human-boundary" aria-labelledby="human-boundary-heading">
          <span className="human-boundary__seal" aria-hidden="true">
            H
          </span>
          <div>
            <h2 id="human-boundary-heading">Human approval boundary</h2>
            <p>
              Browser tools can research, calculate, and stage. They cannot approve buyer context
              or the final decision.
            </p>
            <p className="mono">2 approvals intentionally excluded from WebMCP</p>
          </div>
        </aside>
      </header>

      {context}

      <section className="decision-grid" aria-label="Current commercial and decision state">
        <div className="commercial-model">
          <header>
            <h2>Commercial model</h2>
            <StatusMark
              tone={roi.withinBudget ? "verified" : "gap"}
              glyph={roi.withinBudget ? "✓" : "!"}
              label={roi.withinBudget ? "inside budget ceiling" : "above budget ceiling"}
            />
          </header>
          <dl className="commercial-numbers">
            <div>
              <dt>Annual hours saved</dt>
              <dd className="commercial-number__value">
                {roi.annualHoursSaved.toLocaleString("en-US")}
              </dd>
              <dd className="commercial-number__note">Operator hours only</dd>
            </div>
            <div>
              <dt>Annual labor value</dt>
              <dd className="commercial-number__value">{formatUsd(roi.annualLaborValue)}</dd>
              <dd className="commercial-number__note">No revenue or conversion claim</dd>
            </div>
            <div>
              <dt>First year cost</dt>
              <dd className="commercial-number__value">{formatUsd(roi.firstYearCost)}</dd>
              <dd className="commercial-number__note">Subscription plus implementation</dd>
            </div>
            <div>
              <dt>First year net value</dt>
              <dd className="commercial-number__value">{formatUsd(roi.firstYearNetValue)}</dd>
              <dd className="commercial-number__note">Labor value less first year cost</dd>
            </div>
            <div>
              <dt>Modelled payback</dt>
              <dd className="commercial-number__value">
                {roi.paybackMonths === null ? "N/A" : `${roi.paybackMonths} mo.`}
              </dd>
              <dd className="commercial-number__note">Target is twelve months</dd>
            </div>
            <div>
              <dt>Budget ceiling</dt>
              <dd className="commercial-number__value">{formatUsd(roi.budgetCeiling)}</dd>
              <dd className="commercial-number__note">Visible buyer assumption</dd>
            </div>
          </dl>
        </div>

        <div className="decision-file">
          <header>
            <h2>Decision file</h2>
            <p className="mono">
              {decision ? `approved / ${decision.status}` : "reset state / no approved decision"}
            </p>
          </header>
          <div className="decision-file__empty">
            <span aria-hidden="true">∅</span>
            <div>
              <h3>No conclusion recorded</h3>
              <p>
                A ready decision requires every hard requirement to be fully supported. The current
                room has {blockers.length} hard blockers.
              </p>
            </div>
          </div>
          <ol className="blocker-list" aria-label="Current blockers">
            {blockers.map((blocker, index) => (
              <li key={blocker.id}>
                <span className="mono">{String(index + 1).padStart(2, "0")}</span>
                <span>{blocker.label}</span>
                <span className="mono">{blocker.status.replace("_", " ")}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="activity-summary" aria-labelledby="activity-heading">
        <div>
          <h2 id="activity-heading">The room keeps a real activity receipt.</h2>
          <p>
            Events come from shared actions, never from decorative UI. This baseline shows only the
            canonical system event.
          </p>
        </div>
        <dl>
          <div>
            <dt>Events</dt>
            <dd>{ledger.total}</dd>
          </div>
          <div>
            <dt>Agent</dt>
            <dd>{ledger.byOrigin.webmcp}</dd>
          </div>
          <div>
            <dt>Person</dt>
            <dd>{ledger.byOrigin.ui}</dd>
          </div>
          <div>
            <dt>System</dt>
            <dd>{ledger.byOrigin.system}</dd>
          </div>
          <div>
            <dt>Reads</dt>
            <dd>{ledger.reads}</dd>
          </div>
          <div>
            <dt>Mutations</dt>
            <dd>{ledger.mutations}</dd>
          </div>
        </dl>
      </section>

      <section className="tool-manifest" aria-labelledby="tools-heading">
        <header>
          <div>
            <h2 id="tools-heading">Nine WebMCP tools expose the evaluation, not the authority.</h2>
            <p>
              Four tools read or calculate. Five stage work through the same domain actions used by
              the page. Approval is absent by design.
            </p>
          </div>
          <p className="mono">manifest / 09 tools / same-origin</p>
        </header>
        <ol>
          {TOOL_NAMES.map((name, index) => (
            <li key={name}>
              <span className="ledger-index">{String(index + 1).padStart(2, "0")}</span>
              <code>{name}</code>
              <span>{READ_ONLY_TOOLS.has(name) ? "read or calculate" : "stage work"}</span>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
