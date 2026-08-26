/**
 * Action input schemas.
 *
 * These are the single source of truth for both UI action input and WebMCP tool
 * input. `src/webmcp/toolSchemas.ts` re-exports them, so a tool can never accept
 * something the domain action would reject.
 */
import { z } from "zod";
import {
  LIMITS,
  buyerContextSchema,
  decisionPayloadSchema,
  evidenceTypeSchema,
  identifierSchema,
  requirementPrioritySchema,
  roiAssumptionsSchema,
  stakeholderRoleSchema,
  trustClassSchema,
} from "../schemas.ts";

const sentence = z.string().trim().min(1).max(LIMITS.sentenceLength);

export const getRoomStateInputSchema = z.strictObject({
  detail: z.enum(["summary", "requirements", "decision"]).optional(),
});

export const searchProductEvidenceInputSchema = z.strictObject({
  query: z.string().trim().min(1).max(LIMITS.queryLength),
  types: z.array(evidenceTypeSchema).min(1).max(5).optional(),
  requirementIds: z.array(identifierSchema).min(1).max(LIMITS.requirementIdFilter).optional(),
  trustClasses: z.array(trustClassSchema).min(1).max(3).optional(),
  limit: z.number().int().min(LIMITS.searchLimitMin).max(LIMITS.searchLimitMax).optional(),
});

export const evaluateRequirementInputSchema = z.strictObject({
  requirementId: identifierSchema,
  candidateEvidenceIds: z.array(identifierSchema).min(1).max(12).optional(),
});

export const calculateRoiInputSchema = roiAssumptionsSchema;

export const proposeBuyerContextInputSchema = buyerContextSchema;

/**
 * At least one editable field must be present. That rule is enforced in the
 * action, because a JSON Schema "any of these keys" constraint reads poorly in a
 * tool description and is easy for a caller to misunderstand.
 */
export const stageRequirementInputSchema = z.strictObject({
  requirementId: identifierSchema,
  buyerNotes: z.string().trim().max(LIMITS.noteLength).optional(),
  priority: requirementPrioritySchema.optional(),
  nonNegotiable: z.boolean().optional(),
  openQuestions: z.array(sentence).max(LIMITS.openQuestions).optional(),
});

export const attachEvidenceInputSchema = z.strictObject({
  requirementId: identifierSchema,
  evidenceIds: z.array(identifierSchema).min(1).max(LIMITS.attachEvidenceIds),
});

export const saveStakeholderBriefInputSchema = z.strictObject({
  role: stakeholderRoleSchema,
  summary: z.string().trim().min(1).max(LIMITS.summaryLength),
  evidenceIds: z.array(identifierSchema).max(LIMITS.briefEvidenceIds),
  risks: z.array(sentence).max(LIMITS.risks),
  openQuestions: z.array(sentence).max(LIMITS.openQuestions),
  nextStep: sentence,
});

export const proposeDecisionStatusInputSchema = decisionPayloadSchema;

/* Human only inputs ------------------------------------------------------- */

export const approvalInputSchema = z.strictObject({
  proposalId: identifierSchema,
});

export const rejectionInputSchema = z.strictObject({
  proposalId: identifierSchema,
  reason: z.string().trim().max(LIMITS.sentenceLength).optional(),
});

export const applyRoiAssumptionsInputSchema = roiAssumptionsSchema;

export const emptyInputSchema = z.strictObject({});

export type GetRoomStateInput = z.infer<typeof getRoomStateInputSchema>;
export type SearchProductEvidenceInput = z.infer<typeof searchProductEvidenceInputSchema>;
export type EvaluateRequirementInput = z.infer<typeof evaluateRequirementInputSchema>;
export type CalculateRoiInput = z.infer<typeof calculateRoiInputSchema>;
export type ProposeBuyerContextInput = z.infer<typeof proposeBuyerContextInputSchema>;
export type StageRequirementInput = z.infer<typeof stageRequirementInputSchema>;
export type AttachEvidenceInput = z.infer<typeof attachEvidenceInputSchema>;
export type SaveStakeholderBriefInput = z.infer<typeof saveStakeholderBriefInputSchema>;
export type ProposeDecisionStatusInput = z.infer<typeof proposeDecisionStatusInputSchema>;
export type ApprovalInput = z.infer<typeof approvalInputSchema>;
export type RejectionInput = z.infer<typeof rejectionInputSchema>;
export type ApplyRoiAssumptionsInput = z.infer<typeof applyRoiAssumptionsInputSchema>;
export type EmptyInput = z.infer<typeof emptyInputSchema>;
