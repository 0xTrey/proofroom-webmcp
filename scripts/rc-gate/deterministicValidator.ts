import { Buffer } from "node:buffer";
import { EVAL_CASE_IDS } from "../../evals/contract.ts";
import { TOOL_NAMES } from "../../src/webmcp/toolDefinitions.ts";
import {
  EXPECTED_DETERMINISTIC_ASSERTIONS,
  EXPECTED_MANIFEST_DIGEST,
  EXPECTED_SEQUENCE_DIGEST,
} from "./productInvariants.ts";

const MAX_SERIALIZED_BYTES = 2_000_000;
const MAX_CASE_BYTES = 250_000;
const MAX_STRING_LENGTH = 240;
const MAX_ARRAY_LENGTH = 256;
const EXPECTED_SUITE_ID = "proofroom_deterministic_webmcp_eval";
const EXPECTED_FIXTURE = {
  roomId: "northstar_meridian_room",
  fixedClock: "2026-08-26T12:00:00.000Z",
} as const;
const TOP_LEVEL_KEYS = [
  "cases",
  "contract",
  "fixture",
  "liveAgentSelection",
  "overallPass",
  "safety",
  "schemaVersion",
  "suiteId",
  "tools",
  "totals",
] as const;
const CONTRACT_KEYS = ["expectedSequenceDigest", "manifestDigest"] as const;
const FIXTURE_KEYS = ["fixedClock", "roomId"] as const;
const TOOL_KEYS = ["count", "names"] as const;
const TOTAL_KEYS = [
  "ambiguous",
  "assertions",
  "explicit",
  "failed",
  "passed",
  "safety",
  "toolCalls",
  "total",
] as const;
const LIVE_AGENT_SELECTION_KEYS = ["explanation", "includedInPassCount", "status"] as const;
const SAFETY_KEYS = [
  "includesFullRoomState",
  "includesRawBriefText",
  "includesRawBuyerContext",
  "includesRawUntrustedContent",
  "includesStackTraces",
] as const;
const CASE_KEYS = [
  "assertions",
  "calls",
  "cleanup",
  "executionCompleted",
  "expectedSequence",
  "family",
  "id",
  "observedSequence",
  "outcome",
  "sequenceMatches",
  "setup",
  "terminal",
  "transitionContractMatches",
] as const;
const SETUP_KEYS = ["id", "ledgerEventCount", "revision"] as const;

function record(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return JSON.stringify(actual) === JSON.stringify(wanted);
}

function stringArray(value: unknown, maxLength = MAX_ARRAY_LENGTH): string[] | null {
  if (!Array.isArray(value) || value.length > maxLength) return null;
  if (!value.every((entry) => typeof entry === "string" && entry.length <= MAX_STRING_LENGTH)) {
    return null;
  }
  return value;
}

function boundedInteger(value: unknown, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
    return null;
  }
  if (value < 0 || value > max) {
    return null;
  }
  return value;
}

function validateBoundedString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_STRING_LENGTH) {
    throw new Error(`${label} string is invalid or oversized.`);
  }
  return value;
}

function validateCase(entry: unknown): void {
  const caseRecord = record(entry);
  if (!caseRecord || !exactKeys(caseRecord, CASE_KEYS)) {
    throw new Error("Deterministic report case keys are invalid.");
  }
  validateBoundedString(caseRecord.id, "Case id");
  validateBoundedString(caseRecord.family, "Case family");
  validateBoundedString(caseRecord.outcome, "Case outcome");
  if (caseRecord.outcome !== "pass") {
    throw new Error("Deterministic report cases must all pass.");
  }
  const setup = record(caseRecord.setup);
  if (!setup || !exactKeys(setup, SETUP_KEYS)) {
    throw new Error("Deterministic report case setup keys are invalid.");
  }
  validateBoundedString(setup.id, "Case setup id");
  if (boundedInteger(setup.revision, 10_000) === null) {
    throw new Error("Deterministic report case setup revision is invalid.");
  }
  if (boundedInteger(setup.ledgerEventCount, 10_000) === null) {
    throw new Error("Deterministic report case setup ledgerEventCount is invalid.");
  }
  if (!stringArray(caseRecord.expectedSequence) || !stringArray(caseRecord.observedSequence)) {
    throw new Error("Deterministic report case sequences are invalid.");
  }
  if (!Array.isArray(caseRecord.calls) || caseRecord.calls.length > MAX_ARRAY_LENGTH) {
    throw new Error("Deterministic report case calls are invalid.");
  }
  if (!Array.isArray(caseRecord.assertions) || caseRecord.assertions.length > MAX_ARRAY_LENGTH) {
    throw new Error("Deterministic report case assertions are invalid.");
  }
  if (caseRecord.cleanup !== null && typeof caseRecord.cleanup !== "object") {
    throw new Error("Deterministic report case cleanup is invalid.");
  }
  if (caseRecord.terminal !== null && typeof caseRecord.terminal !== "object") {
    throw new Error("Deterministic report case terminal is invalid.");
  }
  if (
    typeof caseRecord.executionCompleted !== "boolean" ||
    typeof caseRecord.sequenceMatches !== "boolean" ||
    typeof caseRecord.transitionContractMatches !== "boolean"
  ) {
    throw new Error("Deterministic report case boolean fields are invalid.");
  }
  const caseBytes = Buffer.byteLength(JSON.stringify(caseRecord), "utf8");
  if (caseBytes > MAX_CASE_BYTES) {
    throw new Error("Deterministic report case exceeds the bounded serialized size.");
  }
}

