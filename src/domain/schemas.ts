/**
 * Strict schemas for every value that crosses a trust boundary: WebMCP tool
 * input, UI form input, and persisted browser state.
 *
 * Every object schema here rejects unknown keys. Do not relax that to make a
 * caller or a test pass.
 */
import { z } from "zod";
import { inputDigest } from "./hash.ts";

export const LIMITS = {
  idLength: 64,
  labelLength: 120,
  sentenceLength: 240,
  paragraphLength: 1200,
  summaryLength: 900,
  noteLength: 700,
  queryLength: 160,
  personas: 6,
  priorities: 8,
  hardRequirements: 8,
  risks: 6,
  openQuestions: 6,
  briefEvidenceIds: 12,
  attachEvidenceIds: 6,
  requirementIdFilter: 6,
  searchLimitMin: 1,
  searchLimitMax: 12,
  searchLimitDefault: 6,
} as const;

export const ISO_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

/**
 * ProofRoom stores every timestamp as an ISO 8601 UTC string so fixtures,
 * digests, and ledger output stay byte-for-byte comparable across machines.
 */
export const isoDateTimeSchema = z
  .string()
  .regex(ISO_DATE_TIME_PATTERN, "expected an ISO 8601 UTC timestamp such as 2026-08-26T12:00:00.000Z");

export const identifierSchema = z
  .string()
  .min(1)
  .max(LIMITS.idLength)
  .regex(/^[a-z0-9][a-z0-9_]*$/, "expected a lower snake case identifier");

const label = z.string().trim().min(1).max(LIMITS.labelLength);
const sentence = z.string().trim().min(1).max(LIMITS.sentenceLength);
const paragraph = z.string().trim().min(1).max(LIMITS.paragraphLength);

export const evidenceTypeSchema = z.enum([
  "product_doc",
  "security_doc",
  "integration_doc",
  "implementation_doc",
  "testimonial",
]);

export const trustClassSchema = z.enum(["canonical", "external", "testimonial"]);

export const requirementStatusSchema = z.enum([
  "supported",
  "partially_supported",
  "unsupported",
  "unknown",
]);

export const requirementPrioritySchema = z.enum(["must", "should"]);

export const decisionStatusSchema = z.enum(["ready", "ready_with_conditions", "not_ready"]);

export const stakeholderRoleSchema = z.enum(["cfo", "ciso"]);

export const actionOriginSchema = z.enum(["ui", "webmcp", "system"]);

export const panelSchema = z.enum([
  "product",
  "context",
  "evaluation",
  "roi",
  "briefs",
  "decision",
  "ledger",
  "system",
]);

export const proposalTypeSchema = z.enum(["buyer_context", "decision"]);

export const proposalStatusSchema = z.enum(["pending", "approved", "rejected", "expired"]);

/* Vendor and buyer ------------------------------------------------------- */

export const capabilitySchema = z.strictObject({
  id: identifierSchema,
  label,
  summary: sentence,
  coverage: z.array(identifierSchema).max(12),
});

export const packagingTierSchema = z.strictObject({
  id: identifierSchema,
  name: label,
  annualListPrice: z.number().int().min(0).max(2_000_000),
  seatBand: label,
  includes: z.array(sentence).max(8),
});

export const vendorProfileSchema = z.strictObject({
  id: identifierSchema,
  name: label,
  category: label,
  headline: sentence,
  primaryValue: sentence,
  fictionalDisclosure: sentence,
  capabilities: z.array(capabilitySchema).min(1).max(12),
  packaging: z.array(packagingTierSchema).min(1).max(6),
  implementation: z.strictObject({
    summary: sentence,
    typicalDays: z.number().int().min(1).max(365),
    milestones: z.array(sentence).min(1).max(8),
  }),
});

export const buyerProfileSchema = z.strictObject({
  id: identifierSchema,
  companyName: label,
  industry: label,
  employeeBand: label,
  personas: z.array(label).min(1).max(LIMITS.personas),
  priorities: z.array(sentence).min(1).max(LIMITS.priorities),
  hardRequirements: z.array(sentence).min(1).max(LIMITS.hardRequirements),
  budgetCeiling: z.number().int().min(0).max(1_000_000),
  paybackTargetMonths: z.number().int().min(1).max(60),
  fictionalDisclosure: sentence,
});

export const buyerContextSchema = z.strictObject({
  companyName: label,
  industry: label,
  employeeBand: label,
  personas: z.array(label).min(1).max(LIMITS.personas),
  priorities: z.array(sentence).min(1).max(LIMITS.priorities),
  hardRequirements: z.array(sentence).min(1).max(LIMITS.hardRequirements),
  budgetCeiling: z.number().int().min(0).max(1_000_000),
  paybackTargetMonths: z.number().int().min(1).max(60),
});

