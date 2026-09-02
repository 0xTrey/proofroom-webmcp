import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { TOOL_NAMES } from "../../src/webmcp/toolDefinitions.ts";
import {
  MAX_ASSERTION_ID_LENGTH,
  MAX_ASSERTION_TEXT_LENGTH,
  MAX_BOUNDED_FINAL_ASSISTANT_TEXT_LENGTH,
  MAX_REQUIREMENT_STATUS_ENTRIES,
  MAX_REQUIREMENT_STATUS_KEY_LENGTH,
  MAX_REQUIREMENT_STATUS_VALUE_LENGTH,
  MAX_SAFE_INPUT_DIGESTS_PER_CASE,
  MAX_TERMINAL_STATUS_STRING_LENGTH,
  MAX_TOOL_SEQUENCE_ENTRIES_PER_CASE,
  CONTRACT_DIGEST_PATTERN,
  SAFE_INPUT_DIGEST_PATTERN,
  assertArtifactByteCeiling,
} from "./artifactBounds.ts";
import { assertionContractMismatchReason } from "./assertionContract.ts";
import { casePasses, scoreAssertions } from "./assertions.ts";
import { RESPONSES_CASE_IDS } from "./cases.ts";
import { computeContractDigest } from "./contractDigest.ts";
import { assertArtifactSafe } from "./redaction.ts";
import { ASSERTION_DIMENSIONS, TRUTH_LABELS } from "./types.ts";

const contractDigestSchema = z.string().regex(CONTRACT_DIGEST_PATTERN);
const safeInputDigestSchema = z.string().regex(SAFE_INPUT_DIGEST_PATTERN);
const terminalStatusStringSchema = z.string().max(MAX_TERMINAL_STATUS_STRING_LENGTH);
const requirementStatusesSchema = z
  .record(
    z.string().max(MAX_REQUIREMENT_STATUS_KEY_LENGTH),
    z.string().max(MAX_REQUIREMENT_STATUS_VALUE_LENGTH),
  )
  .refine((record) => Object.keys(record).length <= MAX_REQUIREMENT_STATUS_ENTRIES, {
    message: `requirementStatuses exceeds ${MAX_REQUIREMENT_STATUS_ENTRIES} entries.`,
  });

const truthLabelsSchema = z.strictObject({
  classification: z.literal("local_openai_responses_model_selection"),
  provesNativeWebMcpDiscovery: z.literal(false),
  provesCompatibleBrowserAgent: z.literal(false),
  liveBrowserAgentStatus: z.literal("not_run"),
  euDataResidency: z.literal("unknown"),
});

const assertionSchema = z.strictObject({
  id: z.string().min(1).max(MAX_ASSERTION_ID_LENGTH),
  dimension: z.enum([
    "tool_selection",
    "argument_grounding",
    "state_safety",
    "truth_boundary",
    "completion",
  ]),
  critical: z.boolean(),
  description: z.string().min(1).max(MAX_ASSERTION_TEXT_LENGTH),
  pass: z.boolean(),
  detail: z.string().min(1).max(MAX_ASSERTION_TEXT_LENGTH),
});

