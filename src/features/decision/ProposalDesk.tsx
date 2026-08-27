import { useState } from "react";
import { RequirementStatusMark, StatusMark } from "../../components/StatusMark.tsx";
import type { RoomActions } from "../../domain/actions/index.ts";
import { decisionBlockers } from "../../domain/invariants.ts";
import type { DecisionPayload, RoomState } from "../../domain/types.ts";
import { hasCanonicalReviewSet } from "../evaluation/reviewSet.ts";
import type { DecisionFeedback } from "./DecisionSurface.tsx";

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

type ProposalDraft = {
  status: DecisionPayload["status"];
  rationale: string;
  supportingRequirementIds: string[];
  blockingRequirementIds: string[];
  risks: string[];
  nextStep: string;
};

function emptyProposalDraft(): ProposalDraft {
  return {
    status: "not_ready",
    rationale: "",
    supportingRequirementIds: [],
    blockingRequirementIds: [],
    risks: [],
    nextStep: "",
  };
}

function canonicalProposalDraft(room: RoomState): ProposalDraft {
  const blockers = decisionBlockers(room.requirements);
  const supported = room.requirements.filter((r) => r.status === "supported");
  return {
    status: "not_ready",
    rationale:
      "Salesforce, SOC 2, and campaign volume are proven. EU data residency cannot be proven from the catalog.",
    supportingRequirementIds: supported.map((r) => r.id),
    blockingRequirementIds: blockers.map((r) => r.id),
    risks: ["No EU region commitment.", "SSO provisioning is only partially supported."],
    nextStep: "Request an EU region commitment and a SCIM provisioning timeline.",
  };
}

export type ProposalDeskProps = {
  room: RoomState;
  actions: RoomActions;
  onFeedback: (feedback: Omit<DecisionFeedback, "roomRevision">) => void;
};

