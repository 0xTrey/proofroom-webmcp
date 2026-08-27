import { useState } from "react";
import { StatusMark } from "../../components/StatusMark.tsx";
import type { RoomActions } from "../../domain/actions/index.ts";
import type { RoiCalculation } from "../../domain/actions/roi.ts";
import type { RoiAssumptions, RoomState } from "../../domain/types.ts";
import { CANONICAL_ROI_ASSUMPTIONS } from "../../fixtures/demoScenario.ts";
import type { DecisionFeedback } from "./DecisionSurface.tsx";

type RoiField = keyof RoiAssumptions;
type RoiDraft = Record<RoiField, string>;

const ROI_FIELDS: ReadonlyArray<{
  key: RoiField;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  integer: boolean;
}> = [
  { key: "campaignsPerMonth", label: "Campaigns per month", unit: "campaigns/mo", min: 0, max: 500, step: 1, integer: true },
  { key: "hoursSavedPerCampaign", label: "Hours saved per campaign", unit: "hours", min: 0, max: 80, step: 0.5, integer: false },
  { key: "loadedHourlyCost", label: "Loaded hourly cost", unit: "USD/hr", min: 0, max: 500, step: 1, integer: false },
  { key: "annualSubscriptionCost", label: "Annual subscription cost", unit: "USD/yr", min: 0, max: 1_000_000, step: 1000, integer: false },
  { key: "implementationCost", label: "One-time implementation cost", unit: "USD", min: 0, max: 500_000, step: 500, integer: false },
  { key: "budgetCeiling", label: "Budget ceiling", unit: "USD/yr", min: 0, max: 1_000_000, step: 1000, integer: false },
];

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatUsdCents(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function assumptionsEqual(a: RoiAssumptions, b: RoiAssumptions): boolean {
  return ROI_FIELDS.every((field) => a[field.key] === b[field.key]);
}

function draftsEqual(a: RoiDraft, b: RoiDraft): boolean {
  return ROI_FIELDS.every((field) => a[field.key] === b[field.key]);
}

function draftFromAssumptions(assumptions: RoiAssumptions): RoiDraft {
  return {
    campaignsPerMonth: String(assumptions.campaignsPerMonth),
    hoursSavedPerCampaign: String(assumptions.hoursSavedPerCampaign),
    loadedHourlyCost: String(assumptions.loadedHourlyCost),
    annualSubscriptionCost: String(assumptions.annualSubscriptionCost),
    implementationCost: String(assumptions.implementationCost),
    budgetCeiling: String(assumptions.budgetCeiling),
  };
}

function validateDraft(draft: RoiDraft): {
  assumptions: RoiAssumptions | null;
  errors: Record<string, string>;
} {
  const assumptions = {} as RoiAssumptions;
  const errors: Record<string, string> = {};

  for (const field of ROI_FIELDS) {
    const raw = draft[field.key].trim();
    if (raw.length === 0) {
      errors[field.key] = `${field.label} is required.`;
      continue;
    }

    const value = Number(raw);
    if (!Number.isFinite(value)) {
      errors[field.key] = `${field.label} must be a number.`;
      continue;
    }
    if (field.integer && !Number.isInteger(value)) {
      errors[field.key] = `${field.label} must be a whole number.`;
      continue;
    }
    if (value < field.min) {
      errors[field.key] = `${field.label} must be at least ${field.min}.`;
      continue;
    }
    if (value > field.max) {
      errors[field.key] = `${field.label} must be at most ${field.max}.`;
      continue;
    }
    assumptions[field.key] = value;
  }

  return {
    assumptions: Object.keys(errors).length === 0 ? assumptions : null,
    errors,
  };
}

export type RoiWorkspaceProps = {
  room: RoomState;
  actions: RoomActions;
  onFeedback: (feedback: Omit<DecisionFeedback, "roomRevision">) => void;
};

export function RoiWorkspace({ room, actions, onFeedback }: RoiWorkspaceProps) {
  const authoritative = room.roiAssumptions;
  const [draft, setDraft] = useState<RoiDraft>(() => draftFromAssumptions(authoritative));
  const [preview, setPreview] = useState<RoiCalculation | null>(null);
  const [previewedDraft, setPreviewedDraft] = useState<{
    values: RoiDraft;
    assumptions: RoiAssumptions;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validation = validateDraft(draft);
  const draftChanged = previewedDraft !== null && !draftsEqual(draft, previewedDraft.values);
  const previewMatchesAuthoritative =
    previewedDraft !== null &&
    !draftChanged &&
    assumptionsEqual(previewedDraft.assumptions, authoritative);

  function handlePreview(): void {
    const checked = validateDraft(draft);
    setFieldErrors(checked.errors);
    if (checked.assumptions === null) {
      return;
    }
    const result = actions.calculateRoi(checked.assumptions);
    if (!result.ok) {
      onFeedback({ kind: "error", message: `${result.error.code}: ${result.error.message}` });
      return;
    }
    setPreview(result.value);
    setPreviewedDraft({
      values: { ...draft },
      assumptions: { ...checked.assumptions },
    });
    onFeedback({ kind: "success", message: "Preview calculated. Review the results before applying." });
  }

  function handleApply(): void {
    if (draftChanged || previewedDraft === null) {
      onFeedback({ kind: "error", message: "The draft changed after the last preview. Preview again before applying." });
      return;
    }
    const result = actions.applyRoiAssumptions(previewedDraft.assumptions);
    if (!result.ok) {
      onFeedback({ kind: "error", message: `${result.error.code}: ${result.error.message}` });
      return;
    }
    const changed = result.value.changedFields;
    onFeedback({
      kind: "success",
      message: `Applied ${changed.length} assumption change${changed.length === 1 ? "" : "s"} to the room model. Revision is now ${result.value.revision}.`,
    });
    setPreview(null);
    setPreviewedDraft(null);
  }

  function handleReset(): void {
    setDraft(draftFromAssumptions(CANONICAL_ROI_ASSUMPTIONS));
    setFieldErrors({});
  }

  const target = room.approvedBuyerContext?.paybackTargetMonths ?? null;
  const budgetWarning = preview !== null && !preview.budgetComparison.withinBudget;
  const paybackWarning =
    preview !== null &&
    target !== null &&
    preview.paybackMonths !== null &&
    preview.paybackMonths > target;

  return (
    <section className="roi-workspace" aria-labelledby="roi-heading">
      <header className="roi-workspace__head">
        <div>
          <h2 id="roi-heading">Commercial model</h2>
          <p>
            The model values operator labor only. It makes no revenue, conversion, or pipeline
            claim. Draft values are separate from authoritative room assumptions until you apply
            them.
          </p>
        </div>
        <StatusMark
          tone={room.roiResult.withinBudget ? "verified" : "gap"}
          glyph={room.roiResult.withinBudget ? "\u2713" : "!"}
          label={room.roiResult.withinBudget ? "inside budget ceiling" : "above budget ceiling"}
        />
      </header>

      <div className="roi-workspace__grid">
        <div className="roi-workspace__inputs">
          <h3>Assumption inputs</h3>
          <p className="roi-workspace__hint">
            Each field shows units, the current authoritative value, and the allowed bounds. Reset
            restores the canonical values.
          </p>
          {ROI_FIELDS.map((field) => (
            <div key={field.key} className="roi-field">
              <div className="roi-field__label-row">
                <label htmlFor={`roi-${field.key}`} className="roi-field__label">{field.label}</label>
                <span className="roi-field__unit">{field.unit}</span>
              </div>
              <input
                id={`roi-${field.key}`}
                type="number"
                min={field.min}
                max={field.max}
                step={field.step}
                value={draft[field.key]}
                aria-label={field.label}
                onChange={(event) => {
                  const next = { ...draft, [field.key]: event.target.value };
                  setDraft(next);
                  setFieldErrors(validateDraft(next).errors);
                }}
                aria-invalid={fieldErrors[field.key] !== undefined}
                aria-describedby={fieldErrors[field.key] ? `roi-${field.key}-error` : undefined}
              />
              <div className="roi-field__meta">
                <span className="mono">
                  current: {field.key === "loadedHourlyCost" || field.key === "annualSubscriptionCost" || field.key === "implementationCost" || field.key === "budgetCeiling"
                    ? formatUsd(authoritative[field.key])
                    : String(authoritative[field.key])}
                </span>
                <span className="mono">
                  bounds: {field.min} to {field.max}
                </span>
                <span className="mono">
                  reset: {field.key === "loadedHourlyCost" || field.key === "annualSubscriptionCost" || field.key === "implementationCost" || field.key === "budgetCeiling"
                    ? formatUsd(CANONICAL_ROI_ASSUMPTIONS[field.key])
                    : String(CANONICAL_ROI_ASSUMPTIONS[field.key])}
                </span>
              </div>
              {fieldErrors[field.key] ? (
                <p id={`roi-${field.key}-error`} className="roi-field__error" role="alert">
                  {fieldErrors[field.key]}
                </p>
              ) : null}
            </div>
          ))}
          <div className="roi-workspace__actions">
            <button
              className="button"
              type="button"
              onClick={handlePreview}
              disabled={validation.assumptions === null}
            >
              Preview calculation
            </button>
            <button
              className="button"
              type="button"
              onClick={handleApply}
              disabled={preview === null || draftChanged || previewMatchesAuthoritative}
            >
              Apply reviewed assumptions
            </button>
            <button className="button button--quiet" type="button" onClick={handleReset}>
              Reset to canonical
            </button>
          </div>
          <p className="roi-workspace__boundary-note">
            Preview is a read-only calculation. It does not change room revision or authoritative
            assumptions. Applying is a visible buyer-owned page action, absent from WebMCP.
          </p>
          {draftChanged ? (
            <p className="roi-workspace__changed-warning" role="status">
              The draft changed after the last preview. Preview again before applying.
            </p>
          ) : null}
          {previewMatchesAuthoritative ? (
            <p className="roi-workspace__changed-warning" role="status">
              No ROI assumptions changed. Edit and preview a different value before applying.
            </p>
          ) : null}
        </div>

        <div className="roi-workspace__preview">
          <h3>Calculation preview</h3>
          <div className="roi-workspace__applied" aria-label="Applied room result">
            <strong>Applied room result</strong>
            <span>{formatUsdCents(room.roiResult.firstYearCost)} first-year cost</span>
            <span>{formatUsdCents(room.roiResult.annualLaborValue)} annual labor value</span>
            <span>
              {room.roiResult.paybackMonths === null
                ? "Payback not expressible"
                : `${room.roiResult.paybackMonths} month payback`}
            </span>
          </div>
          {preview === null ? (
            <div className="roi-workspace__preview-empty">
              <span aria-hidden="true">{"\u25C7"}</span>
              <p>No preview yet. Edit the draft and press Preview calculation.</p>
            </div>
          ) : (
            <dl className="roi-preview__numbers">
              <div>
                <dt>Annual hours saved</dt>
                <dd className="roi-preview__value">{preview.annualHoursSaved.toLocaleString("en-US")}</dd>
                <dd className="roi-preview__note">Operator hours only</dd>
              </div>
              <div>
                <dt>Annual labor value</dt>
                <dd className="roi-preview__value">{formatUsdCents(preview.annualLaborValue)}</dd>
                <dd className="roi-preview__note">No revenue or conversion claim</dd>
              </div>
              <div>
                <dt>Monthly labor value</dt>
                <dd className="roi-preview__value">{formatUsdCents(preview.monthlyLaborValue)}</dd>
                <dd className="roi-preview__note">Annual labor value / 12</dd>
              </div>
              <div>
                <dt>First-year cost</dt>
                <dd className="roi-preview__value">{formatUsdCents(preview.firstYearCost)}</dd>
                <dd className="roi-preview__note">Subscription plus implementation</dd>
              </div>
              <div>
                <dt>First-year net value</dt>
                <dd className="roi-preview__value">{formatUsdCents(preview.firstYearNetValue)}</dd>
                <dd className="roi-preview__note">Labor value less first-year cost</dd>
              </div>
              <div>
                <dt>Modelled payback</dt>
                <dd className="roi-preview__value">
                  {preview.paybackMonths === null ? "Not expressible" : `${preview.paybackMonths} mo.`}
                </dd>
                <dd className="roi-preview__note">
                  {preview.paybackMonths === null
                    ? "Monthly labor value is zero"
                    : "First-year cost / monthly labor value"}
                </dd>
              </div>
              <div>
                <dt>Budget headroom</dt>
                <dd className="roi-preview__value">{formatUsdCents(preview.budgetComparison.headroom)}</dd>
                <dd className="roi-preview__note">
                  {preview.budgetComparison.withinBudget ? "Within budget ceiling" : "Above budget ceiling"}
                </dd>
              </div>
              {target !== null ? (
                <div>
                  <dt>Payback target</dt>
                  <dd className="roi-preview__value">{target} months</dd>
                  <dd className="roi-preview__note">
                    {preview.meetsPaybackTarget === null
                      ? "No target set"
                      : preview.meetsPaybackTarget
                        ? "Preview meets the target"
                        : "Preview exceeds the target"}
                  </dd>
                </div>
              ) : null}
            </dl>
          )}
          {budgetWarning ? (
            <p className="roi-preview__warning" role="alert">
              Annual subscription exceeds the budget ceiling.
            </p>
          ) : null}
          {paybackWarning ? (
            <p className="roi-preview__warning" role="alert">
              Modelled payback of {preview?.paybackMonths} months exceeds the approved buyer target
              of {target} months.
            </p>
          ) : null}
          {preview !== null && preview.paybackMonths === null ? (
            <p className="roi-preview__warning" role="status">
              Payback is not expressible when monthly labor value is zero.
            </p>
          ) : null}
          {preview !== null ? (
            <details className="roi-preview__formula">
              <summary>Formula explanation</summary>
              <ol>
                {preview.explanation.map((line, index) => (
                  <li key={index} className="mono">{line}</li>
                ))}
              </ol>
            </details>
          ) : null}
        </div>
      </div>
    </section>
  );
}
