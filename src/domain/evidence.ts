/**
 * Evidence eligibility and deterministic requirement evaluation.
 *
 * This module is the reason ProofRoom exists. Status is computed from eligible
 * evidence, condition by condition. No rationale text, agent argument, or UI
 * interaction can produce a `supported` requirement without evidence.
 */
import { conditionLabel, isTestimonialRestricted } from "./conditions.ts";
import type { EvidenceRecord, Requirement, RequirementStatus } from "./types.ts";

export type IneligibilityReason =
  | "not_in_catalog"
  | "not_yet_effective"
  | "expired"
  | "unrelated_to_requirement"
  | "testimonial_restricted";

export type EvidenceEligibility = {
  evidenceId: string;
  inCatalog: boolean;
  active: boolean;
  /** Conditions of the requirement this record may legitimately prove. */
  eligibleConditions: string[];
  reasons: IneligibilityReason[];
};

export type Contradiction = {
  conditionId: string | null;
  evidenceIds: string[];
  reason: string;
};

export type RequirementEvaluation = {
  requirementId: string;
  proposedStatus: RequirementStatus;
  consideredEvidenceIds: string[];
  eligibleEvidenceIds: string[];
  ineligibleEvidence: EvidenceEligibility[];
  coveredConditions: string[];
  gaps: string[];
  contradictions: Contradiction[];
  rationale: string;
};

export function isEvidenceActive(record: EvidenceRecord, nowIso: string): boolean {
  const now = Date.parse(nowIso);
  if (Number.isNaN(now)) {
    return false;
  }
  if (Date.parse(record.effectiveAt) > now) {
    return false;
  }
  if (record.expiresAt !== undefined && Date.parse(record.expiresAt) <= now) {
    return false;
  }
  return true;
}

export function findEvidence(
  catalog: readonly EvidenceRecord[],
  evidenceId: string,
): EvidenceRecord | undefined {
  return catalog.find((record) => record.id === evidenceId);
}

/**
 * Decides which of a requirement's hard conditions a single record may prove.
 * A record is unrelated when it neither claims nor refutes any of them and is
 * not filed against the requirement.
 */
export function evidenceEligibility(
  evidenceId: string,
  requirement: Requirement,
  catalog: readonly EvidenceRecord[],
  nowIso: string,
): EvidenceEligibility {
  const record = findEvidence(catalog, evidenceId);

  if (!record) {
    return {
      evidenceId,
      inCatalog: false,
      active: false,
      eligibleConditions: [],
      reasons: ["not_in_catalog"],
    };
  }

  const reasons: IneligibilityReason[] = [];
  const now = Date.parse(nowIso);
  const active = isEvidenceActive(record, nowIso);

  if (!active) {
    reasons.push(Date.parse(record.effectiveAt) > now ? "not_yet_effective" : "expired");
  }

  const claimed = requirement.hardConditions.filter((conditionId) =>
    record.supportedClaims.includes(conditionId),
  );
  const refuted = requirement.hardConditions.filter((conditionId) =>
    record.refutedClaims.includes(conditionId),
  );

  if (claimed.length === 0 && refuted.length === 0 && !record.coverage.includes(requirement.id)) {
    reasons.push("unrelated_to_requirement");
  }

  const restricted = claimed.filter(
    (conditionId) => record.trustClass === "testimonial" && isTestimonialRestricted(conditionId),
  );

  if (restricted.length > 0) {
    reasons.push("testimonial_restricted");
  }

  const eligibleConditions = active
    ? claimed.filter((conditionId) => !restricted.includes(conditionId))
    : [];

  return {
    evidenceId,
    inCatalog: true,
    active,
    eligibleConditions,
    reasons,
  };
}

function orderByRequirement(requirement: Requirement, conditionIds: readonly string[]): string[] {
  return requirement.hardConditions.filter((conditionId) => conditionIds.includes(conditionId));
}

function buildRationale(
  requirement: Requirement,
  status: RequirementStatus,
  covered: readonly string[],
  gaps: readonly string[],
  contradictions: readonly Contradiction[],
): string {
  const total = requirement.hardConditions.length;

  if (status === "unsupported") {
    const reasons = contradictions.map((entry) => entry.reason).join(" ");
    return `Blocked by contradictory or limiting evidence. ${reasons}`.trim();
  }

  if (status === "supported") {
    return `Active eligible evidence covers all ${total} hard conditions.`;
  }

  if (status === "partially_supported") {
    return `Active eligible evidence covers ${covered.length} of ${total} hard conditions. Open gaps: ${gaps
      .map((conditionId) => conditionLabel(conditionId))
      .join(", ")}.`;
  }

  return `No active eligible evidence covers a hard condition. Unproven: ${requirement.hardConditions
    .map((conditionId) => conditionLabel(conditionId))
    .join(", ")}.`;
}

