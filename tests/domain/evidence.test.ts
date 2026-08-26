import { describe, expect, it } from "vitest";
import {
  deriveRequirement,
  evaluateRequirement,
  evidenceEligibility,
  isEvidenceActive,
} from "../../src/domain/evidence.ts";
import type { Requirement } from "../../src/domain/types.ts";
import { canonicalRoom, FIXED_NOW } from "../support/room.ts";

const room = canonicalRoom();

function requirement(id: string): Requirement {
  const found = room.requirements.find((entry) => entry.id === id);
  if (!found) {
    throw new Error(`Missing fixture requirement ${id}`);
  }
  return { ...found };
}

function withEvidence(id: string, evidenceIds: string[]): Requirement {
  return deriveRequirement(
    { ...requirement(id), attachedEvidenceIds: evidenceIds },
    room.evidenceCatalog,
    FIXED_NOW,
  );
}

describe("evidence activity", () => {
  it("treats an expired record as inactive", () => {
    const expired = room.evidenceCatalog.find((record) => record.id === "ev_005");
    expect(expired).toBeDefined();
    expect(isEvidenceActive(expired!, FIXED_NOW)).toBe(false);
  });

  it("treats a current record as active", () => {
    const current = room.evidenceCatalog.find((record) => record.id === "ev_004");
    expect(isEvidenceActive(current!, FIXED_NOW)).toBe(true);
  });

  it("treats a record that is not effective yet as inactive", () => {
    const record = room.evidenceCatalog.find((entry) => entry.id === "ev_008");
    expect(isEvidenceActive(record!, "2026-01-01T00:00:00.000Z")).toBe(false);
    expect(
      evidenceEligibility("ev_008", requirement("req_eu_residency"), room.evidenceCatalog, "2026-01-01T00:00:00.000Z")
        .reasons,
    ).toContain("not_yet_effective");
  });
});

describe("requirement status rules", () => {
  it("marks a requirement supported when every hard condition is covered", () => {
    const result = withEvidence("req_salesforce", ["ev_002", "ev_003"]);
    expect(result.status).toBe("supported");
    expect(result.gaps).toHaveLength(0);
    expect(result.coveredConditions).toEqual([
      "salesforce_bidirectional_sync",
      "salesforce_field_mapping",
    ]);
  });

  it("marks a requirement partially supported and names the gap", () => {
    const result = withEvidence("req_sso", ["ev_006"]);
    expect(result.status).toBe("partially_supported");
    expect(result.coveredConditions).toEqual(["sso_saml_2_0"]);
    expect(result.gaps).toEqual(["sso_scim_provisioning"]);
    expect(result.rationale).toContain("1 of 2");
  });

  it("keeps EU data residency unknown even with every related record attached", () => {
    const result = withEvidence("req_eu_residency", ["ev_007", "ev_008"]);
    expect(result.status).toBe("unknown");
    expect(result.coveredConditions).toHaveLength(0);
    expect(result.gaps).toEqual(["eu_data_region_storage", "eu_subprocessor_disclosure"]);
  });

  it("refuses to let a testimonial prove a security or compliance condition", () => {
    const soc2 = withEvidence("req_soc2", ["ev_011"]);
    expect(soc2.status).toBe("unknown");

    const eligibility = evidenceEligibility(
      "ev_011",
      requirement("req_soc2"),
      room.evidenceCatalog,
      FIXED_NOW,
    );
    expect(eligibility.reasons).toContain("testimonial_restricted");
    expect(eligibility.eligibleConditions).toHaveLength(0);
  });

  it("lets a testimonial support an operational condition", () => {
    const eligibility = evidenceEligibility(
      "ev_011",
      requirement("req_campaign_volume"),
      room.evidenceCatalog,
      FIXED_NOW,
    );
    expect(eligibility.eligibleConditions).toEqual(["campaign_volume_20_per_month"]);
  });

  it("ignores expired evidence when computing coverage", () => {
    const result = withEvidence("req_soc2", ["ev_005"]);
    expect(result.status).toBe("unknown");
    expect(withEvidence("req_soc2", ["ev_004"]).status).toBe("supported");
  });

  it("marks a requirement unsupported when records contradict each other", () => {
    const result = withEvidence("req_campaign_volume", ["ev_009", "ev_012"]);
    expect(result.status).toBe("unsupported");
    expect(result.rationale.toLowerCase()).toContain("contradictory");
  });

  it("reports the contradiction pair and the refuted condition", () => {
    const evaluation = evaluateRequirement(
      requirement("req_campaign_volume"),
      ["ev_009", "ev_012"],
      room.evidenceCatalog,
      FIXED_NOW,
    );

    expect(evaluation.proposedStatus).toBe("unsupported");
    expect(evaluation.contradictions.length).toBeGreaterThanOrEqual(2);
    expect(evaluation.contradictions.some((entry) => entry.evidenceIds.length === 2)).toBe(true);
    expect(
      evaluation.contradictions.some((entry) => entry.conditionId === "campaign_volume_concurrency"),
    ).toBe(true);
  });

  it("stays unknown when a record is unrelated to the requirement", () => {
    const result = withEvidence("req_eu_residency", ["ev_001"]);
    expect(result.status).toBe("unknown");
    const eligibility = evidenceEligibility(
      "ev_001",
      requirement("req_eu_residency"),
      room.evidenceCatalog,
      FIXED_NOW,
    );
    expect(eligibility.reasons).toContain("unrelated_to_requirement");
  });

  it("reports an unknown evidence ID instead of failing", () => {
    const eligibility = evidenceEligibility(
      "ev_999",
      requirement("req_sso"),
      room.evidenceCatalog,
      FIXED_NOW,
    );
    expect(eligibility.inCatalog).toBe(false);
    expect(eligibility.reasons).toEqual(["not_in_catalog"]);
  });

  it("is deterministic for the same inputs", () => {
    const first = evaluateRequirement(
      requirement("req_salesforce"),
      ["ev_003", "ev_002"],
      room.evidenceCatalog,
      FIXED_NOW,
    );
    const second = evaluateRequirement(
      requirement("req_salesforce"),
      ["ev_003", "ev_002"],
      room.evidenceCatalog,
      FIXED_NOW,
    );
    expect(first).toEqual(second);
  });
});
