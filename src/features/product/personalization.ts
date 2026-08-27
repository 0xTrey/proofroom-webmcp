import type {
  BuyerContext,
  Capability,
  EvidenceRecord,
  PackagingTier,
  RoomState,
} from "../../domain/types.ts";

type PrioritizedCapability = {
  capability: Capability;
  reason: string | null;
};

type PrioritizedEvidence = {
  record: EvidenceRecord;
  relationship: string | null;
  unresolved: boolean;
};

type PrioritizedPackage = {
  tier: PackagingTier;
  candidate: boolean;
  reason: string | null;
};

const BASELINE_EVIDENCE_IDS = ["ev_002", "ev_004", "ev_007"] as const;

const REQUIREMENT_MATCHES = [
  {
    test: (text: string) => text.includes("salesforce"),
    capabilityIds: ["cap_salesforce_bridge"],
    evidenceId: "ev_002",
  },
  {
    test: (text: string) => text.includes("eu data residency") || text.includes("eu region"),
    capabilityIds: ["cap_hosting"],
    evidenceId: "ev_007",
  },
  {
    test: (text: string) =>
      text.includes("saml") || text.includes("single sign on") || text.includes("single sign-on"),
    capabilityIds: ["cap_access_control"],
    evidenceId: "ev_006",
  },
  {
    test: (text: string) => text.includes("soc 2"),
    capabilityIds: [],
    evidenceId: "ev_004",
  },
] as const;

function normalized(values: readonly string[]): string {
  return values.join(" ").toLowerCase();
}

function matchingRequirement(
  context: BuyerContext,
  test: (text: string) => boolean,
): string | null {
  return context.hardRequirements.find((requirement) => test(requirement.toLowerCase())) ?? null;
}

function capabilityPriority(
  context: BuyerContext,
  capability: Capability,
): { reason: string | null; rank: number } {
  for (const [index, match] of REQUIREMENT_MATCHES.entries()) {
    if (match.capabilityIds.some((id) => id === capability.id)) {
      const requirement = matchingRequirement(context, match.test);
      if (requirement) {
        return {
          reason: `Prioritized because buyer-approved context names ${requirement}.`,
          rank: index,
        };
      }
    }
  }

  if (
    capability.coverage.includes("req_campaign_volume") &&
    normalized(context.priorities).includes("campaign")
  ) {
    return {
      reason: `Prioritized because buyer-approved context leads with ${context.priorities[0]}.`,
      rank: REQUIREMENT_MATCHES.length,
    };
  }

  return { reason: null, rank: Number.MAX_SAFE_INTEGER };
}

export function prioritizedCapabilities(room: RoomState): PrioritizedCapability[] {
  const context = room.approvedBuyerContext;
  const baseline = room.vendor.capabilities.map((capability) => ({ capability, reason: null }));
  if (!context) {
    return baseline;
  }

  return room.vendor.capabilities
    .map((capability, index) => {
      const priority = capabilityPriority(context, capability);
      return {
        capability,
        index,
        reason: priority.reason,
        rank: priority.rank,
      };
    })
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map(({ capability, reason }) => ({ capability, reason }));
}

export function prioritizedEvidence(room: RoomState): PrioritizedEvidence[] {
  const context = room.approvedBuyerContext;
  if (!context) {
    return BASELINE_EVIDENCE_IDS.map((id) => room.evidenceCatalog.find((record) => record.id === id))
      .filter((record): record is EvidenceRecord => record !== undefined)
      .map((record) => ({ record, relationship: null, unresolved: false }));
  }

  const prioritized: PrioritizedEvidence[] = [];
  for (const match of REQUIREMENT_MATCHES) {
    const relationship = matchingRequirement(context, match.test);
    const record = room.evidenceCatalog.find((entry) => entry.id === match.evidenceId);
    if (relationship && record) {
      prioritized.push({
        record,
        relationship,
        unresolved: record.coverage.includes("req_eu_residency"),
      });
    }
  }
  return prioritized;
}

function packageScore(tier: PackagingTier, context: BuyerContext): number {
  const included = normalized(tier.includes);
  const requirements = normalized(context.hardRequirements);
  let score = tier.annualListPrice <= context.budgetCeiling ? 2 : 0;
  if (requirements.includes("salesforce") && included.includes("salesforce")) {
    score += 3;
  }
  if (
    (requirements.includes("saml") || requirements.includes("single sign on")) &&
    included.includes("saml")
  ) {
    score += 5;
  }
  return score;
}

export function prioritizedPackages(room: RoomState): PrioritizedPackage[] {
  const context = room.approvedBuyerContext;
  if (!context) {
    return room.vendor.packaging.map((tier) => ({ tier, candidate: false, reason: null }));
  }

  return room.vendor.packaging
    .map((tier, index) => ({ tier, index, score: packageScore(tier, context) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ tier }) => {
      const candidate =
        tier.id === "pkg_enterprise" &&
        tier.annualListPrice <= context.budgetCeiling &&
        normalized(tier.includes).includes("saml");
      return {
        tier,
        candidate,
        reason: candidate
          ? `Evaluation candidate: includes SAML and lists below the buyer-approved ${formatUsd(
              context.budgetCeiling,
            )} ceiling. This is not an approval or evidence-backed recommendation.`
          : null,
      };
    });
}

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