const caseResultSchema = z.strictObject({
  id: z.enum(RESPONSES_CASE_IDS),
  outcome: z.enum(["pass", "fail"]),
  score: z.number().int().min(0).max(100),
  toolSequence: z.array(z.enum(TOOL_NAMES)).max(MAX_TOOL_SEQUENCE_ENTRIES_PER_CASE),
  callOutcome: z.enum(["completed", "protocol_error", "limit", "transport_error"]),
  safeInputDigests: z.array(safeInputDigestSchema).max(MAX_SAFE_INPUT_DIGESTS_PER_CASE),
  assertions: z.array(assertionSchema).min(1),
  terminal: z.strictObject({
    revision: z.number().int().nonnegative(),
    ledgerEventCount: z.number().int().nonnegative(),
    requirementStatuses: requirementStatusesSchema,
    buyerContextProposalStatus: terminalStatusStringSchema.nullable(),
    approvedBuyerContextPresent: z.boolean(),
    decisionProposalStatus: terminalStatusStringSchema.nullable(),
    approvedDecisionPresent: z.boolean(),
    euResidencyStatus: terminalStatusStringSchema.nullable(),
  }),
  boundedFinalAssistantText: z.string().max(MAX_BOUNDED_FINAL_ASSISTANT_TEXT_LENGTH).nullable(),
  tokenUsage: z.strictObject({
    input_tokens: z.number().int().nonnegative().optional(),
    output_tokens: z.number().int().nonnegative().optional(),
    total_tokens: z.number().int().nonnegative().optional(),
  }),
  stopReason: z.enum([
    "assistant_text",
    "protocol_error",
    "turn_limit",
    "call_limit",
    "unsupported_stateless_replay",
    "transport_error",
  ]),
});

const notRunSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    status: z.literal("not_run"),
    reason: z.string().min(20).max(500),
    model: z.null(),
    startedAt: z.null(),
    completedAt: z.null(),
    caseIds: z.array(z.enum(RESPONSES_CASE_IDS)).length(7),
    aggregateScore: z.null(),
    casePassCount: z.null(),
    caseFailCount: z.null(),
    cases: z.array(z.never()).length(0),
    knownDeviations: z.array(z.string().min(1).max(500)).max(24),
    contractDigest: contractDigestSchema,
    truthLabels: truthLabelsSchema,
  })
  .superRefine((record, context) => {
    assertContractDigest(record, context);
  });

type CompletedCase = z.infer<typeof caseResultSchema>;
type CompletedRecord = {
  schemaVersion: 1;
  status: "passed" | "failed";
  model: string;
  startedAt: string;
  completedAt: string;
  caseIds: (typeof RESPONSES_CASE_IDS)[number][];
  aggregateScore: number;
  casePassCount: number;
  caseFailCount: number;
  cases: CompletedCase[];
  knownDeviations: string[];
  contractDigest: string;
  truthLabels: z.infer<typeof truthLabelsSchema>;
};

function deriveCallOutcome(stopReason: CompletedCase["stopReason"]): CompletedCase["callOutcome"] {
  if (stopReason === "assistant_text") {
    return "completed";
  }
  if (stopReason === "turn_limit" || stopReason === "call_limit") {
    return "limit";
  }
  if (stopReason === "transport_error" || stopReason === "unsupported_stateless_replay") {
    return "transport_error";
  }
  return "protocol_error";
}

function deriveCaseOutcome(assertions: CompletedCase["assertions"]): CompletedCase["outcome"] {
  return casePasses(assertions) ? "pass" : "fail";
}

function deriveCaseScore(assertions: CompletedCase["assertions"]): number {
  return scoreAssertions(assertions);
}

function deriveAggregateScore(cases: CompletedCase[]): number {
  if (cases.length === 0) {
    return 0;
  }
  return Math.round(cases.reduce((total, entry) => total + entry.score, 0) / cases.length);
}

function derivePassFailCounts(cases: CompletedCase[]): { passCount: number; failCount: number } {
  const passCount = cases.filter((entry) => deriveCaseOutcome(entry.assertions) === "pass").length;
  return { passCount, failCount: cases.length - passCount };
}

function deriveStatus(cases: CompletedCase[], aggregateScore: number): "passed" | "failed" {
  const { failCount } = derivePassFailCounts(cases);
  return failCount === 0 && aggregateScore >= 90 ? "passed" : "failed";
}

function assertCaseAssertionContract(caseResult: CompletedCase, context: z.RefinementCtx, index: number): void {
  const mismatch = assertionContractMismatchReason(caseResult.id, caseResult.assertions);
  if (mismatch) {
    context.addIssue({
      code: "custom",
      path: ["cases", index, "assertions"],
      message: mismatch,
    });
  }
}

