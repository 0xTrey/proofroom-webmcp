/**
 * The six canonical requirements.
 *
 * The canonical room starts with every requirement `unknown` and no attached
 * evidence, because the evaluation has not happened yet. Status is always
 * derived from evidence, never authored here.
 */
import type { Requirement } from "../domain/types.ts";

export const CANONICAL_REQUIREMENTS: readonly Requirement[] = [
  {
    id: "req_salesforce",
    label: "Salesforce integration",
    description:
      "Campaign objects and members must move between Northstar and Salesforce without a manual export step.",
    priority: "must",
    nonNegotiable: false,
    hardConditions: ["salesforce_bidirectional_sync", "salesforce_field_mapping"],
    status: "unknown",
    attachedEvidenceIds: [],
    coveredConditions: [],
    gaps: [],
    rationale: "",
    buyerNotes: "",
    openQuestions: [],
  },
  {
    id: "req_eu_residency",
    label: "EU data residency",
    description:
      "Campaign and audience data must be stored and processed inside an EU region, with EU subprocessors named.",
    priority: "must",
    nonNegotiable: false,
    hardConditions: ["eu_data_region_storage", "eu_subprocessor_disclosure"],
    status: "unknown",
    attachedEvidenceIds: [],
    coveredConditions: [],
    gaps: [],
    rationale: "",
    buyerNotes: "",
    openQuestions: [],
  },
  {
    id: "req_sso",
    label: "SSO and provisioning",
    description:
      "Access must federate through SAML 2.0, and accounts must be provisioned and deprovisioned automatically.",
    priority: "must",
    nonNegotiable: false,
    hardConditions: ["sso_saml_2_0", "sso_scim_provisioning"],
    status: "unknown",
    attachedEvidenceIds: [],
    coveredConditions: [],
    gaps: [],
    rationale: "",
    buyerNotes: "",
    openQuestions: [],
  },
  {
    id: "req_soc2",
    label: "SOC 2 Type II attestation",
    description:
      "The risk committee needs a SOC 2 Type II report covering an observation period that is still current.",
    priority: "must",
    nonNegotiable: false,
    hardConditions: ["soc2_type_2_report", "soc2_current_period"],
    status: "unknown",
    attachedEvidenceIds: [],
    coveredConditions: [],
    gaps: [],
    rationale: "",
    buyerNotes: "",
    openQuestions: [],
  },
  {
    id: "req_campaign_volume",
    label: "Twenty campaigns per month",
    description:
      "One operations team must be able to run twenty campaigns per month, including concurrent execution.",
    priority: "should",
    nonNegotiable: false,
    hardConditions: ["campaign_volume_20_per_month", "campaign_volume_concurrency"],
    status: "unknown",
    attachedEvidenceIds: [],
    coveredConditions: [],
    gaps: [],
    rationale: "",
    buyerNotes: "",
    openQuestions: [],
  },
  {
    id: "req_payback",
    label: "Payback inside twelve months",
    description:
      "The modelled payback must land inside twelve months, and implementation must complete inside sixty days.",
    priority: "should",
    nonNegotiable: false,
    hardConditions: ["payback_within_12_months", "implementation_within_60_days"],
    status: "unknown",
    attachedEvidenceIds: [],
    coveredConditions: [],
    gaps: [],
    rationale: "",
    buyerNotes: "",
    openQuestions: [],
  },
];

export const CANONICAL_REQUIREMENT_COUNT = 6;