/* Evidence and requirements ---------------------------------------------- */

export const evidenceRecordSchema = z.strictObject({
  id: identifierSchema,
  title: label,
  type: evidenceTypeSchema,
  sourceLabel: label,
  sourceUrl: z.string().url().max(300).optional(),
  effectiveAt: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema.optional(),
  trustClass: trustClassSchema,
  untrustedContent: z.boolean(),
  /** Requirement IDs this record is filed against. */
  coverage: z.array(identifierSchema).max(12),
  /** Condition IDs this record affirmatively proves. */
  supportedClaims: z.array(identifierSchema).max(12),
  /** Human readable limitations. Never used for status arithmetic. */
  limitations: z.array(sentence).max(8),
  /** Condition IDs this record explicitly shows are not satisfied. */
  refutedClaims: z.array(identifierSchema).max(12),
  /** Evidence IDs this record contradicts. */
  contradicts: z.array(identifierSchema).max(12),
  summary: paragraph,
});

export const requirementSchema = z.strictObject({
  id: identifierSchema,
  label,
  description: sentence,
  priority: requirementPrioritySchema,
  /** Buyer flag for a requirement that must be proven before a ready decision. */
  nonNegotiable: z.boolean(),
  hardConditions: z.array(identifierSchema).min(1).max(6),
  status: requirementStatusSchema,
  attachedEvidenceIds: z.array(identifierSchema).max(12),
  coveredConditions: z.array(identifierSchema).max(6),
  gaps: z.array(identifierSchema).max(6),
  rationale: z.string().max(LIMITS.paragraphLength),
  buyerNotes: z.string().max(LIMITS.noteLength),
  openQuestions: z.array(sentence).max(LIMITS.openQuestions),
});

/* Commercial model ------------------------------------------------------- */

export const roiAssumptionsSchema = z.strictObject({
  campaignsPerMonth: z.number().int().min(0).max(500),
  hoursSavedPerCampaign: z.number().min(0).max(80),
  loadedHourlyCost: z.number().min(0).max(500),
  annualSubscriptionCost: z.number().min(0).max(1_000_000),
  implementationCost: z.number().min(0).max(500_000),
  budgetCeiling: z.number().min(0).max(1_000_000),
});

export const roiResultSchema = z.strictObject({
  currency: z.literal("USD"),
  assumptions: roiAssumptionsSchema,
  annualHoursSaved: z.number(),
  annualLaborValue: z.number(),
  monthlyLaborValue: z.number(),
  firstYearCost: z.number(),
  firstYearNetValue: z.number(),
  paybackMonths: z.number().nullable(),
  withinBudget: z.boolean(),
  formula: z.array(sentence).min(1).max(10),
});

/* Briefs, proposals, decisions ------------------------------------------- */

export const stakeholderBriefSchema = z.strictObject({
  role: stakeholderRoleSchema,
  summary: z.string().trim().min(1).max(LIMITS.summaryLength),
  evidenceIds: z.array(identifierSchema).max(LIMITS.briefEvidenceIds),
  risks: z.array(sentence).max(LIMITS.risks),
  openQuestions: z.array(sentence).max(LIMITS.openQuestions),
  nextStep: sentence,
  savedAt: isoDateTimeSchema,
  savedAtRevision: z.number().int().min(0),
  savedBy: actionOriginSchema,
  warnings: z.array(sentence).max(8),
});

export const decisionPayloadSchema = z.strictObject({
  status: decisionStatusSchema,
  rationale: z.string().trim().min(1).max(LIMITS.summaryLength),
  supportingRequirementIds: z.array(identifierSchema).max(6),
  blockingRequirementIds: z.array(identifierSchema).max(6),
  risks: z.array(sentence).max(LIMITS.risks),
  nextStep: sentence,
});

export const receiptSchema = z.strictObject({
  id: identifierSchema,
  kind: z.enum(["buyer_context", "decision", "reset"]),
  proposalId: identifierSchema.nullable(),
  revision: z.number().int().min(0),
  inputDigest: z.string().min(1).max(64),
  issuedAt: isoDateTimeSchema,
  summary: sentence,
});

export const approvedDecisionSchema = decisionPayloadSchema.extend({
  proposalId: identifierSchema,
  approvedAt: isoDateTimeSchema,
  approvedAtRevision: z.number().int().min(0),
  receipt: receiptSchema,
});

