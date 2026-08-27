import { useState, type ReactNode } from "react";
import { RequirementStatusMark, StatusMark } from "../../components/StatusMark.tsx";
import type { RoomActions } from "../../domain/actions/index.ts";
import type { DomainError } from "../../domain/errors.ts";
import type { RoomState } from "../../domain/types.ts";
import {
  selectLedgerTotals,
} from "../../state/selectors.ts";
import { TOOL_NAMES } from "../../webmcp/toolDefinitions.ts";
import { RoiWorkspace } from "./RoiWorkspace.tsx";
import { BriefWorkspace } from "./BriefWorkspace.tsx";
import { ProposalDesk } from "./ProposalDesk.tsx";

const READ_ONLY_TOOLS = new Set([
  "get_room_state",
  "search_product_evidence",
  "evaluate_requirement",
  "calculate_roi",
]);

function isDecisionError(error: DomainError | null): boolean {
  if (!error) {
    return false;
  }
  const decisionPaths = new Set([
    "status",
    "rationale",
    "supportingRequirementIds",
    "blockingRequirementIds",
    "risks",
    "nextStep",
    "summary",
    "role",
    "evidenceIds",
    "campaignsPerMonth",
    "hoursSavedPerCampaign",
    "loadedHourlyCost",
    "annualSubscriptionCost",
    "implementationCost",
    "budgetCeiling",
  ]);
  if (error.issues.some((issue) => decisionPaths.has(issue.path))) {
    return true;
  }
  const decisionCodes = new Set([
    "DECISION_BLOCKED",
    "PROPOSAL_STALE",
    "PROPOSAL_EXPIRED",
    "PROPOSAL_RESOLVED",
    "EVIDENCE_INSUFFICIENT",
  ]);
  if (decisionCodes.has(error.code)) {
    return true;
  }
  if (error.relatedIds.some((id) => id.startsWith("pdc_") || id.startsWith("brief_"))) {
    return true;
  }
  return false;
}

export type DecisionFeedback = {
  kind: "success" | "error";
  message: string;
  roomRevision: number;
};

export type DecisionSurfaceProps = {
  room: RoomState;
  actions: RoomActions;
  lastError: DomainError | null;
  context?: ReactNode;
};

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

