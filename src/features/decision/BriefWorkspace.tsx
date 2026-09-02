import { useState } from "react";
import { StatusMark } from "../../components/StatusMark.tsx";
import type { RoomActions } from "../../domain/actions/index.ts";
import type { StakeholderRole, RoomState } from "../../domain/types.ts";
import { hasCanonicalReviewSet } from "../evaluation/reviewSet.ts";
import type { DecisionFeedback } from "./DecisionSurface.tsx";

const ROLES: ReadonlyArray<{ key: StakeholderRole; label: string }> = [
  { key: "cfo", label: "CFO" },
  { key: "ciso", label: "CISO" },
];

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

type BriefDraft = {
  summary: string;
  evidenceIds: string[];
  risks: string[];
  openQuestions: string[];
  nextStep: string;
};

function emptyDraft(): BriefDraft {
  return { summary: "", evidenceIds: [], risks: [], openQuestions: [], nextStep: "" };
}

function canonicalCfoDraft(room: RoomState): BriefDraft {
  const evIds = room.requirements
    .filter((r) => r.id === "req_payback")
    .flatMap((r) => r.attachedEvidenceIds);

  const paybackStatement =
    room.roiResult.paybackMonths === null
      ? "The modelled payback cannot be expressed"
      : `The modelled ${room.roiResult.paybackMonths} month payback`;
  return {
    summary: `${paybackStatement}, and current costs are based on explicit buyer assumptions. EU data residency remains a purchase risk.`,
    evidenceIds: evIds.length > 0 ? evIds : ["ev_010"],
    risks: ["EU data residency is unproven and could stop the purchase."],
    openQuestions: ["Does the Enterprise tier price hold for a second year?"],
    nextStep: "Confirm the list price and the implementation fee in writing.",
  };
}

function canonicalCisoDraft(room: RoomState): BriefDraft {
  const evIds: string[] = [];
  for (const reqId of ["req_soc2", "req_sso", "req_eu_residency"]) {
    const req = room.requirements.find((r) => r.id === reqId);
    if (req) {
      evIds.push(...req.attachedEvidenceIds);
    }
  }
  const safeEvIds = evIds.length > 0 ? evIds : ["ev_004", "ev_006", "ev_007"];

  return {
    summary:
      "Current SOC 2 and SAML evidence are present. SCIM is open. EU regional processing is unproven.",
    evidenceIds: safeEvIds,
    risks: ["EU data residency is unproven.", "SSO and provisioning is only partly covered."],
    openQuestions: ["When will SCIM provisioning ship?"],
    nextStep: "Request an EU region commitment and an EU subprocessor list.",
  };
}

export type BriefWorkspaceProps = {
  room: RoomState;
  actions: RoomActions;
  onFeedback: (feedback: Omit<DecisionFeedback, "roomRevision">) => void;
};

