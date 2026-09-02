import type { ToolName } from "../contract.ts";

/** Serialized function_call_output must stay within this byte budget. */
export const MAX_FUNCTION_OUTPUT_BYTES = 8192;

const SK_SECRET_PATTERN = /sk-[A-Za-z0-9_-]+/;

const FORBIDDEN_NORMALIZED_KEYS = new Set([
  "activityledger",
  "canonicalbuyer",
  "evidencecatalog",
  "encryptedcontent",
  "rawreasoning",
  "openaiapikey",
  "apikey",
  "authorization",
  "accesstoken",
  "bearertoken",
  "privatestate",
  "rawprivatestate",
  "secret",
  "previousresponseid",
]);

const SANITIZE_LIMITS = {
  maxDepth: 6,
  maxKeys: 40,
  maxArrayLength: 20,
  maxStringLength: 500,
} as const;

export function normalizeForbiddenKeyName(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isForbiddenSanitizedKey(key: string): boolean {
  return FORBIDDEN_NORMALIZED_KEYS.has(normalizeForbiddenKeyName(key));
}

function containsSecretLikeValue(value: string): boolean {
  return SK_SECRET_PATTERN.test(value);
}

const EM_DASH_PATTERN = /[^\S\r\n]*\u2014[^\S\r\n]*/g;
const EN_DASH = "\u2013";

function containsForbiddenDashPunctuation(value: string): boolean {
  return value.includes("\u2014") || value.includes(EN_DASH);
}

function replaceEmDashes(text: string): string {
  return text.replace(EM_DASH_PATTERN, (match, offset, whole) => {
    const next = whole[offset + match.length];
    if (next === "\n" || next === "\r") {
      return ",";
    }
    return ", ";
  });
}

export function normalizePersistedText(text: string, max = 500): string {
  const normalized = replaceEmDashes(text).replaceAll(EN_DASH, "-");
  return clampBoundedText(normalized, max);
}

export function clampBoundedText(text: string, max = 500): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 24)}\n[output truncated]`;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function pick(source: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in source) {
      output[key] = source[key];
    }
  }
  return output;
}

function sanitizeValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "string") {
    return clampBoundedText(value, SANITIZE_LIMITS.maxStringLength);
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (depth >= SANITIZE_LIMITS.maxDepth) {
    return "[depth truncated]";
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, SANITIZE_LIMITS.maxArrayLength)
      .map((entry) => sanitizeValue(entry, depth + 1, seen));
  }
  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[cycle removed]";
    }
    seen.add(value);
    const source = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    const keys = Object.keys(source)
      .filter((key) => !isForbiddenSanitizedKey(key))
      .slice(0, SANITIZE_LIMITS.maxKeys);
    for (const key of keys) {
      output[key] = sanitizeValue(source[key], depth + 1, seen);
    }
    return output;
  }
  return "[unsupported value]";
}

export function sanitizeStructuredValue(value: unknown): unknown {
  return sanitizeValue(value, 0, new WeakSet());
}

function projectRequirementSummary(entry: unknown): Record<string, unknown> {
  const source = record(entry);
  return pick(source, [
    "id",
    "label",
    "priority",
    "nonNegotiable",
    "status",
    "attachedEvidenceCount",
    "coveredConditions",
    "gaps",
    "gapLabels",
    "limitationCount",
    "openQuestionCount",
    "blocksReadyDecision",
  ]);
}

function projectEvidenceHit(entry: unknown): Record<string, unknown> {
  const source = record(entry);
  return pick(source, [
    "id",
    "type",
    "sourceLabel",
    "trustClass",
    "untrustedContent",
    "summary",
    "annotation",
    "coverage",
    "limitations",
    "provenConditions",
    "refutedConditions",
  ]);
}

function projectBuyerContextStagingTemplate(entry: unknown): Record<string, unknown> {
  const source = record(entry);
  return {
    source: source.source,
    profileId: source.profileId,
    fictionalDisclosure: source.fictionalDisclosure,
    input: source.input,
    instruction: source.instruction,
  };
}

function projectToolStructured(
  structured: Record<string, unknown>,
  toolName: ToolName,
): Record<string, unknown> {
  if (structured.code !== undefined) {
    return pick(structured, ["code", "message", "issues", "relatedIds", "mutated"]);
  }

  switch (toolName) {
    case "get_room_state":
      return {
        roomId: structured.roomId,
        revision: structured.revision,
        demoNotice: structured.demoNotice,
        approvedBuyerContext: structured.approvedBuyerContext,
        requirementTotals: structured.requirementTotals,
        blockingRequirementIds: structured.blockingRequirementIds,
        roi: structured.roi,
        briefs: structured.briefs,
        proposals: structured.proposals,
        decision: structured.decision,
        recoveryNotice: structured.recoveryNotice,
        recommendedNextActions: structured.recommendedNextActions,
        buyerContextStagingTemplate: projectBuyerContextStagingTemplate(
          structured.buyerContextStagingTemplate,
        ),
        requirements: Array.isArray(structured.requirements)
          ? structured.requirements.map(projectRequirementSummary)
          : undefined,
      };
    case "search_product_evidence":
      return {
        query: structured.query,
        matched: structured.matched,
        returned: structured.returned,
        limit: structured.limit,
        untrustedContentIncluded: structured.untrustedContentIncluded,
        nextAction: structured.nextAction,
        results: Array.isArray(structured.results)
          ? structured.results.map(projectEvidenceHit)
          : [],
      };
    case "evaluate_requirement":
      return pick(structured, [
        "requirementId",
        "requirementLabel",
        "currentStatus",
        "proposedStatus",
        "gapLabels",
        "gaps",
        "coveredConditions",
        "attachedEvidenceCount",
        "limitationCount",
        "openQuestionCount",
        "applied",
        "nextAction",
      ]);
    case "calculate_roi":
      return pick(structured, [
        "applied",
        "paybackMonths",
        "withinBudget",
        "annualHoursSaved",
        "annualLaborValue",
        "firstYearCost",
        "firstYearNetValue",
        "budgetComparison",
        "paybackTargetMonths",
        "meetsPaybackTarget",
        "explanation",
        "nextAction",
        "assumptions",
      ]);
    case "propose_buyer_context":
      return pick(structured, [
        "proposalId",
        "proposalType",
        "baseRevision",
        "inputDigest",
        "expiresAt",
        "revision",
        "panel",
        "stagedFields",
        "approvalInstruction",
      ]);
    case "stage_requirement":
      return pick(structured, [
        "requirementId",
        "revision",
        "changedFields",
        "requirement",
        "nextAction",
      ]);
    case "attach_evidence":
      return pick(structured, [
        "requirementId",
        "revision",
        "accepted",
        "rejected",
        "requirement",
        "nextAction",
      ]);
    case "save_stakeholder_brief":
      return pick(structured, [
        "role",
        "revision",
        "briefId",
        "inputDigest",
        "nextAction",
      ]);
    case "propose_decision_status":
      return pick(structured, [
        "proposalId",
        "proposalType",
        "proposedStatus",
        "baseRevision",
        "inputDigest",
        "expiresAt",
        "revision",
        "blockers",
        "approvalInstruction",
      ]);
    default:
      return pick(structured, ["revision"]);
  }
}

export function extractHeadlineOnly(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }
  const jsonStart = trimmed.indexOf("\n\n{");
  if (jsonStart >= 0) {
    return trimmed.slice(0, jsonStart).trim();
  }
  const firstLine = trimmed.split("\n")[0] ?? trimmed;
  return firstLine.trim();
}

export function redactStructuredForOutput(
  structured: Record<string, unknown>,
  toolName: ToolName,
): Record<string, unknown> {
  const projected = projectToolStructured(structured, toolName);
  return sanitizeStructuredValue(projected) as Record<string, unknown>;
}

export function formatFunctionCallOutput(
  toolName: ToolName,
  result: WebMcpToolResult,
): string {
  const structured = (result.structuredContent ?? {}) as Record<string, unknown>;
  const boundedStructured = redactStructuredForOutput(structured, toolName);
  const headline = result.content[0]?.text ?? "";
  const payload = {
    isError: result.isError,
    summary: clampBoundedText(extractHeadlineOnly(headline), 500),
    structuredContent: boundedStructured,
  };
  const serialized = JSON.stringify(payload);
  if (Buffer.byteLength(serialized, "utf8") > MAX_FUNCTION_OUTPUT_BYTES) {
    throw new Error("function_call_output exceeds the documented byte limit.");
  }
  return serialized;
}

export function inspectArtifactValue(value: unknown, path = "$"): void {
  if (value === null || value === undefined) {
    return;
  }
  if (typeof value === "string") {
    if (containsSecretLikeValue(value)) {
      throw new Error(`Responses eval artifact contains prohibited secret-like value at ${path}.`);
    }
    if (containsForbiddenDashPunctuation(value)) {
      throw new Error(`Responses eval artifact contains prohibited dash punctuation at ${path}.`);
    }
    return;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => inspectArtifactValue(entry, `${path}[${index}]`));
    return;
  }
  if (typeof value === "object") {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (isForbiddenSanitizedKey(key)) {
        throw new Error(`Responses eval artifact contains prohibited key at ${path}.${key}.`);
      }
      inspectArtifactValue(entry, `${path}.${key}`);
    }
  }
}

export function assertArtifactSafe(serialized: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error("Responses eval artifact is not valid JSON.");
  }
  inspectArtifactValue(parsed);
}

export function redactErrorMessage(message: string): string {
  return normalizePersistedText(message.replace(SK_SECRET_PATTERN, "[redacted]"), 240);
}
