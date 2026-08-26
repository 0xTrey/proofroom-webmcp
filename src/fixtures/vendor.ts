/**
 * Northstar, the fictional vendor.
 *
 * Northstar does not exist. Every capability, price, and implementation claim
 * here is demo content written for this evaluation exercise. Nothing in this
 * file describes a real company or a real product.
 */
import type { VendorProfile } from "../domain/types.ts";

export const NORTHSTAR: VendorProfile = {
  id: "northstar",
  name: "Northstar",
  category: "Campaign operations platform",
  headline: "Run regulated marketing campaigns without rebuilding the workflow every quarter.",
  primaryValue:
    "Northstar centralizes campaign briefs, approvals, and audience handoffs so an operations team can ship more campaigns with the same headcount.",
  fictionalDisclosure:
    "Northstar is a fictional vendor created for this WebMCP demonstration. No real company data appears here.",
  capabilities: [
    {
      id: "cap_campaign_workspace",
      label: "Campaign workspace",
      summary:
        "One workspace holds the brief, the approval trail, the audience definition, and the launch checklist for each campaign.",
      coverage: ["req_campaign_volume"],
    },
    {
      id: "cap_review_routing",
      label: "Compliance review routing",
      summary:
        "Campaigns route to named reviewers with a recorded decision, so a regulated team can show who approved which asset.",
      coverage: ["req_campaign_volume"],
    },
    {
      id: "cap_salesforce_bridge",
      label: "Salesforce bridge",
      summary:
        "A managed package reads and writes campaign objects and members, with administrator controlled field mapping.",
      coverage: ["req_salesforce"],
    },
    {
      id: "cap_access_control",
      label: "Access control",
      summary:
        "Role based permissions with SAML 2.0 federation for every paid tier, plus per workspace audit history.",
      coverage: ["req_sso"],
    },
    {
      id: "cap_hosting",
      label: "Hosting and data handling",
      summary:
        "Campaign data is stored in the vendor managed cloud with documented retention windows and export on request.",
      coverage: ["req_eu_residency"],
    },
  ],
  packaging: [
    {
      id: "pkg_team",
      name: "Team",
      annualListPrice: 42000,
      seatBand: "Up to 25 operators",
      includes: [
        "Campaign workspace and review routing",
        "Standard Salesforce field mapping",
        "Email support with a next business day target",
      ],
    },
    {
      id: "pkg_enterprise",
      name: "Enterprise",
      annualListPrice: 96000,
      seatBand: "Up to 150 operators",
      includes: [
        "Everything in Team",
        "SAML 2.0 single sign on and audit history export",
        "Custom Salesforce object mapping",
        "Named implementation lead",
      ],
    },
  ],
  implementation: {
    summary:
      "A standard Enterprise implementation runs in five phases with a shared checklist and a named implementation lead.",
    typicalDays: 45,
    milestones: [
      "Kickoff and workspace configuration",
      "Salesforce sandbox connection and field mapping",
      "Reviewer roles, routing rules, and access federation",
      "Two pilot campaigns with the operations team",
      "Production cutover and handover",
    ],
  },
};