/**
 * Evaluates a requirement against a candidate evidence set. Pure function, no
 * state access, so the read-only tool and the mutating action share one truth.
 */
export function evaluateRequirement(
  requirement: Requirement,
  candidateEvidenceIds: readonly string[],
  catalog: readonly EvidenceRecord[],
  nowIso: string,
): RequirementEvaluation {
  const considered = [...new Set(candidateEvidenceIds)];
  const eligibilities = considered.map((evidenceId) =>
    evidenceEligibility(evidenceId, requirement, catalog, nowIso),
  );

  const eligibleEvidenceIds = eligibilities
    .filter((entry) => entry.eligibleConditions.length > 0)
    .map((entry) => entry.evidenceId);

  const ineligibleEvidence = eligibilities.filter((entry) => entry.reasons.length > 0);

  const coveredSet = new Set<string>();
  for (const entry of eligibilities) {
    for (const conditionId of entry.eligibleConditions) {
      coveredSet.add(conditionId);
    }
  }

  const contradictions: Contradiction[] = [];
  const activeConsidered = considered
    .map((evidenceId) => findEvidence(catalog, evidenceId))
    .filter((record): record is EvidenceRecord => record !== undefined)
    .filter((record) => isEvidenceActive(record, nowIso));

  for (const record of activeConsidered) {
    for (const conditionId of orderByRequirement(requirement, record.refutedClaims)) {
      contradictions.push({
        conditionId,
        evidenceIds: [record.id],
        reason: `${record.id} documents that ${conditionLabel(conditionId)} is not satisfied.`,
      });
      coveredSet.delete(conditionId);
    }
  }

  for (const record of activeConsidered) {
    for (const other of activeConsidered) {
      if (record.id >= other.id) {
        continue;
      }
      const conflict =
        record.contradicts.includes(other.id) || other.contradicts.includes(record.id);
      if (!conflict) {
        continue;
      }
      const touched = orderByRequirement(requirement, [
        ...record.supportedClaims,
        ...record.refutedClaims,
        ...other.supportedClaims,
        ...other.refutedClaims,
      ]);
      if (touched.length === 0) {
        continue;
      }
      contradictions.push({
        conditionId: touched[0] ?? null,
        evidenceIds: [record.id, other.id],
        reason: `${record.id} and ${other.id} disagree about ${touched
          .map((conditionId) => conditionLabel(conditionId))
          .join(", ")}.`,
      });
    }
  }

  const coveredConditions = orderByRequirement(requirement, [...coveredSet]);
  const gaps = requirement.hardConditions.filter(
    (conditionId) => !coveredConditions.includes(conditionId),
  );

  let proposedStatus: RequirementStatus;
  if (contradictions.length > 0) {
    proposedStatus = "unsupported";
  } else if (gaps.length === 0) {
    proposedStatus = "supported";
  } else if (coveredConditions.length > 0) {
    proposedStatus = "partially_supported";
  } else {
    proposedStatus = "unknown";
  }

  return {
    requirementId: requirement.id,
    proposedStatus,
    consideredEvidenceIds: considered,
    eligibleEvidenceIds,
    ineligibleEvidence,
    coveredConditions,
    gaps,
    contradictions,
    rationale: buildRationale(requirement, proposedStatus, coveredConditions, gaps, contradictions),
  };
}

/**
 * Rebuilds a requirement from its attached evidence. This is the only writer of
 * requirement status anywhere in the application.
 */
export function deriveRequirement(
  requirement: Requirement,
  catalog: readonly EvidenceRecord[],
  nowIso: string,
): Requirement {
  const evaluation = evaluateRequirement(
    requirement,
    requirement.attachedEvidenceIds,
    catalog,
    nowIso,
  );

  return {
    ...requirement,
    status: evaluation.proposedStatus,
    coveredConditions: evaluation.coveredConditions,
    gaps: evaluation.gaps,
    rationale: evaluation.rationale,
  };
}