export function ProposalDesk({ room, actions, onFeedback }: ProposalDeskProps) {
  const proposal = room.decisionProposal;
  const approved = room.approvedDecision;
  const [draft, setDraft] = useState<ProposalDraft>(emptyProposalDraft());
  const [showEditor, setShowEditor] = useState(false);

  const currentRevision = room.revision;
  const isStale = proposal !== null && proposal.baseRevision !== currentRevision;
  const blockers = decisionBlockers(room.requirements);

  function handleStage(): void {
    const result = actions.proposeDecisionStatus({
      status: draft.status,
      rationale: draft.rationale,
      supportingRequirementIds: draft.supportingRequirementIds,
      blockingRequirementIds: draft.blockingRequirementIds,
      risks: draft.risks,
      nextStep: draft.nextStep,
    });
    if (!result.ok) {
      onFeedback({ kind: "error", message: `${result.error.code}: ${result.error.message}` });
      return;
    }
    onFeedback({
      kind: "success",
      message: `Staged ${result.value.proposedStatus} proposal ${result.value.proposalId} with ${result.value.blockers.length} blocking requirements. ${result.value.approvalInstruction}`,
    });
    setShowEditor(false);
  }

  function handleCanonicalDraft(): void {
    if (!hasCanonicalReviewSet(room.requirements)) {
      onFeedback({
        kind: "error",
        message:
          "Apply the complete fictional review set on the Evaluation route before filling the canonical decision draft.",
      });
      return;
    }
    setDraft(canonicalProposalDraft(room));
    setShowEditor(true);
    onFeedback({ kind: "success", message: "Filled the canonical not-ready draft from current room state." });
  }

  function handleApprove(): void {
    if (!proposal) return;
    const result = actions.approveDecision({ proposalId: proposal.id });
    if (!result.ok) {
      onFeedback({ kind: "error", message: `${result.error.code}: ${result.error.message}` });
      return;
    }
    onFeedback({
      kind: "success",
      message: `Approved decision proposal ${proposal.id}. Status is ${result.value.status}. Receipt ${result.value.receipt.id} issued at revision ${result.value.revision}.`,
    });
  }

  function handleReject(): void {
    if (!proposal) return;
    const result = actions.rejectDecision({
      proposalId: proposal.id,
      reason: "The person rejected the proposal in the page.",
    });
    if (!result.ok) {
      onFeedback({ kind: "error", message: `${result.error.code}: ${result.error.message}` });
      return;
    }
    const hadPrior = approved !== null;
    onFeedback({
      kind: "success",
      message: hadPrior
        ? `Rejected ${proposal.id}. The previously approved decision remains authoritative.`
        : `Rejected ${proposal.id}. No decision has ever been approved.`,
    });
  }

  function toggleSupporting(id: string): void {
    setDraft((prev) => ({
      ...prev,
      supportingRequirementIds: prev.supportingRequirementIds.includes(id)
        ? prev.supportingRequirementIds.filter((r) => r !== id)
        : [...prev.supportingRequirementIds, id],
    }));
  }

  function toggleBlocking(id: string): void {
    setDraft((prev) => ({
      ...prev,
      blockingRequirementIds: prev.blockingRequirementIds.includes(id)
        ? prev.blockingRequirementIds.filter((r) => r !== id)
        : [...prev.blockingRequirementIds, id],
    }));
  }

  return (
    <section className="proposal-desk" aria-labelledby="proposal-heading">
      <header className="proposal-desk__head">
        <div>
          <h2 id="proposal-heading">Decision proposal and approval desk</h2>
          <p>
            A browser agent or page fallback can stage a proposal. Only the person can approve or
            reject it through visible page controls. No WebMCP approval or rejection tool exists.
          </p>
        </div>
        {proposal ? (
          <StatusMark
            tone={proposal.status === "pending" ? "agent" : proposal.status === "approved" ? "verified" : "gap"}
            glyph={proposal.status === "pending" ? "\u25C7" : proposal.status === "approved" ? "\u2713" : "\u00D7"}
            label={proposal.status}
          />
        ) : null}
      </header>

      {proposal ? (
        <article
          className={`proposal-review ${isStale ? "proposal-review--stale" : ""}`}
          aria-labelledby="proposal-review-heading"
          data-proposal-status={proposal.status}
        >
          <header className="proposal-review__head">
            <div>
              <h3 id="proposal-review-heading">Staged proposal</h3>
              <p>
                Inspect the exact payload before you act. The action will re-check revision, expiry,
                digest, and requirement consistency.
              </p>
            </div>
          </header>

          <dl className="proposal-envelope" aria-label="Decision proposal envelope">
            <div>
              <dt>Proposal ID</dt>
              <dd className="mono">{proposal.id}</dd>
            </div>
            <div>
              <dt>Creator origin</dt>
              <dd className="mono">{proposal.createdBy}</dd>
            </div>
            <div>
              <dt>Base revision</dt>
              <dd className="mono">{proposal.baseRevision}</dd>
            </div>
            <div>
              <dt>Current revision</dt>
              <dd className="mono">{currentRevision}</dd>
            </div>
            <div>
              <dt>Expiry</dt>
              <dd className="mono">{formatTimestamp(proposal.expiresAt)} UTC</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd className="mono">{formatTimestamp(proposal.createdAt)} UTC</dd>
            </div>
            <div>
              <dt>Digest</dt>
              <dd className="mono">{proposal.inputDigest}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd className="mono">{proposal.status}</dd>
            </div>
          </dl>

          <div className="proposal-payload">
            <h4>Proposed decision</h4>
            <dl>
              <div>
                <dt>Decision status</dt>
                <dd>{proposal.payload.status.replace(/_/g, " ")}</dd>
              </div>
              <div>
                <dt>Rationale</dt>
                <dd>{proposal.payload.rationale}</dd>
              </div>
              <div>
                <dt>Supporting requirements</dt>
                <dd>
                  <ul>
                    {proposal.payload.supportingRequirementIds.map((id) => {
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
                    {proposal.payload.blockingRequirementIds.map((id) => {
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
                    {proposal.payload.risks.map((risk, index) => (
                      <li key={index}>{risk}</li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div>
                <dt>Next step</dt>
                <dd>{proposal.payload.nextStep}</dd>
              </div>
            </dl>
          </div>

          {proposal.status === "pending" ? (
            <div className="proposal-review__actions" aria-label="Human decision controls">
              <button className="button" type="button" onClick={handleApprove}>
                Approve decision
              </button>
              <button className="button button--danger" type="button" onClick={handleReject}>
                Reject proposal
              </button>
              <p>These are page-only controls. No WebMCP approval or rejection tool exists.</p>
            </div>
          ) : null}

          {proposal.status === "pending" && isStale ? (
            <p className="proposal-review__stale-notice" role="alert">
              This proposal is stale. It was staged at revision {proposal.baseRevision}, but the room
              is now at revision {currentRevision}. Approval and rejection will fail atomically.
              Stage a fresh proposal.
            </p>
          ) : null}

          {proposal.status === "rejected" ? (
            <p className="proposal-review__resolution">
              {approved
                ? `Rejected ${proposal.id}. The previously approved decision remains authoritative.`
                : `Rejected ${proposal.id}. No decision has ever been approved.`}
            </p>
          ) : null}

          {proposal.status === "approved" && approved ? (
            <p className="proposal-review__resolution">
              Approved as {approved.status} at revision {approved.approvedAtRevision}. Receipt{" "}
              {approved.receipt.id}.
            </p>
          ) : null}
        </article>
      ) : (
        <div className="proposal-desk__empty">
          <span aria-hidden="true">{"\u2205"}</span>
          <div>
            <h3>No proposal staged</h3>
            <p>
              A ready decision requires every hard requirement to be fully supported. The current
              room has {blockers.length} hard blocker{blockers.length === 1 ? "" : "s"}.
            </p>
          </div>
        </div>
      )}

      <ol className="blocker-list" aria-label="Current blockers">
        {blockers.map((blocker, index) => (
          <li key={blocker.id}>
            <span className="mono">{String(index + 1).padStart(2, "0")}</span>
            <span>{blocker.label}</span>
            <span className="mono">{blocker.status.replace(/_/g, " ")}</span>
          </li>
        ))}
      </ol>

      {approved && proposal && proposal.status === "pending" ? (
        <p className="proposal-desk__prior-notice">
          A prior decision was approved at revision {approved.approvedAtRevision}. The pending
          proposal above is separate. If approved, it replaces the prior decision. If rejected, the
          prior decision remains authoritative.
        </p>
      ) : null}

      <div className="proposal-desk__editor-toggle">
        {showEditor ? (
          <div className="proposal-desk__editor">
            <h3>Stage a proposal</h3>
            <p>
              Stage through the shared action. The UI can suggest an honest canonical not-ready
              draft based on current room state. It still calls the shared proposal action.
            </p>

            <div className="proposal-desk__field">
              <label htmlFor="proposal-status">Decision status</label>
              <select
                id="proposal-status"
                value={draft.status}
                onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value as DecisionPayload["status"] }))}
              >
                <option value="not_ready">not ready</option>
                <option value="ready_with_conditions">ready with conditions</option>
                <option value="ready">ready</option>
              </select>
            </div>

            <div className="proposal-desk__field">
              <label htmlFor="proposal-rationale">Rationale</label>
              <textarea
                id="proposal-rationale"
                value={draft.rationale}
                maxLength={900}
                onChange={(e) => setDraft((prev) => ({ ...prev, rationale: e.target.value }))}
                rows={3}
              />
              <span className="mono">{draft.rationale.length} / 900</span>
            </div>

            <div className="proposal-desk__field">
              <span>Supporting requirements</span>
              <ul className="proposal-desk__req-list">
                {room.requirements.map((req) => (
                  <li key={req.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={draft.supportingRequirementIds.includes(req.id)}
                        onChange={() => toggleSupporting(req.id)}
                      />
                      <span className="mono">{req.id}</span>
                      <span>{req.label}</span>
                      <RequirementStatusMark status={req.status} />
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="proposal-desk__field">
              <span>Blocking requirements</span>
              <ul className="proposal-desk__req-list">
                {room.requirements.map((req) => (
                  <li key={req.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={draft.blockingRequirementIds.includes(req.id)}
                        onChange={() => toggleBlocking(req.id)}
                      />
                      <span className="mono">{req.id}</span>
                      <span>{req.label}</span>
                      <RequirementStatusMark status={req.status} />
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="proposal-desk__field">
              <label htmlFor="proposal-risks">Risks (one per line)</label>
              <textarea
                id="proposal-risks"
                value={draft.risks.join("\n")}
                maxLength={1440}
                onChange={(e) => setDraft((prev) => ({ ...prev, risks: e.target.value.split("\n").filter((r) => r.trim().length > 0) }))}
                rows={3}
              />
              <span className="mono">{draft.risks.length} / 6 risks</span>
            </div>

            <div className="proposal-desk__field">
              <label htmlFor="proposal-nextstep">Next step</label>
              <input
                id="proposal-nextstep"
                type="text"
                value={draft.nextStep}
                maxLength={240}
                onChange={(e) => setDraft((prev) => ({ ...prev, nextStep: e.target.value }))}
              />
              <span className="mono">{draft.nextStep.length} / 240</span>
            </div>

            <div className="proposal-desk__actions">
              <button className="button" type="button" onClick={handleStage}>
                Stage proposal
              </button>
              <button className="button button--quiet" type="button" onClick={() => setShowEditor(false)}>
                Cancel
              </button>
            </div>
            <p className="proposal-desk__stage-note">
              Stage controls are shared-action controls, not human approval controls.
            </p>
          </div>
        ) : (
          <div className="proposal-desk__editor-buttons">
            <button className="button" type="button" onClick={() => setShowEditor(true)}>
              Open proposal editor
            </button>
            <button className="button button--quiet" type="button" onClick={handleCanonicalDraft}>
              Fill canonical not-ready draft
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