export function BriefWorkspace({ room, actions, onFeedback }: BriefWorkspaceProps) {
  const [activeRole, setActiveRole] = useState<StakeholderRole>("cfo");
  const [drafts, setDrafts] = useState<Record<StakeholderRole, BriefDraft>>({
    cfo: emptyDraft(),
    ciso: emptyDraft(),
  });
  const [evidenceInput, setEvidenceInput] = useState("");

  const brief = room.stakeholderBriefs[activeRole];
  const draft = drafts[activeRole];

  function updateDraft(role: StakeholderRole, patch: Partial<BriefDraft>): void {
    setDrafts((prev) => ({ ...prev, [role]: { ...prev[role], ...patch } }));
  }

  function handleSave(role: StakeholderRole): void {
    const d = drafts[role];
    const result = actions.saveStakeholderBrief({
      role,
      summary: d.summary,
      evidenceIds: d.evidenceIds,
      risks: d.risks,
      openQuestions: d.openQuestions,
      nextStep: d.nextStep,
    });
    if (!result.ok) {
      onFeedback({ kind: "error", message: `${result.error.code}: ${result.error.message}` });
      return;
    }
    onFeedback({
      kind: "success",
      message: `Saved the ${role.toUpperCase()} brief at revision ${result.value.revision} with ${result.value.warnings.length} warning${result.value.warnings.length === 1 ? "" : "s"}.`,
    });
  }

  function handleCanonicalFill(role: StakeholderRole): void {
    if (!hasCanonicalReviewSet(room.requirements)) {
      onFeedback({
        kind: "error",
        message:
          "Run the sample evidence check on the Evaluation route before filling honest sample briefs. The convenience will not overstate an incomplete review.",
      });
      return;
    }
    const canonical = role === "cfo" ? canonicalCfoDraft(room) : canonicalCisoDraft(room);
    updateDraft(role, canonical);
    onFeedback({ kind: "success", message: `Filled the ${role.toUpperCase()} draft with honest sample content. Review and save.` });
  }

  function handleAddEvidence(role: StakeholderRole): void {
    const id = evidenceInput.trim().toLowerCase();
    if (!id) return;
    if (draft.evidenceIds.includes(id)) {
      setEvidenceInput("");
      return;
    }
    const record = room.evidenceCatalog.find((e) => e.id === id);
    if (!record) {
      onFeedback({ kind: "error", message: `Unknown evidence ID ${id}.` });
      return;
    }
    updateDraft(role, { evidenceIds: [...draft.evidenceIds, id] });
    setEvidenceInput("");
  }

  function handleRemoveEvidence(role: StakeholderRole, id: string): void {
    updateDraft(role, { evidenceIds: draft.evidenceIds.filter((e) => e !== id) });
  }

  return (
    <section className="brief-workspace" aria-labelledby="briefs-heading">
      <header className="brief-workspace__head">
        <div>
          <h2 id="briefs-heading">Briefs for finance and security</h2>
          <p>
            Each CFO and CISO brief must stay honest about missing evidence. The page and browser agent
            save it the same way.
          </p>
        </div>
        <div className="brief-workspace__roles">
          {ROLES.map((role) => {
            const saved = room.stakeholderBriefs[role.key];
            return (
              <button
                key={role.key}
                type="button"
                className={`brief-role-tab ${activeRole === role.key ? "brief-role-tab--active" : ""}`}
                aria-pressed={activeRole === role.key}
                onClick={() => setActiveRole(role.key)}
              >
                <span>{role.label}</span>
                {saved ? (
                  <StatusMark tone="verified" glyph="\u2713" label="saved" />
                ) : (
                  <StatusMark tone="neutral" glyph="\u25CB" label="draft" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      <div className="brief-workspace__editor">
        <div className="brief-workspace__form">
          <h3>{ROLES.find((r) => r.key === activeRole)?.label} brief editor</h3>

          <div className="brief-field">
            <label htmlFor={`brief-${activeRole}-summary`}>Summary</label>
            <textarea
              id={`brief-${activeRole}-summary`}
              value={draft.summary}
              maxLength={900}
              onChange={(e) => updateDraft(activeRole, { summary: e.target.value })}
              rows={3}
            />
            <span className="brief-field__count mono">{draft.summary.length} / 900</span>
          </div>

          <div className="brief-field">
            <label htmlFor={`brief-${activeRole}-evidence-input`}>Evidence citations</label>
            <div className="brief-field__evidence-add">
              <select
                id={`brief-${activeRole}-evidence-input`}
                value={evidenceInput}
                onChange={(e) => setEvidenceInput(e.target.value)}
              >
                <option value="">Choose a fictional evidence record</option>
                {room.evidenceCatalog.map((record) => (
                  <option key={record.id} value={record.id}>
                    {record.id}: {record.title}
                  </option>
                ))}
              </select>
              <button className="button button--quiet" type="button" onClick={() => handleAddEvidence(activeRole)}>
                Add
              </button>
            </div>
            {draft.evidenceIds.length > 0 ? (
              <ul className="brief-field__evidence-list">
                {draft.evidenceIds.map((id) => {
                  const record = room.evidenceCatalog.find((e) => e.id === id);
                  return (
                    <li key={id}>
                      <span className="mono">{id}</span>
                      <span>{record?.title ?? id}</span>
                      <button
                        className="button button--quiet"
                        type="button"
                        onClick={() => handleRemoveEvidence(activeRole, id)}
                        aria-label={`Remove ${id}`}
                      >
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          <div className="brief-field">
            <label htmlFor={`brief-${activeRole}-risks`}>Risks (one per line)</label>
            <textarea
              id={`brief-${activeRole}-risks`}
              value={draft.risks.join("\n")}
              maxLength={1440}
              onChange={(e) => updateDraft(activeRole, { risks: e.target.value.split("\n").filter((r) => r.trim().length > 0) })}
              rows={3}
            />
            <span className="brief-field__count mono">{draft.risks.length} / 6 risks</span>
          </div>

          <div className="brief-field">
            <label htmlFor={`brief-${activeRole}-questions`}>Open questions (one per line)</label>
            <textarea
              id={`brief-${activeRole}-questions`}
              value={draft.openQuestions.join("\n")}
              maxLength={1440}
              onChange={(e) => updateDraft(activeRole, { openQuestions: e.target.value.split("\n").filter((q) => q.trim().length > 0) })}
              rows={3}
            />
            <span className="brief-field__count mono">{draft.openQuestions.length} / 6 questions</span>
          </div>

          <div className="brief-field">
            <label htmlFor={`brief-${activeRole}-nextstep`}>Recommended next step</label>
            <input
              id={`brief-${activeRole}-nextstep`}
              type="text"
              value={draft.nextStep}
              maxLength={240}
              onChange={(e) => updateDraft(activeRole, { nextStep: e.target.value })}
            />
            <span className="brief-field__count mono">{draft.nextStep.length} / 240</span>
          </div>

          <div className="brief-workspace__actions">
            <button className="button" type="button" onClick={() => handleSave(activeRole)}>
              Save {ROLES.find((r) => r.key === activeRole)?.label} brief
            </button>
            <button className="button button--quiet" type="button" onClick={() => handleCanonicalFill(activeRole)}>
              Fill the honest sample draft
            </button>
          </div>
          <p className="brief-workspace__convenience-note">
            The honest sample fill is a fictional-demo convenience. It fills the draft with honest
            content that matches current room state. You still review and save through the shared
            action.
          </p>
        </div>

        <div className="brief-workspace__saved">
          <h3>Saved {ROLES.find((r) => r.key === activeRole)?.label} brief</h3>
          {brief ? (
            <div className="brief-saved" data-brief-role={activeRole}>
              <dl>
                <div>
                  <dt>Summary</dt>
                  <dd>{brief.summary}</dd>
                </div>
                <div>
                  <dt>Evidence citations</dt>
                  <dd>
                    <ul>
                      {brief.evidenceIds.map((id) => {
                        const record = room.evidenceCatalog.find((e) => e.id === id);
                        return (
                          <li key={id}>
                            <span className="mono">{id}</span>
                            <span>{record?.title ?? id}</span>
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
                      {brief.risks.map((risk, index) => (
                        <li key={index}>{risk}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
                <div>
                  <dt>Open questions</dt>
                  <dd>
                    <ul>
                      {brief.openQuestions.map((q, index) => (
                        <li key={index}>{q}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
                <div>
                  <dt>Next step</dt>
                  <dd>{brief.nextStep}</dd>
                </div>
                <div>
                  <dt>Saved by</dt>
                  <dd className="mono">{brief.savedBy}</dd>
                </div>
                <div>
                  <dt>Saved at revision</dt>
                  <dd className="mono">{brief.savedAtRevision}</dd>
                </div>
                <div>
                  <dt>Timestamp</dt>
                  <dd className="mono">{formatTimestamp(brief.savedAt)} UTC</dd>
                </div>
              </dl>
              {brief.warnings.length > 0 ? (
                <div className="brief-saved__warnings">
                  <h4>Warnings</h4>
                  <ul>
                    {brief.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="brief-workspace__saved-empty">
              <span aria-hidden="true">{"\u25CB"}</span>
              <p>No {ROLES.find((r) => r.key === activeRole)?.label} brief saved yet.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
