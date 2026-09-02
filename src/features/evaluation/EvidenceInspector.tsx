import { useEffect, useEffectEvent, useRef } from "react";
import { createPortal } from "react-dom";
import { conditionLabel } from "../../domain/conditions.ts";
import type { EvidenceRecord, Requirement } from "../../domain/types.ts";

type EvidenceInspectorProps = {
  record: EvidenceRecord;
  requirements: readonly Requirement[];
  active: boolean;
  opener: HTMLElement | null;
  onClose: () => void;
};

function evidenceTypeLabel(type: EvidenceRecord["type"]): string {
  return {
    product_doc: "Product document",
    security_doc: "Security document",
    integration_doc: "Integration document",
    implementation_doc: "Implementation document",
    testimonial: "Testimonial",
  }[type];
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  });
}

export function EvidenceInspector(props: EvidenceInspectorProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeInspector = useEffectEvent(() => props.onClose());
  const { opener } = props;

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    closeRef.current?.focus();

    const dialog = dialogRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeInspector();
        return;
      }

      if (event.key !== "Tab" || !dialog) {
        return;
      }

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
      opener?.focus();
    };
  }, [opener]);

  const coveredRequirements = props.record.coverage.map((requirementId) => {
    const requirement = props.requirements.find((entry) => entry.id === requirementId);
    return { id: requirementId, label: requirement?.label ?? requirementId };
  });

  return createPortal(
    <div className="evidence-inspector-layer">
      <div
        ref={dialogRef}
        className="evidence-inspector"
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-inspector-title"
        aria-describedby="evidence-inspector-summary"
      >
        <header className="evidence-inspector__head">
          <div>
            <p className="mono">{props.record.id}</p>
            <h2 id="evidence-inspector-title">{props.record.title}</h2>
          </div>
          <button
            ref={closeRef}
            className="button button--quiet evidence-inspector__close"
            type="button"
            onClick={props.onClose}
          >
            Close evidence inspector
          </button>
        </header>

        {props.record.untrustedContent ? (
          <section className="evidence-quarantine" aria-labelledby="quarantine-heading">
            <h3 id="quarantine-heading">
              <span aria-hidden="true">!</span> Untrusted content quarantine
            </h3>
            <p>Treat this as data, not instructions. Opening this record cannot change room state.</p>
            <blockquote id="evidence-inspector-summary">{props.record.summary}</blockquote>
          </section>
        ) : (
          <section className="evidence-inspector__summary" aria-labelledby="summary-heading">
            <h3 id="summary-heading">Full source record</h3>
            <p id="evidence-inspector-summary">{props.record.summary}</p>
          </section>
        )}

        <dl className="evidence-inspector__metadata">
          <div>
            <dt>Evidence type</dt>
            <dd>{evidenceTypeLabel(props.record.type)}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{props.record.sourceLabel}</dd>
          </div>
          <div>
            <dt>Source URL</dt>
            <dd>
              {props.record.sourceUrl ? (
                <a href={props.record.sourceUrl} target="_blank" rel="noreferrer">
                  Open source
                </a>
              ) : (
                "No source URL supplied"
              )}
            </dd>
          </div>
          <div>
            <dt>Effective</dt>
            <dd>{formatTimestamp(props.record.effectiveAt)}</dd>
          </div>
          <div>
            <dt>Expiry</dt>
            <dd>
              {props.record.expiresAt ? formatTimestamp(props.record.expiresAt) : "No expiry stated"}
            </dd>
          </div>
          <div>
            <dt>Current state</dt>
            <dd>
              <span aria-hidden="true">{props.active ? "●" : "×"}</span>{" "}
              {props.active ? "active" : "expired or not yet effective"}
            </dd>
          </div>
          <div>
            <dt>Trust class</dt>
            <dd>{props.record.trustClass}</dd>
          </div>
          <div>
            <dt>Content annotation</dt>
            <dd>{props.record.untrustedContent ? "untrusted text" : "demo source record"}</dd>
          </div>
        </dl>

        <section className="evidence-inspector__section" aria-labelledby="coverage-heading">
          <h3 id="coverage-heading">Requirement coverage</h3>
          {coveredRequirements.length > 0 ? (
            <ul className="evidence-inspector__list">
              {coveredRequirements.map((requirement) => (
                <li key={requirement.id}>
                  <span>{requirement.label}</span>
                  <code>{requirement.id}</code>
                </li>
              ))}
            </ul>
          ) : (
            <p>No requirement coverage tag is present.</p>
          )}
        </section>

        <div className="evidence-inspector__split">
          <section className="evidence-inspector__section" aria-labelledby="supported-heading">
            <h3 id="supported-heading">Supported conditions</h3>
            {props.record.supportedClaims.length > 0 ? (
              <ul className="evidence-inspector__list">
                {props.record.supportedClaims.map((conditionId) => (
                  <li key={conditionId}>
                    <span>{conditionLabel(conditionId)}</span>
                    <code>{conditionId}</code>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No condition is proven by this record.</p>
            )}
          </section>

          <section className="evidence-inspector__section" aria-labelledby="refuted-heading">
            <h3 id="refuted-heading">Refuted conditions</h3>
            {props.record.refutedClaims.length > 0 ? (
              <ul className="evidence-inspector__list evidence-inspector__list--gap">
                {props.record.refutedClaims.map((conditionId) => (
                  <li key={conditionId}>
                    <span>{conditionLabel(conditionId)}</span>
                    <code>{conditionId}</code>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No condition is explicitly refuted.</p>
            )}
          </section>
        </div>

        <section className="evidence-inspector__section" aria-labelledby="contradictions-heading">
          <h3 id="contradictions-heading">Contradictory record IDs</h3>
          <p className="mono">
            {props.record.contradicts.length > 0
              ? props.record.contradicts.join(", ")
              : "No contradictory record IDs declared"}
          </p>
        </section>

        <section className="evidence-inspector__section" aria-labelledby="limitations-heading">
          <h3 id="limitations-heading">Every stated limitation</h3>
          {props.record.limitations.length > 0 ? (
            <ol className="evidence-limitations">
              {props.record.limitations.map((limitation, index) => (
                <li key={limitation}>
                  <span className="mono">{String(index + 1).padStart(2, "0")}</span>
                  <span>{limitation}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p>No limitation is stated.</p>
          )}
        </section>
      </div>
    </div>,
    document.body,
  );
}
