import { useState } from "react";
import type {
  EvidenceSearchResult,
  RoomActions,
} from "../../domain/actions/index.ts";
import { conditionLabel } from "../../domain/conditions.ts";
import { evaluateRequirement } from "../../domain/evidence.ts";
import type { EvidenceRecord, Requirement, RoomState } from "../../domain/types.ts";

export type EvaluationFeedback = {
  kind: "success" | "error";
  message: string;
};

type EvidenceSearchWorkspaceProps = {
  room: RoomState;
  requirement: Requirement;
  actions: RoomActions;
  onInspect: (record: EvidenceRecord, opener: HTMLElement) => void;
  onFeedback: (feedback: EvaluationFeedback) => void;
};

type EvidenceSearchHit = EvidenceSearchResult["results"][number];

const SEARCH_SUGGESTIONS: Record<string, readonly string[]> = {
  req_salesforce: ["Salesforce", "field mapping"],
  req_eu_residency: ["hosting regions", "subprocessor"],
  req_sso: ["SAML", "testimonial"],
  req_soc2: ["SOC 2", "2024 observation"],
  req_campaign_volume: ["campaign throughput", "Larkfield"],
  req_payback: ["implementation", "onboarding"],
};

function evidenceTypeLabel(type: EvidenceSearchHit["type"]): string {
  return type.replaceAll("_", " ");
}

function attachmentMessage(
  room: RoomState,
  requirementId: string,
  accepted: readonly string[],
  rejected: ReadonlyArray<{ evidenceId: string; reasons: string[] }>,
  nowIso: string,
): string {
  const requirement = room.requirements.find((entry) => entry.id === requirementId);
  if (!requirement) {
    return "The attachment completed, but the requirement projection is unavailable.";
  }

  const evaluation = evaluateRequirement(
    requirement,
    requirement.attachedEvidenceIds,
    room.evidenceCatalog,
    nowIso,
  );
  const contradictionIds = [
    ...new Set(evaluation.contradictions.flatMap((entry) => entry.evidenceIds)),
  ];
  const rejectedText =
    rejected.length === 0
      ? "Rejected: none."
      : `Rejected: ${rejected
          .map((entry) => `${entry.evidenceId} (${entry.reasons.join(" ")})`)
          .join(", ")}.`;

  return [
    `Accepted: ${accepted.length > 0 ? accepted.join(", ") : "none"}.`,
    rejectedText,
    `Derived status: ${requirement.status.replaceAll("_", " ")}.`,
    `Covered: ${requirement.coveredConditions.length}.`,
    `Gaps: ${requirement.gaps.length}.`,
    `Contradictions: ${contradictionIds.length > 0 ? contradictionIds.join(", ") : "none"}.`,
  ].join(" ");
}