export function DecisionSurface({ room, actions, lastError, context }: DecisionSurfaceProps) {
  const ledger = selectLedgerTotals(room);
  const decision = room.approvedDecision;
  const [feedback, setFeedback] = useState<DecisionFeedback | null>(null);

  function reportFeedback(next: Omit<DecisionFeedback, "roomRevision">): void {
    setFeedback({ ...next, roomRevision: actions.getSnapshot().revision });
  }

  const currentFeedback =
    feedback?.kind === "error" && feedback.roomRevision !== room.revision ? null : feedback;
  const visibleFeedback =
    currentFeedback ??
    (isDecisionError(lastError)
      ? { kind: "error" as const, message: `${lastError!.code}: ${lastError!.message}` }
      : null);

  const isHistorical =
    decision !== null && decision.approvedAtRevision < room.revision;

  return (
    <article className="surface surface--decision motion-rise">
      <header className="surface-intro surface-intro--decision">
        <div>
          <h1>The agent can stage the case. Only a person can decide.</h1>
          <p>
            Challenge the commercial model, review evidence-backed briefs, inspect the staged
            proposal, and approve or reject the final decision in this page.
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

      <aside className="evaluation-disclosure" aria-label="Fictional decision disclosure">
        <strong>Fictional demonstration</strong>
        <span>{room.vendor.fictionalDisclosure}</span>
        <span>{room.canonicalBuyer.fictionalDisclosure}</span>
      </aside>

      <p
        className={`decision-feedback ${visibleFeedback?.kind === "error" ? "decision-feedback--error" : ""}`}
        aria-live="polite"
        aria-atomic="true"
      >
        {visibleFeedback?.message ?? "Decision actions will be reported here."}
      </p>

      <RoiWorkspace room={room} actions={actions} onFeedback={reportFeedback} />

      <BriefWorkspace room={room} actions={actions} onFeedback={reportFeedback} />

      <ProposalDesk room={room} actions={actions} onFeedback={reportFeedback} />

      {decision ? (
        <section className="approved-decision" aria-labelledby="approved-decision-heading">
          <header>
            <div>
              <h2 id="approved-decision-heading">Approved decision</h2>
              {isHistorical ? (
                <p className="mono">
                  approved at revision {decision.approvedAtRevision} / current revision{" "}
                  {room.revision} / requires re-evaluation
                </p>
              ) : (
                <p className="mono">approved at revision {decision.approvedAtRevision} / current</p>
              )}
            </div>
            <StatusMark
              tone={decision.status === "ready" ? "verified" : "gap"}
              glyph={decision.status === "ready" ? "\u2713" : "\u25CB"}
              label={decision.status.replace(/_/g, " ")}
            />
          </header>
          {isHistorical ? (
            <p className="approved-decision__stale-notice">
              The room advanced to revision {room.revision} after this decision was approved at
              revision {decision.approvedAtRevision}. The approved record is historical and should
              be re-evaluated against the current room state.
            </p>
          ) : null}
          <dl className="approved-decision__payload">
            <div>
              <dt>Status</dt>
              <dd>{decision.status.replace(/_/g, " ")}</dd>
            </div>
            <div>
              <dt>Rationale</dt>
              <dd>{decision.rationale}</dd>
            </div>
            <div>
              <dt>Supporting requirements</dt>
              <dd>
                <ul>
                  {decision.supportingRequirementIds.map((id) => {
                    const req = room.requirements.find((r) => r.id === id);
                    return (
                      <li key={id}>
                        <span className="mono">{id}</span>
                        <span>{req?.label ?? id}</span>
                        {req ? <RequirementStatusMark status={req.status} /> : null}
                      </li>
                    );
                  })}
                </ul>
              </dd>
            </div>
            <div>
              <dt>Blocking requirements</dt>
              <dd>
                <ul>
                  {decision.blockingRequirementIds.map((id) => {
                    const req = room.requirements.find((r) => r.id === id);
                    return (
                      <li key={id}>
                        <span className="mono">{id}</span>
                        <span>{req?.label ?? id}</span>
                        {req ? <RequirementStatusMark status={req.status} /> : null}
                      </li>
                    );
                  })}
                </ul>
              </dd>
            </div>
            <div>
              <dt>Risks</dt>
              <dd>
                <ul>
                  {decision.risks.map((risk, index) => (
                    <li key={index}>{risk}</li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt>Next step</dt>
              <dd>{decision.nextStep}</dd>
            </div>
          </dl>
          <section className="approved-decision__receipt" aria-labelledby="receipt-heading">
            <h3 id="receipt-heading">Decision receipt</h3>
            <dl>
              <div>
                <dt>Receipt ID</dt>
                <dd className="mono">{decision.receipt.id}</dd>
              </div>
              <div>
                <dt>Kind</dt>
                <dd className="mono">{decision.receipt.kind}</dd>
              </div>
              <div>
                <dt>Proposal ID</dt>
                <dd className="mono">{decision.receipt.proposalId}</dd>
              </div>
              <div>
                <dt>Payload digest</dt>
                <dd className="mono">{decision.receipt.inputDigest}</dd>
              </div>
              <div>
                <dt>Approved revision</dt>
                <dd className="mono">{decision.receipt.revision}</dd>
              </div>
              <div>
                <dt>Issued timestamp</dt>
                <dd className="mono">{formatTimestamp(decision.receipt.issuedAt)} UTC</dd>
              </div>
              <div className="approved-decision__receipt-summary">
                <dt>Safe summary</dt>
                <dd>{decision.receipt.summary}</dd>
              </div>
            </dl>
          </section>
        </section>
      ) : null}

      <section className="activity-summary" aria-labelledby="activity-heading">
        <div>
          <h2 id="activity-heading">The room keeps a real activity receipt.</h2>
          <p>
            Events come from shared actions, never from decorative UI. Every read and mutation
            appears here.
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
