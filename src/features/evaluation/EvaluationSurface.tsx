import { useState, type ReactNode } from "react";
import { RequirementStatusMark, StatusMark } from "../../components/StatusMark.tsx";
import type { RoomActions } from "../../domain/actions/index.ts";
import type { DomainError } from "../../domain/errors.ts";
import { isEvidenceActive } from "../../domain/evidence.ts";
import type { EvidenceRecord, RoomState } from "../../domain/types.ts";
import {
  selectRequirementSummaries,
  selectRequirementTotals,
} from "../../state/selectors.ts";
import { EvidenceInspector } from "./EvidenceInspector.tsx";
import type { EvaluationFeedback } from "./EvidenceSearchWorkspace.tsx";
import { RequirementDetail } from "./RequirementDetail.tsx";
import { CANONICAL_REVIEW_SET } from "./reviewSet.ts";

function isEvaluationError(error: DomainError | null): error is DomainError {
  if (!error) {
    return false;
  }
  if (error.relatedIds.some((id) => id.startsWith("req_") || id.startsWith("ev_"))) {
    return true;
  }
  if (error.code === "EVIDENCE_INELIGIBLE" || error.code === "EVIDENCE_INSUFFICIENT") {
    return true;
  }
  const evaluationPaths = new Set([
    "query",
    "requirementId",
    "evidenceIds",
    "buyerNotes",
    "priority",
    "nonNegotiable",
    "openQuestions",
  ]);
  return error.issues.some((issue) => evaluationPaths.has(issue.path));
}

export type EvaluationSurfaceProps = {
  room: RoomState;
  actions: RoomActions;
  lastError: DomainError | null;
  context?: ReactNode;
};

type RevisionedEvaluationFeedback = EvaluationFeedback & {
  roomRevision: number;
};

