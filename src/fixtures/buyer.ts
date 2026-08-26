/**
 * Meridian Bank, the fictional buyer.
 *
 * Meridian Bank does not exist. The profile exists so the demo can show what a
 * buying committee brings to an evaluation. It is never used as authoritative
 * shared context until a person approves it in the page.
 */
import type { BuyerContext, BuyerProfile } from "../domain/types.ts";

export const MERIDIAN_BANK: BuyerProfile = {
  id: "meridian_bank",
  companyName: "Meridian Bank",
  industry: "Fintech and regulated banking",
  employeeBand: "1,000 to 1,500 employees",
  personas: ["Marketing operations lead", "CFO", "CISO", "Salesforce administrator"],
  priorities: [
    "Ship twenty campaigns per month without adding headcount",
    "Keep customer data inside an EU region",
    "Prove security and compliance posture to the risk committee",
    "Reach payback inside the first year",
  ],
  hardRequirements: [
    "Bidirectional Salesforce integration",
    "EU data residency",
    "SAML 2.0 single sign on",
    "A current SOC 2 Type II report",
  ],
  budgetCeiling: 120000,
  paybackTargetMonths: 12,
  fictionalDisclosure:
    "Meridian Bank is a fictional buyer created for this WebMCP demonstration. No real customer data appears here.",
};

/**
 * The context a browser agent would reasonably stage from the canonical prompt.
 * Fixtures never approve it. Approval is a visible human action.
 */
export const MERIDIAN_CONTEXT_DRAFT: BuyerContext = {
  companyName: MERIDIAN_BANK.companyName,
  industry: MERIDIAN_BANK.industry,
  employeeBand: MERIDIAN_BANK.employeeBand,
  personas: [...MERIDIAN_BANK.personas],
  priorities: [...MERIDIAN_BANK.priorities],
  hardRequirements: [...MERIDIAN_BANK.hardRequirements],
  budgetCeiling: MERIDIAN_BANK.budgetCeiling,
  paybackTargetMonths: MERIDIAN_BANK.paybackTargetMonths,
};
