import { describe, expect, it } from "vitest";
import { CONDITION_IDS } from "../../src/domain/conditions.ts";
import { evidenceRecordSchema, requirementSchema, roomStateSchema } from "../../src/domain/schemas.ts";
import { CANONICAL_EVIDENCE, CANONICAL_EVIDENCE_COUNT } from "../../src/fixtures/evidence.ts";
import {
  CANONICAL_REQUIREMENTS,
  CANONICAL_REQUIREMENT_COUNT,
} from "../../src/fixtures/requirements.ts";
import { canonicalRoom, FIXED_NOW } from "../support/room.ts";

describe("canonical fixtures", () => {
  it("contains exactly six requirements and twelve evidence records", () => {
    expect(CANONICAL_REQUIREMENTS).toHaveLength(CANONICAL_REQUIREMENT_COUNT);
    expect(CANONICAL_EVIDENCE).toHaveLength(CANONICAL_EVIDENCE_COUNT);
    expect(new Set(CANONICAL_EVIDENCE.map((record) => record.id)).size).toBe(
      CANONICAL_EVIDENCE_COUNT,
    );
    expect(new Set(CANONICAL_REQUIREMENTS.map((entry) => entry.id)).size).toBe(
      CANONICAL_REQUIREMENT_COUNT,
    );
  });

  it("validates every record and requirement against the strict schemas", () => {
    for (const record of CANONICAL_EVIDENCE) {
      expect(evidenceRecordSchema.safeParse(record).success).toBe(true);
    }
    for (const requirement of CANONICAL_REQUIREMENTS) {
      expect(requirementSchema.safeParse(requirement).success).toBe(true);
    }
    expect(roomStateSchema.safeParse(canonicalRoom()).success).toBe(true);
  });

  it("references only known conditions and known requirement IDs", () => {
    const requirementIds = new Set(CANONICAL_REQUIREMENTS.map((entry) => entry.id));
    const evidenceIds = new Set(CANONICAL_EVIDENCE.map((record) => record.id));

    for (const requirement of CANONICAL_REQUIREMENTS) {
      for (const conditionId of requirement.hardConditions) {
        expect(CONDITION_IDS).toContain(conditionId);
      }
    }

    for (const record of CANONICAL_EVIDENCE) {
      for (const requirementId of record.coverage) {
        expect(requirementIds.has(requirementId)).toBe(true);
      }
      for (const conditionId of [...record.supportedClaims, ...record.refutedClaims]) {
        expect(CONDITION_IDS).toContain(conditionId);
      }
      for (const contradicted of record.contradicts) {
        expect(evidenceIds.has(contradicted)).toBe(true);
      }
    }
  });

  it("labels every entity as fictional demo content", () => {
    const room = canonicalRoom();
    expect(room.vendor.fictionalDisclosure.toLowerCase()).toContain("fictional");
    expect(room.canonicalBuyer.fictionalDisclosure.toLowerCase()).toContain("fictional");
  });

  it("starts every requirement unknown with no attached evidence", () => {
    const room = canonicalRoom();
    for (const requirement of room.requirements) {
      expect(requirement.status).toBe("unknown");
      expect(requirement.attachedEvidenceIds).toHaveLength(0);
    }
  });

  it("cannot prove EU data residency with the whole catalog", () => {
    const room = canonicalRoom();
    const euConditions = room.requirements.find((entry) => entry.id === "req_eu_residency")
      ?.hardConditions;

    expect(euConditions).toBeDefined();

    const provable = room.evidenceCatalog.filter((record) =>
      record.supportedClaims.some((conditionId) => euConditions?.includes(conditionId)),
    );

    expect(provable).toHaveLength(0);
  });

  it("marks exactly two records as untrusted content", () => {
    const untrusted = CANONICAL_EVIDENCE.filter((record) => record.untrustedContent);
    expect(untrusted.map((record) => record.id)).toEqual(["ev_011", "ev_012"]);
  });

  it("keeps the canonical room at revision zero with one system event", () => {
    const room = canonicalRoom(FIXED_NOW);
    expect(room.revision).toBe(0);
    expect(room.activityLedger).toHaveLength(1);
    expect(room.activityLedger[0]?.origin).toBe("system");
    expect(room.activityLedger[0]?.mutating).toBe(false);
    expect(room.activityLedger[0]?.createdAt).toBe(FIXED_NOW);
  });
});
