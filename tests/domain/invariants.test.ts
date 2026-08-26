import { describe, expect, it } from "vitest";
import { inputDigest, stableStringify } from "../../src/domain/hash.ts";
import {
  assertDecisionProposalConsistent,
  assertDecisionStatusAllowed,
  assertProposalApprovable,
  briefClaimConflicts,
  claimTerms,
  decisionBlockers,
  proposalExpiry,
  PROPOSAL_TTL_MS,
} from "../../src/domain/invariants.ts";
import type {
  BuyerContextProposal,
  DecisionPayload,
  Requirement,
} from "../../src/domain/types.ts";
import { MERIDIAN_CONTEXT_DRAFT } from "../../src/fixtures/buyer.ts";
import { canonicalRoom, FIXED_NOW } from "../support/room.ts";

const room = canonicalRoom();

function proposal(overrides: Partial<BuyerContextProposal> = {}): BuyerContextProposal {
  return {
    id: "pcx_0001",
    type: "buyer_context",
    baseRevision: 1,
    inputDigest: inputDigest(MERIDIAN_CONTEXT_DRAFT),
    createdBy: "webmcp",
    createdAt: FIXED_NOW,
    expiresAt: proposalExpiry(FIXED_NOW),
    status: "pending",
    payload: MERIDIAN_CONTEXT_DRAFT,
    ...overrides,
  };
}