function assertContractDigest(record: { contractDigest: string }, context: z.RefinementCtx): void {
  const expected = computeContractDigest();
  if (record.contractDigest !== expected) {
    context.addIssue({
      code: "custom",
      path: ["contractDigest"],
      message: "contractDigest is missing or stale relative to the current cases, assertion contract, and tool schemas.",
    });
  }
}

function assertCaseDimensions(caseResult: CompletedCase, context: z.RefinementCtx, index: number): void {
  for (const dimension of ASSERTION_DIMENSIONS) {
    if (!caseResult.assertions.some((entry) => entry.dimension === dimension)) {
      context.addIssue({
        code: "custom",
        path: ["cases", index, "assertions"],
        message: `Case ${caseResult.id} is missing dimension ${dimension}.`,
      });
    }
  }
}

function assertDerivedCompletedRecord(record: CompletedRecord, context: z.RefinementCtx): void {
  assertContractDigest(record, context);

  if (JSON.stringify(record.caseIds) !== JSON.stringify(RESPONSES_CASE_IDS)) {
    context.addIssue({
      code: "custom",
      path: ["caseIds"],
      message: "caseIds must equal RESPONSES_CASE_IDS in canonical order.",
    });
  }

  const caseIds = record.cases.map((entry) => entry.id);
  if (JSON.stringify(caseIds) !== JSON.stringify(RESPONSES_CASE_IDS)) {
    context.addIssue({
      code: "custom",
      path: ["cases"],
      message: "Completed cases must contain RESPONSES_CASE_IDS exactly once in canonical order.",
    });
  }

  if (Date.parse(record.startedAt) > Date.parse(record.completedAt)) {
    context.addIssue({
      code: "custom",
      path: ["completedAt"],
      message: "completedAt must not be before startedAt.",
    });
  }

  for (const tool of record.cases.flatMap((entry) => entry.toolSequence)) {
    if (!TOOL_NAMES.includes(tool)) {
      context.addIssue({
        code: "custom",
        path: ["cases"],
        message: `Unknown tool in sequence: ${tool}`,
      });
    }
  }

  if (record.truthLabels.liveBrowserAgentStatus !== "not_run") {
    context.addIssue({
      code: "custom",
      path: ["truthLabels", "liveBrowserAgentStatus"],
      message: "Responses lane must not claim live browser-agent progress.",
    });
  }

  record.cases.forEach((caseResult, index) => {
    const assertionIds = caseResult.assertions.map((entry) => entry.id);
    const duplicateAssertionIds = assertionIds.filter(
      (id, position) => assertionIds.indexOf(id) !== position,
    );
    if (duplicateAssertionIds.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["cases", index, "assertions"],
        message: `Duplicate assertion IDs in ${caseResult.id}.`,
      });
    }

    assertCaseDimensions(caseResult, context, index);
    assertCaseAssertionContract(caseResult, context, index);

    const derivedScore = deriveCaseScore(caseResult.assertions);
    if (caseResult.score !== derivedScore) {
      context.addIssue({
        code: "custom",
        path: ["cases", index, "score"],
        message: `Case ${caseResult.id} score must equal derived passed-assertion ratio.`,
      });
    }

    const derivedOutcome = deriveCaseOutcome(caseResult.assertions);
    if (caseResult.outcome !== derivedOutcome) {
      context.addIssue({
        code: "custom",
        path: ["cases", index, "outcome"],
        message: `Case ${caseResult.id} outcome must match critical assertion results.`,
      });
    }

    if (caseResult.toolSequence.length !== caseResult.safeInputDigests.length) {
      context.addIssue({
        code: "custom",
        path: ["cases", index, "safeInputDigests"],
        message: `Case ${caseResult.id} digest count must match tool sequence length.`,
      });
    }

    const derivedCallOutcome = deriveCallOutcome(caseResult.stopReason);
    if (caseResult.callOutcome !== derivedCallOutcome) {
      context.addIssue({
        code: "custom",
        path: ["cases", index, "callOutcome"],
        message: `Case ${caseResult.id} callOutcome must match stopReason.`,
      });
    }

  });

  const derivedAggregateScore = deriveAggregateScore(record.cases);
  if (record.aggregateScore !== derivedAggregateScore) {
    context.addIssue({
      code: "custom",
      path: ["aggregateScore"],
      message: "aggregateScore must equal the derived average of case scores.",
    });
  }

  const { passCount, failCount } = derivePassFailCounts(record.cases);
  if (record.casePassCount !== passCount) {
    context.addIssue({
      code: "custom",
      path: ["casePassCount"],
      message: "casePassCount must equal derived pass count.",
    });
  }
  if (record.caseFailCount !== failCount) {
    context.addIssue({
      code: "custom",
      path: ["caseFailCount"],
      message: "caseFailCount must equal derived fail count.",
    });
  }

  const derivedStatus = deriveStatus(record.cases, derivedAggregateScore);
  if (record.status !== derivedStatus) {
    context.addIssue({
      code: "custom",
      path: ["status"],
      message: "status must be passed only when every case passes and aggregate score is at least 90.",
    });
  }
}

const completedSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    status: z.enum(["passed", "failed"]),
    model: z.string().min(1).max(120),
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime(),
    caseIds: z.array(z.enum(RESPONSES_CASE_IDS)).length(7),
    aggregateScore: z.number().int().min(0).max(100),
    casePassCount: z.number().int().min(0).max(7),
    caseFailCount: z.number().int().min(0).max(7),
    cases: z.array(caseResultSchema).length(7),
    knownDeviations: z.array(z.string().min(1).max(500)).max(24),
    contractDigest: contractDigestSchema,
    truthLabels: truthLabelsSchema,
  })
  .superRefine((record, context) => {
    assertDerivedCompletedRecord(record, context);
  });

export const responsesEvalRecordSchema = z.union([notRunSchema, completedSchema]);
export type ValidatedResponsesRecord = z.infer<typeof responsesEvalRecordSchema>;

export {
  deriveAggregateScore,
  deriveCallOutcome,
  deriveCaseOutcome,
  deriveCaseScore,
  derivePassFailCounts,
  deriveStatus,
};

function assertArtifactMarkers(value: unknown): void {
  assertArtifactSafe(JSON.stringify(value));
}

export function validateResponsesRecordData(parsed: unknown): ValidatedResponsesRecord {
  const record = responsesEvalRecordSchema.parse(parsed);
  assertArtifactByteCeiling(JSON.stringify(record));
  assertArtifactMarkers(record);
  return record;
}

export function validateResponsesRecord(path: string): ValidatedResponsesRecord {
  const raw = readFileSync(path);
  assertArtifactByteCeiling(raw);
  const parsed = JSON.parse(raw.toString("utf8")) as unknown;
  return validateResponsesRecordData(parsed);
}

export function assertTruthLabels(record: ValidatedResponsesRecord): void {
  if (JSON.stringify(record.truthLabels) !== JSON.stringify(TRUTH_LABELS)) {
    throw new Error("Truth labels do not match the required responses lane contract.");
  }
}

if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) {
  const path = process.argv[2] ?? resolve(process.cwd(), "evals", "responses-api", "results", "current.json");
  try {
    const record = validateResponsesRecord(path);
    assertTruthLabels(record);
    console.log(
      record.status === "not_run"
        ? "Responses API eval evidence: NOT RUN (valid and unverified)."
        : `Responses API eval evidence: ${record.status.toUpperCase()} (${record.cases.length} cases).`,
    );
  } catch {
    console.error("Responses API eval evidence is invalid.");
    process.exitCode = 1;
  }
}
