import { useState } from "react";
import type { RoomActions } from "../../domain/actions/index.ts";
import { conditionLabel } from "../../domain/conditions.ts";
import { isEvidenceActive } from "../../domain/evidence.ts";
import type { EvidenceRecord, Requirement, RoomState } from "../../domain/types.ts";
import { RequirementStatusMark } from "../../components/StatusMark.tsx";
import {
  EvidenceSearchWorkspace,
  type EvaluationFeedback,
} from "./EvidenceSearchWorkspace.tsx";

type RequirementDetailProps = {
  room: RoomState;
  requirement: Requirement;
  actions: RoomActions;
  onInspect: (record: EvidenceRecord, opener: HTMLElement) => void;
  onFeedback: (feedback: EvaluationFeedback) => void;
};

function statusExplanation(requirement: Requirement): string {
  if (requirement.status === "unknown") {
    return "Unknown is an intentional evidence result. No active eligible record proves a hard condition yet.";
  }
  if (requirement.status === "partially_supported") {
    return "Partial means active eligible evidence proves at least one condition while another remains open.";
  }
  if (requirement.status === "unsupported") {
    return "Unsupported means attached evidence contains a direct refutation or contradiction.";
  }
  return "Supported means active eligible evidence covers every hard condition.";
}

export function RequirementDetail(props: RequirementDetailProps) {
  const [buyerNotes, setBuyerNotes] = useState(props.requirement.buyerNotes);
  const [priority, setPriority] = useState(props.requirement.priority);
  const [nonNegotiable, setNonNegotiable] = useState(props.requirement.nonNegotiable);
  const [questions, setQuestions] = useState<string[]>(
    props.requirement.openQuestions.length > 0 ? [...props.requirement.openQuestions] : [""],
  );

  function saveRequirementContext(): void {
    const normalizedQuestions = questions.map((question) => question.trim()).filter(Boolean);
    const statusBefore = props.requirement.status;
    const result = props.actions.stageRequirement({
      requirementId: props.requirement.id,
      buyerNotes,
      priority,
      nonNegotiable,
      openQuestions: normalizedQuestions,
    });
    if (!result.ok) {
      const issues = result.error.issues.map((issue) => `${issue.path}: ${issue.message}`).join(" ");
      props.onFeedback({
        kind: "error",
        message: `${result.error.code}: ${result.error.message}${issues ? ` ${issues}` : ""}`,
      });
      return;
    }

    props.onFeedback({
      kind: "success",
      message: `Saved buyer-authored evaluation context for ${props.requirement.id} at revision ${result.value.revision}. Status was ${statusBefore.replaceAll("_", " ")} and remains evidence-derived as ${result.value.requirement.status.replaceAll("_", " ")}.`,
    });
  }

  const attachedRecords = props.requirement.attachedEvidenceIds
    .map((evidenceId) => props.room.evidenceCatalog.find((record) => record.id === evidenceId))
    .filter((record): record is EvidenceRecord => record !== undefined);

  return (
    <div className="requirement-workspace" data-selected-requirement={props.requirement.id}>
      <section className="requirement-detail" aria-labelledby="requirement-detail-heading">
        <header className="requirement-detail__head">
          <div>
            <p className="mono">{props.requirement.id}</p>
            <h2 id="requirement-detail-heading">{props.requirement.label}</h2>
            <p>{props.requirement.description}</p>
          </div>
          <div className="requirement-detail__status">
            <RequirementStatusMark status={props.requirement.status} />
            <span className="priority-mark">
              {props.requirement.priority}
              {props.requirement.nonNegotiable ? " | non-negotiable" : " | flexible"}
            </span>
          </div>
        </header>

        <p className={`status-explanation status-explanation--${props.requirement.status}`}>
          {statusExplanation(props.requirement)}
        </p>

        <div className="requirement-detail__columns">
          <section aria-labelledby="conditions-heading">
            <h3 id="conditions-heading">Exact hard-condition checklist</h3>
            <ol className="condition-checklist">
              {props.requirement.hardConditions.map((conditionId) => {
                const covered = props.requirement.coveredConditions.includes(conditionId);
                return (
                  <li key={conditionId}>
                    <span
                      className={`condition-checklist__mark ${
                        covered ? "condition-checklist__mark--covered" : ""
                      }`}
                      aria-hidden="true"
                    >
                      {covered ? "✓" : "○"}
                    </span>
                    <span>
                      <strong>{conditionLabel(conditionId)}</strong>
                      <code>{conditionId}</code>
                    </span>
                    <span>{covered ? "covered" : "open"}</span>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="requirement-rationale" aria-labelledby="rationale-heading">
            <h3 id="rationale-heading">Deterministic rationale</h3>
            <p>{props.requirement.rationale}</p>
            <dl>
              <div>
                <dt>Covered conditions</dt>
                <dd>{props.requirement.coveredConditions.length}</dd>
              </div>
              <div>
                <dt>Open gaps</dt>
                <dd>{props.requirement.gaps.length}</dd>
              </div>
              <div>
                <dt>Attached records</dt>
                <dd>{props.requirement.attachedEvidenceIds.length}</dd>
              </div>
              <div>
                <dt>Open questions</dt>
                <dd>{props.requirement.openQuestions.length}</dd>
              </div>
            </dl>
          </section>
        </div>

        <section className="attached-evidence" aria-labelledby="attached-evidence-heading">
          <header>
            <div>
              <h3 id="attached-evidence-heading">Attached evidence record</h3>
              <p>These records, and only eligible claims inside them, determine the status above.</p>
            </div>
            <p className="mono">{attachedRecords.length} attached</p>
          </header>

          {attachedRecords.length === 0 ? (
            <p className="attached-evidence__empty">
              No record is attached. Search the proof index below and inspect a source before
              attaching it.
            </p>
          ) : (
            <ol aria-label={`${props.requirement.label} attached evidence`}>
              {attachedRecords.map((record) => {
                const active = isEvidenceActive(record, new Date().toISOString());
                return (
                  <li key={record.id}>
                    <div>
                      <p className="mono">{record.id}</p>
                      <h4>{record.title}</h4>
                      <p>{record.sourceLabel}</p>
                    </div>
                    <dl>
                      <div>
                        <dt>State</dt>
                        <dd>{active ? "● active" : "× expired"}</dd>
                      </div>
                      <div>
                        <dt>Trust</dt>
                        <dd>{record.trustClass}</dd>
                      </div>
                      <div>
                        <dt>Limits</dt>
                        <dd>{record.limitations.length}</dd>
                      </div>
                    </dl>
                    <button
                      className="button button--quiet"
                      type="button"
                      onClick={(event) => props.onInspect(record, event.currentTarget)}
                    >
                      Inspect {record.id}
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </section>

      <EvidenceSearchWorkspace
        room={props.room}
        requirement={props.requirement}
        actions={props.actions}
        onInspect={props.onInspect}
        onFeedback={props.onFeedback}
      />

      <section className="requirement-notes" aria-labelledby="buyer-notes-heading">
        <header>
          <div>
            <h3 id="buyer-notes-heading">Buyer notes and open questions</h3>
            <p>
              This context saves through stage_requirement. It can recompute status, but it cannot
              author one.
            </p>
          </div>
          <p className="mono">buyer-authored / not approval</p>
        </header>

        <div className="requirement-notes__form">
          <label htmlFor="buyer-notes">
            Buyer notes
            <textarea
              id="buyer-notes"
              aria-label="Buyer notes"
              value={buyerNotes}
              maxLength={700}
              rows={5}
              onChange={(event) => setBuyerNotes(event.currentTarget.value)}
            />
            <span>{buyerNotes.length} / 700 characters</span>
          </label>

          <fieldset>
            <legend>Priority</legend>
            <label>
              <input
                type="radio"
                name={`priority-${props.requirement.id}`}
                value="must"
                checked={priority === "must"}
                onChange={() => setPriority("must")}
              />
              Must
            </label>
            <label>
              <input
                type="radio"
                name={`priority-${props.requirement.id}`}
                value="should"
                checked={priority === "should"}
                onChange={() => setPriority("should")}
              />
              Should
            </label>
          </fieldset>

          <label className="requirement-notes__check">
            <input
              type="checkbox"
              checked={nonNegotiable}
              onChange={(event) => setNonNegotiable(event.currentTarget.checked)}
            />
            Non-negotiable for the buyer
          </label>

          <fieldset className="question-editor">
            <legend>Open questions, up to six</legend>
            {questions.map((question, index) => (
              <div key={`${props.requirement.id}-question-${index}`}>
                <label htmlFor={`question-${props.requirement.id}-${index}`}>
                  Question {index + 1}
                </label>
                <input
                  id={`question-${props.requirement.id}-${index}`}
                  type="text"
                  value={question}
                  maxLength={240}
                  onChange={(event) => {
                    const next = [...questions];
                    next[index] = event.currentTarget.value;
                    setQuestions(next);
                  }}
                />
                {questions.length > 1 ? (
                  <button
                    className="button button--quiet"
                    type="button"
                    onClick={() =>
                      setQuestions(questions.filter((_entry, questionIndex) => questionIndex !== index))
                    }
                  >
                    Remove question {index + 1}
                  </button>
                ) : null}
              </div>
            ))}
            {questions.length < 6 ? (
              <button
                className="button button--quiet"
                type="button"
                onClick={() => setQuestions([...questions, ""])}
              >
                Add open question
              </button>
            ) : null}
          </fieldset>
        </div>

        <button className="button" type="button" onClick={saveRequirementContext}>
          Save buyer evaluation context
        </button>
      </section>
    </div>
  );
}
