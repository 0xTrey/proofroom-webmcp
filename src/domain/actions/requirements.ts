/**
 * Evidence search and requirement actions.
 *
 * `search_product_evidence` and `evaluate_requirement` never mutate. Requirement
 * status is always recomputed from attached evidence by `deriveRequirement`, so
 * no caller can assert a status.
 */
import { conditionLabel } from "../conditions.ts";
import { failure } from "../errors.ts";
import {
  deriveRequirement,
  evidenceEligibility,
  evaluateRequirement,
  isEvidenceActive,
  type EvidenceEligibility,
  type RequirementEvaluation,
} from "../evidence.ts";
import { requirementSummary, type RequirementSummary } from "../summaries.ts";
import { decisionBlockers } from "../invariants.ts";
import type { EvidenceRecord, Requirement, RoomState } from "../types.ts";
import {
  attachEvidenceInputSchema,
  evaluateRequirementInputSchema,
  searchProductEvidenceInputSchema,
  stageRequirementInputSchema,
} from "./inputs.ts";
import { defineAction, outcome } from "./runtime.ts";

export type EvidenceSearchHit = {
  id: string;
  title: string;
  type: EvidenceRecord["type"];
  sourceLabel: string;
  sourceUrl: string | null;
  trustClass: EvidenceRecord["trustClass"];
  untrustedContent: boolean;
  effectiveAt: string;
  expiresAt: string | null;
  active: boolean;
  coverage: string[];
  provenConditions: string[];
  refutedConditions: string[];
  limitations: string[];
  summary: string;
  annotation: "canonical_document" | "untrusted_content";
};

export type EvidenceSearchResult = {
  query: string;
  matched: number;
  returned: number;
  limit: number;
  untrustedContentIncluded: boolean;
  results: EvidenceSearchHit[];
  nextAction: string;
};

export type RequirementEvaluationResult = RequirementEvaluation & {
  requirementLabel: string;
  currentStatus: Requirement["status"];
  gapLabels: string[];
  applied: false;
  nextAction: string;
};

export type RequirementStaged = {
  requirementId: string;
  revision: number;
  changedFields: string[];
  requirement: RequirementSummary;
  nextAction: string;
};

export type EvidenceAttached = {
  requirementId: string;
  revision: number;
  accepted: string[];
  rejected: Array<{ evidenceId: string; reasons: string[] }>;
  requirement: RequirementSummary;
  nextAction: string;
};

function findRequirement(state: RoomState, requirementId: string): Requirement | undefined {
  return state.requirements.find((requirement) => requirement.id === requirementId);
}

function tokenize(query: string): string[] {
  return [
    ...new Set(
      query
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 2),
    ),
  ];
}

