import type { Requirement } from "../../domain/types.ts";

export const CANONICAL_REVIEW_SET: ReadonlyArray<{
  requirementId: string;
  evidenceIds: readonly string[];
}> = [
  { requirementId: "req_salesforce", evidenceIds: ["ev_002", "ev_003"] },
  { requirementId: "req_eu_residency", evidenceIds: ["ev_007", "ev_008"] },
  { requirementId: "req_sso", evidenceIds: ["ev_006"] },
  { requirementId: "req_soc2", evidenceIds: ["ev_004"] },
  { requirementId: "req_campaign_volume", evidenceIds: ["ev_009"] },
  { requirementId: "req_payback", evidenceIds: ["ev_010"] },
];

const CANONICAL_REVIEW_STATUSES: Readonly<Record<string, Requirement["status"]>> = {
  req_salesforce: "supported",
  req_eu_residency: "unknown",
  req_sso: "partially_supported",
  req_soc2: "supported",
  req_campaign_volume: "supported",
  req_payback: "partially_supported",
};

export function hasCanonicalReviewSet(requirements: readonly Requirement[]): boolean {
  if (requirements.length !== CANONICAL_REVIEW_SET.length) {
    return false;
  }

  return CANONICAL_REVIEW_SET.every((attachment) => {
    const requirement = requirements.find((entry) => entry.id === attachment.requirementId);
    if (
      !requirement ||
      requirement.status !== CANONICAL_REVIEW_STATUSES[attachment.requirementId]
    ) {
      return false;
    }
    return attachment.evidenceIds.every((evidenceId) =>
      requirement.attachedEvidenceIds.includes(evidenceId),
    );
  });
}