export function EvaluationSurface({ room, actions, lastError, context }: EvaluationSurfaceProps) {
  const requirements = selectRequirementSummaries(room);
  const totals = selectRequirementTotals(room);
  const [selectedId, setSelectedId] = useState(room.requirements[0]?.id ?? "");
  const [feedback, setFeedback] = useState<RevisionedEvaluationFeedback | null>(null);
  const [inspector, setInspector] = useState<{
    record: EvidenceRecord;
    opener: HTMLElement;
  } | null>(null);
  const selected =
    room.requirements.find((requirement) => requirement.id === selectedId) ?? room.requirements[0];
  const reviewSetApplied = CANONICAL_REVIEW_SET.every((attachment) => {
    const requirement = room.requirements.find((entry) => entry.id === attachment.requirementId);
    return attachment.evidenceIds.every((evidenceId) =>
      requirement?.attachedEvidenceIds.includes(evidenceId),
    );
  });

  function reportFeedback(nextFeedback: EvaluationFeedback): void {
    setFeedback({
      ...nextFeedback,
      roomRevision: actions.getSnapshot().revision,
    });
  }

  function applyFictionalReviewSet(): void {
    const reports: string[] = [];

    for (const attachment of CANONICAL_REVIEW_SET) {
      const current = actions
        .getSnapshot()
        .requirements.find((entry) => entry.id === attachment.requirementId);
      const missing = attachment.evidenceIds.filter(
        (evidenceId) => !current?.attachedEvidenceIds.includes(evidenceId),
      );
      if (missing.length === 0) {
        reports.push(`${attachment.requirementId}: already resolved`);
        continue;
      }

      const result = actions.attachEvidence({
        requirementId: attachment.requirementId,
        evidenceIds: [...missing],
      });
      if (!result.ok) {
        reportFeedback({
          kind: "error",
          message: `Fictional review set stopped at ${attachment.requirementId}. ${result.error.code}: ${result.error.message} Completed before failure: ${reports.join("; ") || "none"}.`,
        });
        return;
      }
      reports.push(
        `${attachment.requirementId}: ${result.value.requirement.status.replaceAll("_", " ")} from ${result.value.accepted.join(", ")}`,
      );
    }

    reportFeedback({
      kind: "success",
      message: `Applied the fictional review set through shared attach actions. ${reports.join("; ")}.`,
    });
  }

  const currentFeedback =
    feedback?.kind === "error" && feedback.roomRevision !== room.revision ? null : feedback;
  const visibleFeedback =
    currentFeedback ??
    (isEvaluationError(lastError)
      ? { kind: "error" as const, message: `${lastError.code}: ${lastError.message}` }
      : null);

  return (
    <article className="surface surface--evaluation motion-rise">
      <header className="surface-intro surface-intro--evaluation">
        <div>
          <h1>Six requirements. Evidence must earn the answer.</h1>
          <p>
            ProofRoom starts at unknown, then derives status only from eligible attached records.
            Empty evidence is a truthful starting state, not a broken one.
          </p>
          <p className="evaluation-invariant">
            <span aria-hidden="true">◇</span>
            Requirement status is computed from active, eligible, attached evidence. A buyer,
            browser agent, note, testimonial, or persuasive sentence cannot set it.
          </p>
        </div>
        <dl className="surface-score" aria-label="Evaluation totals">
          <div>
            <dt>Requirements</dt>
            <dd>{totals.total}</dd>
          </div>
          <div>
            <dt>Evidence catalog</dt>
            <dd>{room.evidenceCatalog.length}</dd>
          </div>
          <div>
            <dt>Supported now</dt>
            <dd>{totals.supported}</dd>
          </div>
          <div>
            <dt>Open now</dt>
            <dd>{totals.unknown + totals.partially_supported + totals.unsupported}</dd>
          </div>
        </dl>
      </header>

      {context}

      <aside className="evaluation-disclosure" aria-label="Fictional evaluation disclosure">
        <strong>Fictional demonstration</strong>
        <span>{room.vendor.fictionalDisclosure}</span>
        <span>{room.canonicalBuyer.fictionalDisclosure}</span>
      </aside>

      <section className="evaluation-dossier" aria-labelledby="requirements-heading">
        <header className="evaluation-dossier__head">
          <div>
            <h2 id="requirements-heading">Requirement dossier</h2>
            <p>
              Select a record to open its detail, proof search, and buyer notes without leaving the
              route.
            </p>
          </div>
          <div className="evaluation-dossier__tools">
            <StatusMark tone="gap" glyph="?" label="unknown means not yet proven" />
            <button
              className="button"
              type="button"
              disabled={reviewSetApplied}
              onClick={applyFictionalReviewSet}
            >
              {reviewSetApplied ? "Fictional review set applied" : "Apply fictional review set"}
            </button>
            <p>
              Demo convenience only. This attaches evidence and never approves context or a
              decision.
            </p>
          </div>
        </header>
        <ol className="requirement-register" aria-label="Six requirement records">
          {requirements.map((requirement, index) => (
            <li
              key={requirement.id}
              data-requirement-id={requirement.id}
              data-requirement-status={requirement.status}
            >
              <button
                className="requirement-selector"
                type="button"
                aria-pressed={selected?.id === requirement.id}
                onClick={() => {
                  setSelectedId(requirement.id);
                  setFeedback(null);
                }}
              >
                <span className="requirement-selector__identity">
                  <span className="ledger-index">{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="mono">{requirement.id}</span>
                    <strong>{requirement.label}</strong>
                  </span>
                </span>
                <span className="requirement-selector__state">
                  <RequirementStatusMark status={requirement.status} />
                  <span className="priority-mark">
                    {requirement.priority} |{" "}
                    {requirement.nonNegotiable ? "non-negotiable" : "flexible"}
                  </span>
                </span>
                <span className="requirement-selector__counts">
                  <span>
                    <small>Attached</small>
                    <strong>{requirement.attachedEvidenceCount}</strong>
                  </span>
                  <span>
                    <small>Covered</small>
                    <strong>{requirement.coveredConditions.length}</strong>
                  </span>
                  <span>
                    <small>Gaps</small>
                    <strong>{requirement.gaps.length}</strong>
                  </span>
                  <span>
                    <small>Questions</small>
                    <strong>{requirement.openQuestionCount}</strong>
                  </span>
                </span>
                <span className="requirement-selector__selection">
                  {selected?.id === requirement.id ? "Current selection" : "Open record"}
                </span>
              </button>
            </li>
          ))}
        </ol>

        <p
          className={`evaluation-feedback ${
            visibleFeedback?.kind === "error" ? "evaluation-feedback--error" : ""
          }`}
          aria-live="polite"
          aria-atomic="true"
        >
          {visibleFeedback?.message ?? "Evaluation actions will be reported here."}
        </p>
      </section>

      {selected ? (
        <RequirementDetail
          key={selected.id}
          room={room}
          requirement={selected}
          actions={actions}
          onInspect={(record, opener) => setInspector({ record, opener })}
          onFeedback={reportFeedback}
        />
      ) : null}

      <section className="catalog-index" aria-labelledby="catalog-index-heading">
        <header className="catalog-index__head">
          <div>
            <h2 id="catalog-index-heading">Complete evidence catalog index</h2>
            <p>
              Twelve fictional records remain inspectable. Search above applies deterministic
              matching and requirement filters before any attachment is offered.
            </p>
          </div>
          <p className="mono">catalog / inspectable / 12 records</p>
        </header>
        <ol className="catalog-index__records">
          {room.evidenceCatalog.map((record) => (
            <li key={record.id}>
              <span className="mono">{record.id}</span>
              <span>
                <strong>{record.title}</strong>
                <small>{record.sourceLabel}</small>
              </span>
              <span className={record.untrustedContent ? "catalog-index__trust--warn" : ""}>
                <span aria-hidden="true">{record.untrustedContent ? "!" : "●"}</span>{" "}
                  {record.untrustedContent ? "Untrusted text" : record.trustClass}
              </span>
              <button
                className="button button--quiet"
                type="button"
                onClick={(event) => setInspector({ record, opener: event.currentTarget })}
              >
                Inspect {record.id}
              </button>
            </li>
          ))}
        </ol>
      </section>

      {inspector ? (
        <EvidenceInspector
          record={inspector.record}
          requirements={room.requirements}
          active={isEvidenceActive(inspector.record, new Date().toISOString())}
          opener={inspector.opener}
          onClose={() => setInspector(null)}
        />
      ) : null}
    </article>
  );
}
