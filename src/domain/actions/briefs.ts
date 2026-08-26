/**
 * Stakeholder brief actions.
 *
 * A brief is synthesis, not proof. If the text asserts that an unproven
 * requirement is proven, the action fails and the room does not change.
 */
import { failure } from "../errors.ts";
import { isEvidenceActive } from "../evidence.ts";
import { briefClaimConflicts } from "../invariants.ts";
import type { RoomState, StakeholderBrief } from "../types.ts";
import { saveStakeholderBriefInputSchema } from "./inputs.ts";
import { defineAction, outcome } from "./runtime.ts";

export type BriefSaved = {
  role: StakeholderBrief["role"];
  revision: number;
  savedAtRevision: number;
  warnings: string[];
  nextAction: string;
};

export const saveStakeholderBriefAction = defineAction({
  action: "save_stakeholder_brief",
  toolName: "save_stakeholder_brief",
  panel: "briefs",
  mutating: true,
  schema: saveStakeholderBriefInputSchema,
  run: (state, input, context) => {
    const unknownEvidence = input.evidenceIds.filter(
      (evidenceId) => !state.evidenceCatalog.some((record) => record.id === evidenceId),
    );

    if (unknownEvidence.length > 0) {
      return failure("NOT_FOUND", "The brief cites evidence that is not in the catalog.", {
        issues: unknownEvidence.map((evidenceId) => ({
          path: "evidenceIds",
          message: `Unknown evidence ID ${evidenceId}.`,
        })),
        relatedIds: unknownEvidence,
      });
    }

    const conflicts = briefClaimConflicts(
      `${input.summary} ${input.nextStep}`,
      state.requirements,
    );

    if (conflicts.length > 0) {
      return failure(
        "EVIDENCE_INSUFFICIENT",
        `The brief states that ${conflicts[0]?.requirementLabel} is ${conflicts[0]?.proofTerm}, but its evidence status is ${conflicts[0]?.status}.`,
        {
          issues: conflicts.slice(0, 4).map((conflict) => ({
            path: "summary",
            message: `${conflict.requirementLabel} is ${conflict.status}. Remove the word "${conflict.proofTerm}" or describe the gap.`,
          })),
          relatedIds: [...new Set(conflicts.map((conflict) => conflict.requirementId))],
        },
      );
    }

    const warnings: string[] = [];

    for (const evidenceId of input.evidenceIds) {
      const record = state.evidenceCatalog.find((entry) => entry.id === evidenceId);
      if (record && !isEvidenceActive(record, context.nowIso)) {
        warnings.push(`${evidenceId} is not active and weakens the brief.`);
      }
      if (record?.untrustedContent) {
        warnings.push(`${evidenceId} carries untrusted content and is cited as an opinion only.`);
      }
    }

    const blocked = state.requirements.filter(
      (requirement) =>
        (requirement.priority === "must" || requirement.nonNegotiable) &&
        requirement.status !== "supported",
    );

    for (const requirement of blocked) {
      if (!input.risks.some((risk) => risk.toLowerCase().includes(requirement.label.toLowerCase()))) {
        warnings.push(`${requirement.label} is ${requirement.status} and is not listed as a risk.`);
      }
    }

    const brief: StakeholderBrief = {
      role: input.role,
      summary: input.summary,
      evidenceIds: [...input.evidenceIds],
      risks: [...input.risks],
      openQuestions: [...input.openQuestions],
      nextStep: input.nextStep,
      savedAt: context.nowIso,
      savedAtRevision: context.nextRevision,
      savedBy: context.origin,
      warnings: warnings.slice(0, 8),
    };

    const value: BriefSaved = {
      role: brief.role,
      revision: context.nextRevision,
      savedAtRevision: context.nextRevision,
      warnings: brief.warnings,
      nextAction:
        brief.role === "cfo"
          ? "Save the CISO brief, then propose a decision status."
          : "Propose a decision status once both briefs exist.",
    };

    return outcome({
      value,
      patch: (current: RoomState) => ({
        ...current,
        stakeholderBriefs: { ...current.stakeholderBriefs, [brief.role]: brief },
      }),
      affectedIds: [`brief_${brief.role}`, ...brief.evidenceIds],
      inputSummary: `Saved the ${brief.role} brief with ${brief.evidenceIds.length} citations and ${brief.warnings.length} warnings.`,
    });
  },
});