export function proposalSchema<PayloadSchema extends z.ZodTypeAny>(payload: PayloadSchema) {
  return z.strictObject({
    id: identifierSchema,
    type: proposalTypeSchema,
    baseRevision: z.number().int().min(0),
    inputDigest: z.string().min(1).max(64),
    createdBy: z.enum(["webmcp", "ui"]),
    createdAt: isoDateTimeSchema,
    expiresAt: isoDateTimeSchema,
    status: proposalStatusSchema,
    payload,
  });
}

export const buyerContextProposalSchema = proposalSchema(buyerContextSchema);
export const decisionProposalSchema = proposalSchema(decisionPayloadSchema);

/* Ledger and recovery ---------------------------------------------------- */

export const activityEventSchema = z.strictObject({
  id: identifierSchema,
  sequence: z.number().int().min(1),
  origin: actionOriginSchema,
  action: z.string().min(1).max(LIMITS.labelLength),
  toolName: z.string().min(1).max(LIMITS.labelLength).nullable(),
  inputDigest: z.string().min(1).max(64),
  inputSummary: z.string().max(LIMITS.sentenceLength),
  resultStatus: z.enum(["ok", "error"]),
  revisionBefore: z.number().int().min(0),
  revisionAfter: z.number().int().min(0),
  affectedIds: z.array(z.string().min(1).max(LIMITS.idLength)).max(24),
  panel: panelSchema,
  mutating: z.boolean(),
  untrustedContent: z.boolean(),
  createdAt: isoDateTimeSchema,
});

export const recoveryNoticeSchema = z.strictObject({
  code: z.enum(["unsupported_schema_version", "invalid_persisted_state", "storage_unavailable"]),
  message: sentence,
  detail: z.string().max(LIMITS.sentenceLength).nullable(),
  detectedAt: isoDateTimeSchema,
});

/* Room state ------------------------------------------------------------- */

export const roomStateSchema = z.strictObject({
  schemaVersion: z.literal(1),
  roomId: z.string().min(1).max(LIMITS.idLength),
  revision: z.number().int().min(0),
  vendor: vendorProfileSchema,
  canonicalBuyer: buyerProfileSchema,
  buyerContextProposal: buyerContextProposalSchema.nullable(),
  approvedBuyerContext: buyerContextSchema.nullable(),
  approvedBuyerContextReceipt: receiptSchema.nullable().default(null),
  requirements: z.array(requirementSchema).min(1).max(12),
  evidenceCatalog: z.array(evidenceRecordSchema).min(1).max(24),
  roiAssumptions: roiAssumptionsSchema,
  roiResult: roiResultSchema,
  stakeholderBriefs: z
    .strictObject({
      cfo: stakeholderBriefSchema.optional(),
      ciso: stakeholderBriefSchema.optional(),
    })
    .default({}),
  decisionProposal: decisionProposalSchema.nullable(),
  approvedDecision: approvedDecisionSchema.nullable(),
  activityLedger: z.array(activityEventSchema).max(400),
  recoveryNotice: recoveryNoticeSchema.nullable(),
}).superRefine((room, context) => {
  const receipt = room.approvedBuyerContextReceipt;
  if (!receipt) {
    return;
  }

  if (!room.approvedBuyerContext) {
    context.addIssue({
      code: "custom",
      path: ["approvedBuyerContextReceipt"],
      message: "a buyer-context receipt requires approved buyer context",
    });
  }

  if (receipt.kind !== "buyer_context") {
    context.addIssue({
      code: "custom",
      path: ["approvedBuyerContextReceipt", "kind"],
      message: "expected a buyer_context receipt",
    });
  }

  if (receipt.proposalId === null) {
    context.addIssue({
      code: "custom",
      path: ["approvedBuyerContextReceipt", "proposalId"],
      message: "a buyer-context receipt requires a proposal ID",
    });
  }

  if (receipt.revision > room.revision) {
    context.addIssue({
      code: "custom",
      path: ["approvedBuyerContextReceipt", "revision"],
      message: "receipt revision cannot be greater than room revision",
    });
  }

  if (
    room.approvedBuyerContext &&
    receipt.inputDigest !== inputDigest(room.approvedBuyerContext)
  ) {
    context.addIssue({
      code: "custom",
      path: ["approvedBuyerContextReceipt", "inputDigest"],
      message: "receipt digest must match the approved buyer context",
    });
  }
});

export const persistedRoomSchema = z.strictObject({
  schemaVersion: z.literal(1),
  savedAt: isoDateTimeSchema,
  room: roomStateSchema,
});
