/**
 * Invariant guards shared by every action.
 *
 * These functions are the difference between a demo that looks trustworthy and
 * one that is. They decide when a proposal may be approved, when a decision is
 * blocked, and when a brief overstates what the evidence supports.
 */
import { failure, success, type ActionResult } from "./errors.ts";
import { inputDigest } from "./hash.ts";
import type { DecisionPayload, Proposal, Requirement } from "./types.ts";

/** A staged proposal stays approvable for fifteen minutes of demo time. */
export const PROPOSAL_TTL_MS = 15 * 60 * 1000;

export const MAX_LEDGER_EVENTS = 400;

export function proposalExpiry(nowIso: string): string {
  return new Date(Date.parse(nowIso) + PROPOSAL_TTL_MS).toISOString();
}

/**
 * Approval guard. Order matters: a resolved proposal is reported as resolved
 * even when it is also expired, because that is the more useful message.
 */
export function assertProposalApprovable<Payload>(
  proposal: Proposal<Payload> | null,
  currentRevision: number,
  nowIso: string,
  proposalId: string,
): ActionResult<Proposal<Payload>> {
  if (!proposal) {
    return failure("NOT_FOUND", "There is no staged proposal to act on.", {
      relatedIds: [proposalId],
    });
  }

  if (proposal.id !== proposalId) {
    return failure("NOT_FOUND", "The proposal ID does not match the staged proposal.", {
      relatedIds: [proposalId, proposal.id],
    });
  }

  if (proposal.status !== "pending") {
    return failure("PROPOSAL_RESOLVED", `This proposal is already ${proposal.status}.`, {
      relatedIds: [proposal.id],
    });
  }

  if (Date.parse(proposal.expiresAt) <= Date.parse(nowIso)) {
    return failure("PROPOSAL_EXPIRED", "This proposal expired. Ask for a new one.", {
      relatedIds: [proposal.id],
    });
  }

  if (proposal.baseRevision !== currentRevision) {
    return failure(
      "PROPOSAL_STALE",
      `The room moved to revision ${currentRevision} after this proposal was staged at revision ${proposal.baseRevision}.`,
      { relatedIds: [proposal.id] },
    );
  }

  if (inputDigest(proposal.payload) !== proposal.inputDigest) {
    return failure("INVALID_INPUT", "The staged payload no longer matches its digest.", {
      relatedIds: [proposal.id],
    });
  }

  return success(proposal);
}

/**
 * A requirement blocks a ready decision when the buyer treats it as hard and
 * its status is anything other than fully supported.
 */
export function isBlockingRequirement(requirement: Requirement): boolean {
  const hard = requirement.priority === "must" || requirement.nonNegotiable;
  return hard && requirement.status !== "supported";
}

export function decisionBlockers(requirements: readonly Requirement[]): Requirement[] {
  return requirements.filter(isBlockingRequirement);
}

export function assertDecisionStatusAllowed(
  status: string,
  requirements: readonly Requirement[],
): ActionResult<true> {
  const blockers = decisionBlockers(requirements);

  if (status === "ready" && blockers.length > 0) {
    return failure(
      "DECISION_BLOCKED",
      `A ready decision needs every hard requirement proven. Blocked by ${blockers
        .map((requirement) => requirement.label)
        .join(", ")}.`,
      { relatedIds: blockers.map((requirement) => requirement.id) },
    );
  }

  return success(true);
}

