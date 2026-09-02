import { applySetup, FIXED_EVAL_NOW } from "../cases.ts";
import { adaptToolDefinitions } from "./adapter.ts";
import {
  buildEvaluatedCaseResult,
  evaluateSuiteResults,
} from "./assertions.ts";
import {
  RESPONSES_CASE_IDS,
  RESPONSES_EVAL_CASES,
  validateResponsesCases,
} from "./cases.ts";
import { computeContractDigest } from "./contractDigest.ts";
import { runResponsesLoop } from "./loop.ts";
import { assertArtifactByteCeiling } from "./artifactBounds.ts";
import { assertArtifactSafe } from "./redaction.ts";
import type { ResponsesTransport } from "./types.ts";
import { TRUTH_LABELS, type EvaluatedCaseResult, type ResponsesEvalRecord } from "./types.ts";
import { validateResponsesRecordData } from "./validate.ts";
import { createRoomStore } from "../../src/state/createRoomStore.ts";
import { createMemoryRoomStorage } from "../../src/state/persistence.ts";

export type RunResponsesSuiteOptions = {
  transport: ResponsesTransport;
  model: string;
};

export type ResponsesSuiteResult = {
  record: ResponsesEvalRecord;
  serialized: string;
  caseResults: EvaluatedCaseResult[];
};

export async function runResponsesSuite(options: RunResponsesSuiteOptions): Promise<ResponsesSuiteResult> {
  validateResponsesCases();
  const startedAt = new Date().toISOString();
  const caseResults: EvaluatedCaseResult[] = [];

  for (const evalCase of RESPONSES_EVAL_CASES) {
    const handle = createRoomStore({
      storage: createMemoryRoomStorage(),
      now: () => FIXED_EVAL_NOW,
      persist: false,
    });
    await applySetup(evalCase.setup, handle);
    const before = structuredClone(handle.store.getState().room);
    const registry = adaptToolDefinitions(handle.agentActions);
    const loop = await runResponsesLoop({
      transport: options.transport,
      registry,
      handle,
      model: options.model,
      prompt: evalCase.prompt,
    });
    const after = structuredClone(handle.store.getState().room);
    caseResults.push(
      buildEvaluatedCaseResult(evalCase, { case: evalCase, before, after, loop }),
    );
  }

  const completedAt = new Date().toISOString();
  const totals = evaluateSuiteResults(caseResults);
  const contractDigest = computeContractDigest();
  const record: ResponsesEvalRecord = {
    schemaVersion: 1,
    status: totals.suitePass ? "passed" : "failed",
    model: options.model,
    startedAt,
    completedAt,
    caseIds: [...RESPONSES_CASE_IDS],
    aggregateScore: totals.aggregateScore,
    casePassCount: totals.passCount,
    caseFailCount: totals.failCount,
    cases: caseResults,
    knownDeviations: [],
    contractDigest,
    truthLabels: TRUTH_LABELS,
  };
  validateResponsesRecordData(record);
  const serialized = `${JSON.stringify(record, null, 2)}\n`;
  assertArtifactByteCeiling(serialized);
  assertArtifactSafe(serialized);
  return { record, serialized, caseResults };
}

export function buildNotRunRecord(reason: string): ResponsesEvalRecord {
  validateResponsesCases();
  return {
    schemaVersion: 1,
    status: "not_run",
    reason,
    model: null,
    startedAt: null,
    completedAt: null,
    caseIds: [...RESPONSES_CASE_IDS],
    aggregateScore: null,
    casePassCount: null,
    caseFailCount: null,
    cases: [],
    knownDeviations: [],
    contractDigest: computeContractDigest(),
    truthLabels: TRUTH_LABELS,
  };
}