function scoreRecord(record: EvidenceRecord, tokens: readonly string[]): number {
  if (tokens.length === 0) {
    return 0;
  }

  const title = record.title.toLowerCase();
  const summary = record.summary.toLowerCase();
  const tags = [
    ...record.coverage,
    ...record.supportedClaims,
    ...record.refutedClaims,
    record.type,
    record.sourceLabel.toLowerCase(),
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  for (const token of tokens) {
    if (title.includes(token)) {
      score += 4;
    }
    if (tags.includes(token)) {
      score += 2;
    }
    if (summary.includes(token)) {
      score += 1;
    }
  }

  return score;
}

function toHit(record: EvidenceRecord, nowIso: string): EvidenceSearchHit {
  return {
    id: record.id,
    title: record.title,
    type: record.type,
    sourceLabel: record.sourceLabel,
    sourceUrl: record.sourceUrl ?? null,
    trustClass: record.trustClass,
    untrustedContent: record.untrustedContent,
    effectiveAt: record.effectiveAt,
    expiresAt: record.expiresAt ?? null,
    active: isEvidenceActive(record, nowIso),
    coverage: [...record.coverage],
    provenConditions: [...record.supportedClaims],
    refutedConditions: [...record.refutedClaims],
    limitations: [...record.limitations],
    summary: record.summary,
    annotation: record.untrustedContent ? "untrusted_content" : "canonical_document",
  };
}

export const searchProductEvidenceAction = defineAction({
  action: "search_product_evidence",
  toolName: "search_product_evidence",
  panel: "evaluation",
  mutating: false,
  schema: searchProductEvidenceInputSchema,
  run: (state, input, context) => {
    const limit = input.limit ?? 6;
    const tokens = tokenize(input.query);

    const filtered = state.evidenceCatalog.filter((record) => {
      if (input.types && !input.types.includes(record.type)) {
        return false;
      }
      if (input.trustClasses && !input.trustClasses.includes(record.trustClass)) {
        return false;
      }
      if (input.requirementIds) {
        const requirementConditions = input.requirementIds.flatMap(
          (requirementId) => findRequirement(state, requirementId)?.hardConditions ?? [],
        );
        const tagged =
          input.requirementIds.some((requirementId) => record.coverage.includes(requirementId)) ||
          [...record.supportedClaims, ...record.refutedClaims].some((conditionId) =>
            requirementConditions.includes(conditionId),
          );
        if (!tagged) {
          return false;
        }
      }
      return true;
    });

    const relevant = filtered
      .map((record) => ({ record, score: scoreRecord(record, tokens) }))
      .filter((entry) => entry.score > 0);

    // Stable ordering: score first, then ID, so identical calls return identical lists.
    relevant.sort((left, right) =>
      right.score === left.score ? left.record.id.localeCompare(right.record.id) : right.score - left.score,
    );

    const results = relevant.slice(0, limit).map((entry) => toHit(entry.record, context.nowIso));
    const untrustedIncluded = results.some((hit) => hit.untrustedContent);

    const value: EvidenceSearchResult = {
      query: input.query,
      matched: relevant.length,
      returned: results.length,
      limit,
      untrustedContentIncluded: untrustedIncluded,
      results,
      nextAction:
        results.length === 0
          ? "No record matched. Widen the query or drop a filter."
          : "Call attach_evidence with the record IDs that address a hard condition, then call evaluate_requirement.",
    };

    return outcome({
      value,
      inputSummary: `Searched evidence with ${tokens.length} query terms and returned ${results.length} of ${relevant.length} records.`,
      affectedIds: results.map((hit) => hit.id),
      untrustedContent: untrustedIncluded,
    });
  },
});

export const evaluateRequirementAction = defineAction({
  action: "evaluate_requirement",
  toolName: "evaluate_requirement",
  panel: "evaluation",
  mutating: false,
  schema: evaluateRequirementInputSchema,
  run: (state, input, context) => {
    const requirement = findRequirement(state, input.requirementId);

    if (!requirement) {
      return failure("NOT_FOUND", "No requirement matches that ID.", {
        issues: [{ path: "requirementId", message: "Unknown requirement ID." }],
        relatedIds: [input.requirementId],
      });
    }

    const candidates = input.candidateEvidenceIds ?? requirement.attachedEvidenceIds;
    const evaluation = evaluateRequirement(
      requirement,
      candidates,
      state.evidenceCatalog,
      context.nowIso,
    );

    const value: RequirementEvaluationResult = {
      ...evaluation,
      requirementLabel: requirement.label,
      currentStatus: requirement.status,
      gapLabels: evaluation.gaps.map((conditionId) => conditionLabel(conditionId)),
      applied: false,
      nextAction:
        evaluation.gaps.length === 0
          ? "Every hard condition is covered. Move on to the commercial model or the decision."
          : "Attach evidence that proves the open conditions, or record the gap as an open question.",
    };

    return outcome({
      value,
      inputSummary: `Evaluated ${requirement.id} against ${candidates.length} candidate records without mutating it.`,
      affectedIds: [requirement.id],
    });
  },
});

export const stageRequirementAction = defineAction({
  action: "stage_requirement",
  toolName: "stage_requirement",
  panel: "evaluation",
  mutating: true,
  schema: stageRequirementInputSchema,
  run: (state, input, context) => {
    const requirement = findRequirement(state, input.requirementId);

    if (!requirement) {
      return failure("NOT_FOUND", "No requirement matches that ID.", {
        issues: [{ path: "requirementId", message: "Unknown requirement ID." }],
        relatedIds: [input.requirementId],
      });
    }

    const changedFields = (["buyerNotes", "priority", "nonNegotiable", "openQuestions"] as const).filter(
      (field) => input[field] !== undefined,
    );

    if (changedFields.length === 0) {
      return failure("INVALID_INPUT", "Provide at least one field to stage.", {
        issues: [
          {
            path: "(root)",
            message: "Include buyerNotes, priority, nonNegotiable, or openQuestions.",
          },
        ],
        relatedIds: [requirement.id],
      });
    }

    const updated: Requirement = deriveRequirement(
      {
        ...requirement,
        buyerNotes: input.buyerNotes ?? requirement.buyerNotes,
        priority: input.priority ?? requirement.priority,
        nonNegotiable: input.nonNegotiable ?? requirement.nonNegotiable,
        openQuestions: input.openQuestions ?? requirement.openQuestions,
      },
      state.evidenceCatalog,
      context.nowIso,
    );

    const blockingIds = decisionBlockers(
      state.requirements.map((entry) => (entry.id === updated.id ? updated : entry)),
    ).map((entry) => entry.id);

    const value: RequirementStaged = {
      requirementId: updated.id,
      revision: context.nextRevision,
      changedFields: [...changedFields],
      requirement: requirementSummary(updated, state.evidenceCatalog, blockingIds),
      nextAction:
        updated.status === "supported"
          ? "The requirement is proven. Nothing else is needed here."
          : "Attach evidence for the open conditions or record what the vendor still has to answer.",
    };

    return outcome({
      value,
      patch: (current: RoomState) => ({
        ...current,
        requirements: current.requirements.map((entry) =>
          entry.id === updated.id ? updated : entry,
        ),
      }),
      affectedIds: [updated.id],
      inputSummary: `Staged ${changedFields.length} field changes on ${updated.id}. Status stays evidence derived.`,
    });
  },
});

function rejectionReasons(eligibility: EvidenceEligibility): string[] {
  return eligibility.reasons.map((reason) => {
    switch (reason) {
      case "not_in_catalog":
        return "The evidence ID is not in the catalog.";
      case "not_yet_effective":
        return "The record is not effective yet.";
      case "expired":
        return "The record expired and cannot support a current requirement.";
      case "unrelated_to_requirement":
        return "The record does not address any hard condition of this requirement.";
      case "testimonial_restricted":
        return "A testimonial cannot prove a security or compliance condition.";
      default:
        return "The record is not eligible.";
    }
  });
}

export const attachEvidenceAction = defineAction({
  action: "attach_evidence",
  toolName: "attach_evidence",
  panel: "evaluation",
  mutating: true,
  schema: attachEvidenceInputSchema,
  run: (state, input, context) => {
    const requirement = findRequirement(state, input.requirementId);

    if (!requirement) {
      return failure("NOT_FOUND", "No requirement matches that ID.", {
        issues: [{ path: "requirementId", message: "Unknown requirement ID." }],
        relatedIds: [input.requirementId],
      });
    }

    const accepted: string[] = [];
    const rejected: Array<{ evidenceId: string; reasons: string[] }> = [];

    for (const evidenceId of [...new Set(input.evidenceIds)]) {
      const eligibility = evidenceEligibility(
        evidenceId,
        requirement,
        state.evidenceCatalog,
        context.nowIso,
      );

      const record = state.evidenceCatalog.find((entry) => entry.id === evidenceId);
      const relatedByFiling = record?.coverage.includes(requirement.id) ?? false;
      const refutes =
        record?.refutedClaims.some((conditionId) =>
          requirement.hardConditions.includes(conditionId),
        ) ?? false;

      // An attachable record is active and relevant. It does not have to prove
      // something: a limitation or a contradiction is also evaluation evidence.
      const attachable =
        eligibility.inCatalog &&
        eligibility.active &&
        !eligibility.reasons.includes("unrelated_to_requirement") &&
        (eligibility.eligibleConditions.length > 0 || relatedByFiling || refutes);

      if (attachable) {
        accepted.push(evidenceId);
      } else {
        rejected.push({ evidenceId, reasons: rejectionReasons(eligibility) });
      }
    }

    if (accepted.length === 0) {
      return failure("EVIDENCE_INELIGIBLE", "None of the supplied records can support this requirement.", {
        relatedIds: [requirement.id, ...rejected.map((entry) => entry.evidenceId)],
      });
    }

    const attachedEvidenceIds = [...new Set([...requirement.attachedEvidenceIds, ...accepted])];
    const updated = deriveRequirement(
      { ...requirement, attachedEvidenceIds },
      state.evidenceCatalog,
      context.nowIso,
    );

    const blockingIds = decisionBlockers(
      state.requirements.map((entry) => (entry.id === updated.id ? updated : entry)),
    ).map((entry) => entry.id);

    const value: EvidenceAttached = {
      requirementId: updated.id,
      revision: context.nextRevision,
      accepted,
      rejected,
      requirement: requirementSummary(updated, state.evidenceCatalog, blockingIds),
      nextAction: `Call evaluate_requirement for ${updated.id} to review coverage, gaps, and contradictions.`,
    };

    return outcome({
      value,
      patch: (current: RoomState) => ({
        ...current,
        requirements: current.requirements.map((entry) =>
          entry.id === updated.id ? updated : entry,
        ),
      }),
      affectedIds: [updated.id, ...accepted],
      inputSummary: `Attached ${accepted.length} records to ${updated.id} and rejected ${rejected.length}.`,
      untrustedContent: accepted.some(
        (evidenceId) =>
          state.evidenceCatalog.find((record) => record.id === evidenceId)?.untrustedContent ?? false,
      ),
    });
  },
});