function duplicateIds(ids: readonly string[]): string[] {
  return [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
}

/**
 * Decision arrays are part of the proposal's claim, so they must agree with
 * each other and with the current evidence-derived requirement state.
 */
export function assertDecisionProposalConsistent(
  proposal: DecisionPayload,
  requirements: readonly Requirement[],
): ActionResult<true> {
  const duplicateSupporting = duplicateIds(proposal.supportingRequirementIds);
  const duplicateBlocking = duplicateIds(proposal.blockingRequirementIds);

  if (duplicateSupporting.length > 0 || duplicateBlocking.length > 0) {
    return failure("INVALID_INPUT", "Decision requirement IDs must be unique within each list.", {
      issues: [
        ...duplicateSupporting.map((id) => ({
          path: "supportingRequirementIds",
          message: `Duplicate requirement ID ${id}.`,
        })),
        ...duplicateBlocking.map((id) => ({
          path: "blockingRequirementIds",
          message: `Duplicate requirement ID ${id}.`,
        })),
      ],
      relatedIds: [...duplicateSupporting, ...duplicateBlocking],
    });
  }

  const requirementById = new Map(requirements.map((requirement) => [requirement.id, requirement]));
  const referencedIds = [
    ...proposal.supportingRequirementIds,
    ...proposal.blockingRequirementIds,
  ];
  const unknownIds = referencedIds.filter((id) => !requirementById.has(id));

  if (unknownIds.length > 0) {
    return failure("NOT_FOUND", "The proposal references a requirement that does not exist.", {
      issues: unknownIds.map((id) => ({
        path: proposal.blockingRequirementIds.includes(id)
          ? "blockingRequirementIds"
          : "supportingRequirementIds",
        message: `Unknown requirement ID ${id}.`,
      })),
      relatedIds: unknownIds,
    });
  }

  const overlap = proposal.supportingRequirementIds.filter((id) =>
    proposal.blockingRequirementIds.includes(id),
  );

  if (overlap.length > 0) {
    return failure(
      "INVALID_INPUT",
      "A requirement cannot be both supporting and blocking in one decision proposal.",
      {
        issues: overlap.map((id) => ({
          path: "blockingRequirementIds",
          message: `${id} is also listed as supporting.`,
        })),
        relatedIds: overlap,
      },
    );
  }

  const supportedBlockers = proposal.blockingRequirementIds.filter(
    (id) => requirementById.get(id)?.status === "supported",
  );

  if (supportedBlockers.length > 0) {
    return failure("INVALID_INPUT", "A fully supported requirement cannot be listed as blocking.", {
      issues: supportedBlockers.map((id) => ({
        path: "blockingRequirementIds",
        message: `${id} is fully supported by evidence.`,
      })),
      relatedIds: supportedBlockers,
    });
  }

  if (proposal.status === "ready" && proposal.blockingRequirementIds.length > 0) {
    return failure("INVALID_INPUT", "A ready proposal cannot list blocking requirements.", {
      issues: [
        {
          path: "blockingRequirementIds",
          message: "Remove all blocking IDs or choose a status that permits gaps.",
        },
      ],
      relatedIds: proposal.blockingRequirementIds,
    });
  }

  const currentBlockerIds = decisionBlockers(requirements).map((requirement) => requirement.id);
  if (proposal.status !== "ready") {
    const omittedBlockers = currentBlockerIds.filter(
      (id) => !proposal.blockingRequirementIds.includes(id),
    );
    if (omittedBlockers.length > 0) {
      return failure(
        "DECISION_BLOCKED",
        "The proposal must list every current hard requirement that is not fully supported.",
        {
          issues: omittedBlockers.map((id) => ({
            path: "blockingRequirementIds",
            message: `Add current hard blocker ${id}.`,
          })),
          relatedIds: omittedBlockers,
        },
      );
    }
  }

  return assertDecisionStatusAllowed(proposal.status, requirements);
}

/* Brief claim checking ---------------------------------------------------- */

const PROOF_TERMS = [
  "proven",
  "proves",
  "supported",
  "confirmed",
  "verified",
  "certified",
  "compliant",
  "satisfied",
  "guaranteed",
  "resolved",
  "covered",
  "in place",
  "meets",
];

const NEGATIONS = ["not", "no", "never", "cannot", "without", "lacks", "lacking", "missing"];

const GENERIC_TERMS = new Set([
  "and",
  "the",
  "with",
  "for",
  "from",
  "that",
  "this",
  "into",
  "inside",
  "per",
  "all",
  "type",
  "report",
  "period",
  "current",
  "month",
  "months",
  "twelve",
  "twenty",
  "requirement",
  "requirements",
  "platform",
  "campaign",
  "campaigns",
  "user",
  "users",
  "plan",
  "ii",
]);

/**
 * Terms that identify a requirement inside free text. Acronyms are taken from
 * the label itself so the list stays derived from data, not hand maintained.
 */
export function claimTerms(requirement: Requirement): string[] {
  const acronyms = [...requirement.label.matchAll(/\b[A-Z]{2,}\b/g)].map((match) =>
    match[0].toLowerCase(),
  );

  const words = requirement.label
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);

  return [...new Set([...acronyms, ...words])].filter((term) => !GENERIC_TERMS.has(term));
}

function sentences(text: string): string[] {
  return text
    .split(/[.!?;\n]+/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0);
}

function negatedNear(sentence: string, term: string): boolean {
  const index = sentence.indexOf(term);
  if (index < 0) {
    return false;
  }
  const before = sentence.slice(Math.max(0, index - 40), index);
  return NEGATIONS.some((negation) => new RegExp(`\\b${negation}\\b`).test(before));
}

export type BriefClaimConflict = {
  requirementId: string;
  requirementLabel: string;
  status: string;
  term: string;
  proofTerm: string;
};

/**
 * Finds sentences that assert proof for a requirement the evidence does not
 * support. A negated assertion such as "EU data residency is not confirmed" is
 * honest reporting and passes.
 */
export function briefClaimConflicts(
  text: string,
  requirements: readonly Requirement[],
): BriefClaimConflict[] {
  const conflicts: BriefClaimConflict[] = [];

  for (const sentence of sentences(text)) {
    const proofTerm = PROOF_TERMS.find(
      (term) => new RegExp(`\\b${term}\\b`).test(sentence) && !negatedNear(sentence, term),
    );

    if (!proofTerm) {
      continue;
    }

    for (const requirement of requirements) {
      if (requirement.status === "supported") {
        continue;
      }

      const term = claimTerms(requirement).find((candidate) =>
        new RegExp(`\\b${candidate}\\b`).test(sentence),
      );

      if (!term) {
        continue;
      }

      conflicts.push({
        requirementId: requirement.id,
        requirementLabel: requirement.label,
        status: requirement.status,
        term,
        proofTerm,
      });
    }
  }

  return conflicts;
}