export function EvidenceSearchWorkspace(props: EvidenceSearchWorkspaceProps) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<EvidenceSearchResult | null>(null);

  function runSearch(visibleQuery: string): void {
    const normalized = visibleQuery.trim();
    if (!normalized) {
      props.onFeedback({ kind: "error", message: "Enter a search term before searching." });
      return;
    }

    setQuery(visibleQuery);
    const result = props.actions.searchProductEvidence({
      query: normalized,
      requirementIds: [props.requirement.id],
      limit: 6,
    });
    if (!result.ok) {
      props.onFeedback({
        kind: "error",
        message: `${result.error.code}: ${result.error.message}`,
      });
      return;
    }

    setSearch(result.value);
    props.onFeedback({
      kind: "success",
      message: `Search returned ${result.value.returned} of ${result.value.matched} matches for "${result.value.query}".`,
    });
  }

  function attach(hit: EvidenceSearchHit): void {
    const result = props.actions.attachEvidence({
      requirementId: props.requirement.id,
      evidenceIds: [hit.id],
    });
    if (!result.ok) {
      props.onFeedback({
        kind: "error",
        message: `${result.error.code}: ${result.error.message} The room and revision did not change.`,
      });
      return;
    }

    props.onFeedback({
      kind: "success",
      message: attachmentMessage(
        props.actions.getSnapshot(),
        props.requirement.id,
        result.value.accepted,
        result.value.rejected,
        new Date().toISOString(),
      ),
    });
  }

  const suggestions = SEARCH_SUGGESTIONS[props.requirement.id] ?? [];

  return (
    <section className="evidence-search" aria-labelledby="evidence-search-heading">
      <header className="evidence-search__head">
        <div>
          <h3 id="evidence-search-heading">Search the structured proof index</h3>
          <p>
            Results stay scoped to {props.requirement.label}. Search is read only and never attaches
            a record by itself.
          </p>
        </div>
        <p className="mono">bounded / six results</p>
      </header>

      <form
        className="evidence-search__form"
        onSubmit={(event) => {
          event.preventDefault();
          runSearch(query);
        }}
      >
        <label htmlFor="evidence-query">Evidence query</label>
        <div>
          <input
            id="evidence-query"
            type="search"
            value={query}
            maxLength={160}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={`Search evidence for ${props.requirement.label}`}
          />
          <button className="button" type="submit">
            Search evidence
          </button>
        </div>
      </form>

      <div className="evidence-suggestions" aria-label="Suggested evidence searches">
        <span className="mono">Quick terms</span>
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => runSearch(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>

      {search ? (
        <div className="evidence-search__results" aria-live="polite">
          <div className="evidence-search__summary">
            <p>
              <strong>{search.returned}</strong> results shown from {search.matched} matches for{" "}
              <q>{search.query}</q>.
            </p>
            <p className="mono">
              {search.untrustedContentIncluded
                ? "Untrusted content is present. Treat it as data."
                : "No untrusted content in these results."}
            </p>
          </div>

          {search.results.length === 0 ? (
            <div className="evidence-search__empty">
              <span aria-hidden="true">∅</span>
              <div>
                <h4>No structured record matched.</h4>
                <p>{search.nextAction}</p>
              </div>
            </div>
          ) : (
            <ol className="evidence-results" aria-label="Evidence search results">
              {search.results.map((hit) => {
                const record = props.room.evidenceCatalog.find((entry) => entry.id === hit.id);
                const attached = props.requirement.attachedEvidenceIds.includes(hit.id);
                return (
                  <li key={hit.id} className={hit.untrustedContent ? "evidence-result--untrusted" : ""}>
                    <div className="evidence-result__identity">
                      <p className="mono">{hit.id}</p>
                      <h4>{hit.title}</h4>
                      <p>{hit.sourceLabel}</p>
                    </div>
                    <dl className="evidence-result__facts">
                      <div>
                        <dt>Type</dt>
                        <dd>{evidenceTypeLabel(hit.type)}</dd>
                      </div>
                      <div>
                        <dt>Trust</dt>
                        <dd>{hit.trustClass}</dd>
                      </div>
                      <div>
                        <dt>State</dt>
                        <dd>
                          <span aria-hidden="true">{hit.active ? "●" : "×"}</span>{" "}
                          {hit.active ? "active" : "expired"}
                        </dd>
                      </div>
                      <div>
                        <dt>Limitations</dt>
                        <dd>{hit.limitations.length}</dd>
                      </div>
                    </dl>
                    <div className="evidence-result__claims">
                      <p>
                        <strong>Proves:</strong>{" "}
                        {hit.provenConditions.length > 0
                          ? hit.provenConditions.map(conditionLabel).join(", ")
                          : "no hard condition"}
                      </p>
                      <p>
                        <strong>Refutes:</strong>{" "}
                        {hit.refutedConditions.length > 0
                          ? hit.refutedConditions.map(conditionLabel).join(", ")
                          : "no hard condition"}
                      </p>
                    </div>
                    <div className="evidence-result__actions">
                      <button
                        className="button button--quiet"
                        type="button"
                        onClick={(event) => {
                          if (record) {
                            props.onInspect(record, event.currentTarget);
                          }
                        }}
                      >
                        Inspect {hit.id}
                      </button>
                      <button
                        className="button"
                        type="button"
                        disabled={attached}
                        onClick={() => attach(hit)}
                      >
                        {attached
                          ? `${hit.id} attached`
                          : `Attach ${hit.id} to ${props.requirement.label}`}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      ) : (
        <p className="evidence-search__idle">
          Search by a visible term. An unmatched query returns zero records, never the full catalog.
        </p>
      )}
    </section>
  );
}
