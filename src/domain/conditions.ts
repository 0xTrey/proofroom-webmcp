/**
 * Hard-condition catalog.
 *
 * A requirement is proven condition by condition, not sentence by sentence.
 * Each condition carries an evaluation domain, and the domain decides which
 * evidence trust classes may ever prove it. Security and compliance conditions
 * cannot be proven by a testimonial, no matter how confident the testimonial is.
 */

export const CONDITION_DOMAINS = [
  "integration",
  "compliance",
  "security",
  "operational",
  "commercial",
] as const;

export type ConditionDomain = (typeof CONDITION_DOMAINS)[number];

export type ConditionDefinition = {
  id: string;
  label: string;
  domain: ConditionDomain;
  question: string;
};

export const CONDITION_CATALOG: readonly ConditionDefinition[] = [
  {
    id: "salesforce_bidirectional_sync",
    label: "Bidirectional Salesforce sync",
    domain: "integration",
    question: "Does the platform read and write campaign objects in Salesforce without a manual export?",
  },
  {
    id: "salesforce_field_mapping",
    label: "Configurable Salesforce field mapping",
    domain: "integration",
    question: "Can an administrator map campaign fields without vendor services work?",
  },
  {
    id: "eu_data_region_storage",
    label: "EU data region storage",
    domain: "compliance",
    question: "Is campaign data stored and processed inside an EU region?",
  },
  {
    id: "eu_subprocessor_disclosure",
    label: "EU subprocessor disclosure",
    domain: "compliance",
    question: "Are the EU subprocessors named with their processing locations?",
  },
  {
    id: "sso_saml_2_0",
    label: "SAML 2.0 single sign on",
    domain: "security",
    question: "Can the buyer federate access through SAML 2.0?",
  },
  {
    id: "sso_scim_provisioning",
    label: "SCIM user provisioning",
    domain: "security",
    question: "Can user accounts be provisioned and deprovisioned automatically?",
  },
  {
    id: "soc2_type_2_report",
    label: "SOC 2 Type II report",
    domain: "compliance",
    question: "Is a SOC 2 Type II report available to the buyer?",
  },
  {
    id: "soc2_current_period",
    label: "Current SOC 2 observation period",
    domain: "compliance",
    question: "Does the report cover a period that is still active?",
  },
  {
    id: "campaign_volume_20_per_month",
    label: "Twenty campaigns per month",
    domain: "operational",
    question: "Can one team run twenty campaigns per month on the platform?",
  },
  {
    id: "campaign_volume_concurrency",
    label: "Concurrent campaign execution",
    domain: "operational",
    question: "Can multiple campaigns run at the same time without throughput loss?",
  },
  {
    id: "payback_within_12_months",
    label: "Payback within twelve months",
    domain: "commercial",
    question: "Does the modelled payback land inside twelve months?",
  },
  {
    id: "implementation_within_60_days",
    label: "Implementation inside sixty days",
    domain: "commercial",
    question: "Can the platform be implemented inside sixty days?",
  },
];

const CONDITION_INDEX = new Map(CONDITION_CATALOG.map((condition) => [condition.id, condition]));

export const CONDITION_IDS: readonly string[] = CONDITION_CATALOG.map((condition) => condition.id);

export function findCondition(conditionId: string): ConditionDefinition | undefined {
  return CONDITION_INDEX.get(conditionId);
}

export function conditionLabel(conditionId: string): string {
  return CONDITION_INDEX.get(conditionId)?.label ?? conditionId;
}

/**
 * Domains where a testimonial can never act as proof. The buyer needs a document
 * from the vendor or an auditable artifact, not a customer opinion.
 */
const TESTIMONIAL_RESTRICTED_DOMAINS = new Set<ConditionDomain>(["security", "compliance"]);

export function isTestimonialRestricted(conditionId: string): boolean {
  const condition = CONDITION_INDEX.get(conditionId);
  if (!condition) {
    return true;
  }
  return TESTIMONIAL_RESTRICTED_DOMAINS.has(condition.domain);
}
