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