export function validateDeterministicReportData(parsed: unknown): Record<string, unknown> {
  const serialized = JSON.stringify(parsed);
  if (Buffer.byteLength(serialized, "utf8") > MAX_SERIALIZED_BYTES) {
    throw new Error("Deterministic report exceeds the bounded serialized size.");
  }

  const report = record(parsed);
  if (!report || !exactKeys(report, TOP_LEVEL_KEYS)) {
    throw new Error("Deterministic report top-level keys are invalid.");
  }
  if (report.schemaVersion !== 1) {
    throw new Error("Deterministic report schemaVersion must be 1.");
  }
  if (report.suiteId !== EXPECTED_SUITE_ID) {
    throw new Error("Deterministic report suiteId does not match the committed suite.");
  }

  const fixture = record(report.fixture);
  if (!fixture || !exactKeys(fixture, FIXTURE_KEYS)) {
    throw new Error("Deterministic report fixture keys are invalid.");
  }
  if (
    fixture.roomId !== EXPECTED_FIXTURE.roomId ||
    fixture.fixedClock !== EXPECTED_FIXTURE.fixedClock
  ) {
    throw new Error("Deterministic report fixture values do not match the committed fixture.");
  }

  const contract = record(report.contract);
  if (!contract || !exactKeys(contract, CONTRACT_KEYS)) {
    throw new Error("Deterministic report contract keys are invalid.");
  }
  if (
    contract.manifestDigest !== EXPECTED_MANIFEST_DIGEST ||
    contract.expectedSequenceDigest !== EXPECTED_SEQUENCE_DIGEST
  ) {
    throw new Error("Deterministic report contract digests do not match the committed contract.");
  }

  const tools = record(report.tools);
  if (!tools || !exactKeys(tools, TOOL_KEYS)) {
    throw new Error("Deterministic report tools keys are invalid.");
  }
  const toolNames = stringArray(tools.names, 12);
  if (
    tools.count !== 9 ||
    !toolNames ||
    toolNames.length !== 9 ||
    toolNames.some((name, index) => name !== TOOL_NAMES[index])
  ) {
    throw new Error("Deterministic report tool names do not match production tools.");
  }

  const totals = record(report.totals);
  if (!totals || !exactKeys(totals, TOTAL_KEYS)) {
    throw new Error("Deterministic report totals keys are invalid.");
  }
  const total = boundedInteger(totals.total, 100);
  const passed = boundedInteger(totals.passed, 100);
  const failed = boundedInteger(totals.failed, 100);
  const assertions = boundedInteger(totals.assertions, 10_000);
  const explicit = boundedInteger(totals.explicit, 100);
  const ambiguous = boundedInteger(totals.ambiguous, 100);
  const safety = boundedInteger(totals.safety, 100);
  const toolCalls = boundedInteger(totals.toolCalls, 10_000);
  if (
    total !== 12 ||
    passed !== 12 ||
    failed !== 0 ||
    assertions !== EXPECTED_DETERMINISTIC_ASSERTIONS ||
    explicit !== 4 ||
    ambiguous !== 4 ||
    safety !== 4 ||
    toolCalls === null
  ) {
    throw new Error("Deterministic report totals do not match the committed pass contract.");
  }

  const liveAgentSelection = record(report.liveAgentSelection);
  if (!liveAgentSelection || !exactKeys(liveAgentSelection, LIVE_AGENT_SELECTION_KEYS)) {
    throw new Error("Deterministic report liveAgentSelection keys are invalid.");
  }
  if (
    liveAgentSelection.status !== "not_run" ||
    liveAgentSelection.includedInPassCount !== false ||
    typeof liveAgentSelection.explanation !== "string" ||
    liveAgentSelection.explanation.length === 0 ||
    liveAgentSelection.explanation.length > MAX_STRING_LENGTH
  ) {
    throw new Error("Deterministic report liveAgentSelection contract is invalid.");
  }

  const safetyFlags = record(report.safety);
  if (!safetyFlags || !exactKeys(safetyFlags, SAFETY_KEYS)) {
    throw new Error("Deterministic report safety keys are invalid.");
  }
  for (const key of SAFETY_KEYS) {
    if (safetyFlags[key] !== false) {
      throw new Error("Deterministic report safety flags must all be false.");
    }
  }

  if (report.overallPass !== true) {
    throw new Error("Deterministic report overallPass must be true.");
  }

  if (!Array.isArray(report.cases) || report.cases.length !== 12) {
    throw new Error("Deterministic report must contain exactly twelve cases.");
  }
  const observedIds = report.cases.map((entry) => record(entry)?.id);
  if (
    observedIds.some((id) => typeof id !== "string") ||
    new Set(observedIds).size !== 12 ||
    !EVAL_CASE_IDS.every((id) => observedIds.includes(id))
  ) {
    throw new Error("Deterministic report cases must contain each canonical case ID once.");
  }
  for (const entry of report.cases) {
    validateCase(entry);
  }

  return report;
}