describe("input digest", () => {
  it("is stable across key order", () => {
    expect(inputDigest({ a: 1, b: [2, 3] })).toBe(inputDigest({ b: [2, 3], a: 1 }));
  });

  it("changes when a value changes", () => {
    expect(inputDigest({ budgetCeiling: 120000 })).not.toBe(inputDigest({ budgetCeiling: 90000 }));
  });

  it("ignores undefined members and keeps array order significant", () => {
    expect(stableStringify({ a: undefined, b: 1 })).toBe('{"b":1}');
    expect(inputDigest([1, 2])).not.toBe(inputDigest([2, 1]));
  });

  it("produces a short hexadecimal fingerprint", () => {
    expect(inputDigest(MERIDIAN_CONTEXT_DRAFT)).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("proposal approval guard", () => {
  it("accepts a pending, unexpired proposal at the matching revision", () => {
    const result = assertProposalApprovable(proposal(), 1, FIXED_NOW, "pcx_0001");
    expect(result.ok).toBe(true);
  });

  it("rejects a missing proposal", () => {
    const result = assertProposalApprovable(null, 1, FIXED_NOW, "pcx_0001");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error.code).toBe("NOT_FOUND");
  });

  it("rejects a mismatched proposal ID", () => {
    const result = assertProposalApprovable(proposal(), 1, FIXED_NOW, "pcx_9999");
    expect(result.ok === false && result.error.code).toBe("NOT_FOUND");
  });

  it("rejects an already resolved proposal", () => {
    const result = assertProposalApprovable(
      proposal({ status: "approved" }),
      1,
      FIXED_NOW,
      "pcx_0001",
    );
    expect(result.ok === false && result.error.code).toBe("PROPOSAL_RESOLVED");
  });

  it("rejects an expired proposal", () => {
    const later = new Date(Date.parse(FIXED_NOW) + PROPOSAL_TTL_MS + 1000).toISOString();
    const result = assertProposalApprovable(proposal(), 1, later, "pcx_0001");
    expect(result.ok === false && result.error.code).toBe("PROPOSAL_EXPIRED");
  });

  it("rejects a stale proposal after the room moved on", () => {
    const result = assertProposalApprovable(proposal(), 4, FIXED_NOW, "pcx_0001");
    expect(result.ok === false && result.error.code).toBe("PROPOSAL_STALE");
  });

  it("rejects a payload that no longer matches its digest", () => {
    const tampered = proposal({
      payload: { ...MERIDIAN_CONTEXT_DRAFT, budgetCeiling: 1 },
    });
    const result = assertProposalApprovable(tampered, 1, FIXED_NOW, "pcx_0001");
    expect(result.ok === false && result.error.code).toBe("INVALID_INPUT");
  });
});

describe("decision blocking", () => {
  const requirements = (): Requirement[] => room.requirements.map((entry) => ({ ...entry }));

  it("blocks a ready decision while a must requirement is unknown", () => {
    const result = assertDecisionStatusAllowed("ready", requirements());
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error.code).toBe("DECISION_BLOCKED");
    expect(result.ok === false && result.error.relatedIds).toContain("req_eu_residency");
  });

  it("blocks a ready decision while a must requirement is partially supported", () => {
    const list = requirements().map((entry) => ({
      ...entry,
      status:
        entry.id === "req_sso"
          ? ("partially_supported" as const)
          : entry.priority === "must"
            ? ("supported" as const)
            : entry.status,
    }));
    const result = assertDecisionStatusAllowed("ready", list);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error.code).toBe("DECISION_BLOCKED");
    expect(result.ok === false && result.error.relatedIds).toEqual(["req_sso"]);
  });

  it("allows a not_ready decision while requirements are open", () => {
    expect(assertDecisionStatusAllowed("not_ready", requirements()).ok).toBe(true);
    expect(assertDecisionStatusAllowed("ready_with_conditions", requirements()).ok).toBe(true);
  });

  it("treats a non negotiable should requirement as a blocker", () => {
    const list = requirements().map((entry) =>
      entry.id === "req_payback" ? { ...entry, nonNegotiable: true } : entry,
    );
    expect(decisionBlockers(list).map((entry) => entry.id)).toContain("req_payback");
  });

  it("allows ready when every hard requirement is proven", () => {
    const list = requirements().map((entry) =>
      entry.priority === "must" ? { ...entry, status: "supported" as const } : entry,
    );
    expect(assertDecisionStatusAllowed("ready", list).ok).toBe(true);
  });
});

describe("decision proposal consistency", () => {
  const requirements = (): Requirement[] => room.requirements.map((entry) => ({ ...entry }));
  const hardIds = requirements()
    .filter((entry) => entry.priority === "must" || entry.nonNegotiable)
    .map((entry) => entry.id);

  function payload(overrides: Partial<DecisionPayload> = {}): DecisionPayload {
    return {
      status: "not_ready",
      rationale: "Current hard requirements are not fully supported.",
      supportingRequirementIds: [],
      blockingRequirementIds: hardIds,
      risks: [],
      nextStep: "Resolve every hard evidence gap.",
      ...overrides,
    };
  }

  it("requires unique IDs within both requirement lists", () => {
    const duplicateSupporting = assertDecisionProposalConsistent(
      payload({ supportingRequirementIds: ["req_payback", "req_payback"] }),
      requirements(),
    );
    const duplicateBlocking = assertDecisionProposalConsistent(
      payload({ blockingRequirementIds: [...hardIds, "req_salesforce"] }),
      requirements(),
    );

    expect(duplicateSupporting.ok === false && duplicateSupporting.error.code).toBe(
      "INVALID_INPUT",
    );
    expect(duplicateBlocking.ok === false && duplicateBlocking.error.code).toBe("INVALID_INPUT");
  });

  it("requires supporting and blocking requirement lists to be disjoint", () => {
    const result = assertDecisionProposalConsistent(
      payload({ supportingRequirementIds: ["req_salesforce"] }),
      requirements(),
    );

    expect(result.ok === false && result.error.code).toBe("INVALID_INPUT");
    expect(result.ok === false && result.error.relatedIds).toEqual(["req_salesforce"]);
  });

  it("rejects a supported requirement listed as blocking", () => {
    const list = requirements().map((entry) =>
      entry.id === "req_salesforce" ? { ...entry, status: "supported" as const } : entry,
    );
    const result = assertDecisionProposalConsistent(payload(), list);

    expect(result.ok === false && result.error.code).toBe("INVALID_INPUT");
    expect(result.ok === false && result.error.relatedIds).toEqual(["req_salesforce"]);
  });

  it("requires conditional and not ready proposals to list every current hard blocker", () => {
    const result = assertDecisionProposalConsistent(
      payload({ status: "ready_with_conditions", blockingRequirementIds: hardIds.slice(1) }),
      requirements(),
    );

    expect(result.ok === false && result.error.code).toBe("DECISION_BLOCKED");
    expect(result.ok === false && result.error.relatedIds).toEqual(["req_salesforce"]);
  });

  it("requires a ready proposal to have no blocking IDs and no current hard blockers", () => {
    const fullySupported = requirements().map((entry) =>
      entry.priority === "must" || entry.nonNegotiable
        ? { ...entry, status: "supported" as const }
        : entry,
    );
    const listedBlocker = assertDecisionProposalConsistent(
      payload({
        status: "ready",
        blockingRequirementIds: ["req_campaign_volume"],
      }),
      fullySupported,
    );
    const currentBlocker = assertDecisionProposalConsistent(
      payload({ status: "ready", blockingRequirementIds: [] }),
      requirements(),
    );

    expect(listedBlocker.ok === false && listedBlocker.error.code).toBe("INVALID_INPUT");
    expect(currentBlocker.ok === false && currentBlocker.error.code).toBe("DECISION_BLOCKED");
  });
});

describe("brief claim checking", () => {
  const requirements = room.requirements.map((entry) => ({ ...entry }));

  it("derives claim terms including acronyms from the label", () => {
    const euRequirement = requirements.find((entry) => entry.id === "req_eu_residency");
    expect(claimTerms(euRequirement!)).toContain("eu");
    expect(claimTerms(euRequirement!)).toContain("residency");
  });

  it("flags a sentence that claims an unproven requirement is confirmed", () => {
    const conflicts = briefClaimConflicts(
      "EU data residency is confirmed for this deployment.",
      requirements,
    );
    expect(conflicts.map((conflict) => conflict.requirementId)).toContain("req_eu_residency");
  });

  it("accepts an honest negative statement", () => {
    const conflicts = briefClaimConflicts(
      "EU data residency is not confirmed and remains an open gap. The hosting note lists North American regions only.",
      requirements,
    );
    expect(conflicts).toHaveLength(0);
  });

  it("accepts a claim about a requirement that is actually supported", () => {
    const supported = requirements.map((entry) =>
      entry.id === "req_salesforce" ? { ...entry, status: "supported" as const } : entry,
    );
    const conflicts = briefClaimConflicts(
      "Salesforce integration is verified by the integration guide.",
      supported,
    );
    expect(conflicts).toHaveLength(0);
  });
});
