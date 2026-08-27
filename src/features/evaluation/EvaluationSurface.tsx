import { RequirementStatusMark, StatusMark } from "../../components/StatusMark.tsx";
import { conditionLabel } from "../../domain/conditions.ts";
import type { EvidenceRecord, RoomState } from "../../domain/types.ts";
import {
  selectRequirementSummaries,
  selectRequirementTotals,
} from "../../state/selectors.ts";

function evidenceTypeLabel(type: EvidenceRecord["type"]): string {
  return {
    product_doc: "Product",
    security_doc: "Security",
    integration_doc: "Integration",
    implementation_doc: "Implementation",
    testimonial: "Testimonial",
  }[type];
}

function trustLabel(record: EvidenceRecord): string {
  if (record.untrustedContent) {
    return "Untrusted text";
  }
  return record.trustClass === "canonical" ? "Canonical demo source" : record.trustClass;
}

export function EvaluationSurface({ room }: { room: RoomState }) {
  const requirements = selectRequirementSummaries(room);
  const totals = selectRequirementTotals(room);

  return (
    <article className="surface surface--evaluation motion-rise">
      <header className="surface-intro surface-intro--evaluation">
        <div>
          <h1>Six requirements. Evidence must earn the answer.</h1>
          <p>
            ProofRoom starts at unknown, then derives status only from eligible attached records.
            Empty evidence is a truthful starting state, not a broken one.
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

      <section className="dossier" aria-labelledby="requirements-heading">
        <header className="dossier__head">
          <div>
            <h2 id="requirements-heading">Requirement dossier</h2>
            <p>Priority, proof coverage, limitations, and open conditions in one scan.</p>
          </div>
          <StatusMark tone="gap" glyph="?" label="unknown means not yet proven" />
        </header>
        <ol className="requirement-register">
          {requirements.map((requirement, index) => {
            const source = room.requirements.find((entry) => entry.id === requirement.id);
            return (
              <li key={requirement.id}>
                <div className="requirement-register__identity">
                  <span className="ledger-index">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="mono">{requirement.id}</p>
                    <h3>{requirement.label}</h3>
                    <p>{source?.description}</p>
                  </div>
                </div>
                <div className="requirement-register__state">
                  <RequirementStatusMark status={requirement.status} />
                  <span className="priority-mark">
                    {requirement.priority} {requirement.nonNegotiable ? "| non-negotiable" : ""}
                  </span>
                </div>
                <dl className="requirement-register__counts">
                  <div>
                    <dt>Attached</dt>
                    <dd>{requirement.attachedEvidenceCount}</dd>
                  </div>
                  <div>
                    <dt>Limits</dt>
                    <dd>{requirement.limitationCount}</dd>
                  </div>
                  <div>
                    <dt>Questions</dt>
                    <dd>{requirement.openQuestionCount}</dd>
                  </div>
                </dl>
                <div className="requirement-register__conditions">
                  <p className="mono">Open conditions</p>
                  <p>
                    {requirement.gaps.length > 0
                      ? requirement.gaps.map((conditionId) => conditionLabel(conditionId)).join(", ")
                      : "No open hard conditions."}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="evidence-index" aria-labelledby="evidence-index-heading">
        <header className="evidence-index__head">
          <div>
            <h2 id="evidence-index-heading">Evidence index</h2>
            <p>
              Twelve fictional records are available for later attachment. Provenance and
              limitations remain visible before any interaction is added.
            </p>
          </div>
          <p className="mono">catalog / read only / 12 records</p>
        </header>
        <div className="evidence-table-wrap">
          <table className="evidence-table">
            <thead>
              <tr>
                <th scope="col">Record</th>
                <th scope="col">Source and coverage</th>
                <th scope="col">Trust</th>
                <th scope="col">Limits</th>
              </tr>
            </thead>
            <tbody>
              {room.evidenceCatalog.map((record) => (
                <tr key={record.id}>
                  <th scope="row" data-label="Record">
                    <span className="mono">{record.id}</span>
                    <span>{record.title}</span>
                    <span className="mono">{evidenceTypeLabel(record.type)}</span>
                  </th>
                  <td data-label="Source and coverage">
                    <span>{record.sourceLabel}</span>
                    <span className="mono">{record.coverage.join(", ")}</span>
                  </td>
                  <td data-label="Trust">
                    <span className={`trust-mark ${record.untrustedContent ? "trust-mark--warn" : ""}`}>
                      <span aria-hidden="true">{record.untrustedContent ? "!" : "●"}</span>
                      {trustLabel(record)}
                    </span>
                  </td>
                  <td data-label="Limits">
                    <strong>{record.limitations.length}</strong>
                    <span>{record.limitations[0] ?? "No stated limitation"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}
