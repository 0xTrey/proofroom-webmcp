import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ASSERTION_REGISTRY,
  CASE_EXECUTORS,
  FIXED_EVAL_NOW,
  MUTATING_TOOL_NAMES,
  READ_ONLY_TOOL_NAMES,
  applySetup,
  type Assertion,
  type CaseExecutor,
  type CaseObservation,
  type EvalCallReceipt,
} from "./cases.ts";
import { loadEvalContract, type EvalCase, type ToolName } from "./contract.ts";
import { HUMAN_ONLY_ACTION_NAMES } from "../src/domain/actions/index.ts";
import { inputDigest } from "../src/domain/hash.ts";
import type { RoomState } from "../src/domain/types.ts";
import { CANONICAL_EVIDENCE } from "../src/fixtures/evidence.ts";
import { createRoomStore } from "../src/state/createRoomStore.ts";
import { createMemoryRoomStorage } from "../src/state/persistence.ts";
import { registerRoomTools, unregisterRoomTools } from "../src/webmcp/registerTools.ts";
import { createModelContextShim } from "../src/webmcp/testShim.ts";
import { createToolDefinitions, TOOL_NAMES } from "../src/webmcp/toolDefinitions.ts";

const resultsDirectory = resolve(process.cwd(), "evals", "results");
export const DETERMINISTIC_REPORT_FILENAME = "deterministic-report.json";

type AssertionReceipt = {
  id: string;
  kind: "required_invariant" | "forbidden_outcome" | "terminal_state";
  description: string;
  outcome: "pass" | "fail";
  detail: string;
};

type TerminalSummary = {
  revision: number;
  ledgerEventCount: number;
  requirementStatuses: Record<string, string>;
  buyerContextProposalStatus: string | null;
  approvedBuyerContextPresent: boolean;
  stakeholderBriefRoles: string[];
  decisionProposalStatus: string | null;
  decisionPayloadStatus: string | null;
  decisionBlockingRequirementIds: string[];
  approvedDecisionPresent: boolean;
};

type CaseReceipt = {
  id: string;
  family: string;
  outcome: "pass" | "fail";
  setup: {
    id: string;
    revision: number;
    ledgerEventCount: number;
  };
  expectedSequence: ToolName[];
  observedSequence: ToolName[];
  sequenceMatches: boolean;
  transitionContractMatches: boolean;
  executionCompleted: boolean;
  calls: Array<Omit<EvalCallReceipt, "result">>;
  assertions: AssertionReceipt[];
  terminal: TerminalSummary;
  cleanup: {
    registeredBeforeCleanup: string[];
    registeredAfterCleanup: string[];
    complete: boolean;
  };
};

export type EvalReport = {
  schemaVersion: 1;
  suiteId: "proofroom_deterministic_webmcp_eval";
  fixture: {
    roomId: "northstar_meridian_room";
    fixedClock: string;
  };
  contract: {
    manifestDigest: string;
    expectedSequenceDigest: string;
  };
  tools: {
    count: number;
    names: ToolName[];
  };
  totals: {
    total: number;
    passed: number;
    failed: number;
    explicit: number;
    ambiguous: number;
    safety: number;
    toolCalls: number;
    assertions: number;
  };
  liveAgentSelection: {
    status: "not_run";
    includedInPassCount: false;
    explanation: string;
  };
  cases: CaseReceipt[];
  safety: {
    includesFullRoomState: false;
    includesRawBuyerContext: false;
    includesRawBriefText: false;
    includesRawUntrustedContent: false;
    includesStackTraces: false;
  };
  overallPass: boolean;
};

export type RunEvalSuiteOptions = {
  writeArtifacts?: boolean;
  assertionRegistry?: Readonly<Record<string, Assertion>>;
  executorRegistry?: Readonly<Record<string, CaseExecutor>>;
  contractPaths?: { manifestPath: string; sequencesPath: string };
  resultsDirectory?: string;
  transformToolResult?: (
    caseId: string,
    tool: ToolName,
    result: WebMcpToolResult,
  ) => WebMcpToolResult;
  transformCallReceipt?: (caseId: string, receipt: EvalCallReceipt) => EvalCallReceipt;
};

export type EvalSuiteResult = {
  passed: boolean;
  report: EvalReport;
  serialized: string;
  digest: string;
};

function errorCode(result: WebMcpToolResult): string | null {
  if (!result.isError) {
    return null;
  }
  const structured = result.structuredContent;
  if (structured && typeof structured.code === "string") {
    return structured.code;
  }
  return "UNKNOWN_ERROR";
}

function callTransitionMatchesContract(call: EvalCallReceipt): boolean {
  const revisionDelta = call.revisionAfter - call.revisionBefore;
  const ledgerDelta = call.ledgerCountAfter - call.ledgerCountBefore;
  if (call.outcome === "error") {
    return revisionDelta === 0 && ledgerDelta === 0;
  }
  if (READ_ONLY_TOOL_NAMES.includes(call.tool)) {
    return revisionDelta === 0 && ledgerDelta === 1;
  }
  if (MUTATING_TOOL_NAMES.includes(call.tool)) {
    return revisionDelta === 1 && ledgerDelta === 1;
  }
  return false;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function resultSummary(tool: ToolName, toolResult: WebMcpToolResult): Record<string, string | number | boolean | null> {
  const payload = objectValue(toolResult.structuredContent);
  if (toolResult.isError) {
    return {
      code: errorCode(toolResult),
      issueCount: Array.isArray(payload.issues) ? payload.issues.length : 0,
      mutated: payload.mutated === true,
    };
  }
  switch (tool) {
    case "get_room_state":
      return {
        roomId: stringValue(payload.roomId),
        revision: numberValue(payload.revision),
      };
    case "search_product_evidence":
      return {
        matched: numberValue(payload.matched),
        returned: numberValue(payload.returned),
        untrustedContentIncluded: payload.untrustedContentIncluded === true,
      };
    case "evaluate_requirement":
      return {
        requirementId: stringValue(payload.requirementId),
        proposedStatus: stringValue(payload.proposedStatus),
        gapCount: Array.isArray(payload.gaps) ? payload.gaps.length : 0,
      };
    case "calculate_roi":
      return {
        paybackMonths: numberValue(payload.paybackMonths),
        withinBudget: objectValue(payload.budgetComparison).withinBudget === true,
      };
    case "propose_buyer_context":
      return {
        proposalId: stringValue(payload.proposalId),
        baseRevision: numberValue(payload.baseRevision),
      };
    case "stage_requirement":
      return {
        requirementId: stringValue(payload.requirementId),
        revision: numberValue(payload.revision),
      };
    case "attach_evidence":
      return {
        requirementId: stringValue(payload.requirementId),
        revision: numberValue(payload.revision),
        acceptedCount: Array.isArray(payload.accepted) ? payload.accepted.length : 0,
        rejectedCount: Array.isArray(payload.rejected) ? payload.rejected.length : 0,
      };
    case "save_stakeholder_brief":
      return {
        role: stringValue(payload.role),
        revision: numberValue(payload.revision),
        warningCount: Array.isArray(payload.warnings) ? payload.warnings.length : 0,
      };
    case "propose_decision_status":
      return {
        proposalId: stringValue(payload.proposalId),
        proposedStatus: stringValue(payload.proposedStatus),
        blockerCount: Array.isArray(payload.blockers) ? payload.blockers.length : 0,
      };
  }
}

function summarizeTerminal(room: RoomState): TerminalSummary {
  return {
    revision: room.revision,
    ledgerEventCount: room.activityLedger.length,
    requirementStatuses: Object.fromEntries(
      [...room.requirements]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((entry) => [entry.id, entry.status]),
    ),
    buyerContextProposalStatus: room.buyerContextProposal?.status ?? null,
    approvedBuyerContextPresent: room.approvedBuyerContext !== null,
    stakeholderBriefRoles: Object.keys(room.stakeholderBriefs).sort(),
    decisionProposalStatus: room.decisionProposal?.status ?? null,
    decisionPayloadStatus: room.decisionProposal?.payload.status ?? null,
    decisionBlockingRequirementIds: [...(room.decisionProposal?.payload.blockingRequirementIds ?? [])],
    approvedDecisionPresent: room.approvedDecision !== null,
  };
}

function assertionReceipts(
  evalCase: EvalCase,
  observation: CaseObservation,
  registry: Readonly<Record<string, Assertion>>,
): AssertionReceipt[] {
  const definitions = [
    ...evalCase.requiredInvariants.map((entry) => ({ ...entry, kind: "required_invariant" as const })),
    ...evalCase.forbiddenOutcomes.map((entry) => ({ ...entry, kind: "forbidden_outcome" as const })),
    { ...evalCase.terminalState, kind: "terminal_state" as const },
  ];
  return definitions.map((definition) => {
    const assertion = registry[definition.id];
    if (!assertion) {
      return {
        ...definition,
        outcome: "fail",
        detail: "The assertion implementation is missing.",
      };
    }
    try {
      const evaluated = assertion(observation);
      return {
        ...definition,
        outcome: evaluated.pass ? "pass" : "fail",
        detail: evaluated.detail,
      };
    } catch {
      return {
        ...definition,
        outcome: "fail",
        detail: "The assertion implementation threw.",
      };
    }
  });
}

function assertSafeReport(serialized: string): void {
  const forbidden = [
    MERIDIAN_RAW_MARKER,
    "The modelled 11.2 month payback uses explicit buyer assumptions.",
    "Current SOC 2 and SAML evidence are present.",
    ...CANONICAL_EVIDENCE.filter((record) => record.untrustedContent).map((record) => record.summary),
    "\"activityLedger\"",
    "\"canonicalBuyer\"",
    "\"evidenceCatalog\"",
    "node_modules/",
    "\n    at ",
  ];
  const hit = forbidden.find((marker) => serialized.includes(marker));
  if (hit) {
    throw new Error("The eval receipt contains prohibited raw or diagnostic content.");
  }
}

const MERIDIAN_RAW_MARKER = "Ship twenty campaigns per month without adding headcount";

function renderReadme(report: EvalReport, reportDigest: string): string {
  const lines = [
    "# Deterministic eval result",
    "",
    "Generated by `npm run evals` from the strict manifest and exact expected sequences.",
    "",
    `- Suite result: ${report.totals.failed === 0 ? "PASS" : "FAIL"}`,
    `- Cases: ${report.totals.passed}/${report.totals.total} passed`,
    `- Families: ${report.totals.explicit} explicit, ${report.totals.ambiguous} ambiguous, ${report.totals.safety} safety`,
    `- Tool calls: ${report.totals.toolCalls}`,
    `- Assertions: ${report.totals.assertions}`,
    `- Manifest SHA-256: \`${report.contract.manifestDigest}\``,
    `- Expected-sequence SHA-256: \`${report.contract.expectedSequenceDigest}\``,
    `- Receipt SHA-256: \`${reportDigest}\``,
    `- Fixed clock: \`${report.fixture.fixedClock}\``,
    "",
    "| Case | Family | Result | Calls | Assertions |",
    "| --- | --- | --- | ---: | ---: |",
    ...report.cases.map(
      (entry) =>
        `| \`${entry.id}\` | ${entry.family} | ${entry.outcome.toUpperCase()} | ${entry.calls.length} | ${entry.assertions.length} |`,
    ),
    "",
    "The receipt contains bounded summaries only. It excludes full room state, raw buyer-context",
    "payloads, raw brief text, raw untrusted testimonial content, and stack traces.",
    "",
    "Live browser-agent tool selection is outside this deterministic suite. Its separate evidence",
    "record remains `not_run` until an eligible browser agent is actually exercised.",
    "",
  ];
  return lines.join("\n");
}

async function runCase(options: {
  evalCase: EvalCase;
  expectedSequence: ToolName[];
  assertionRegistry: Readonly<Record<string, Assertion>>;
  executor: CaseExecutor;
  transformToolResult?: RunEvalSuiteOptions["transformToolResult"];
  transformCallReceipt?: RunEvalSuiteOptions["transformCallReceipt"];
}): Promise<CaseReceipt> {
  const handle = createRoomStore({
    storage: createMemoryRoomStorage(),
    now: () => FIXED_EVAL_NOW,
    persist: false,
  });
  await applySetup(options.evalCase.setup, handle);
  const before = structuredClone(handle.store.getState().room);
  const shim = createModelContextShim();
  const abortController = new AbortController();
  const registration = await registerRoomTools(createToolDefinitions(handle.agentActions), {
    modelContext: shim.modelContext,
    signal: abortController.signal,
  });
  if (
    registration.failures.length > 0 ||
    registration.duplicates.length > 0 ||
    JSON.stringify(shim.toolNames()) !== JSON.stringify(TOOL_NAMES)
  ) {
    throw new Error(`Tool registration did not produce the exact production registry for ${options.evalCase.id}.`);
  }
  if (HUMAN_ONLY_ACTION_NAMES.some((name) => shim.has(name))) {
    throw new Error(`A human-only action leaked into the tool registry for ${options.evalCase.id}.`);
  }

  const calls: EvalCallReceipt[] = [];
  let executionCompleted = true;
  let auxiliary: CaseObservation["auxiliary"];
  try {
    const execution = await options.executor({
      handle,
      shim,
      async call(tool, args, expectation = {}) {
        const roomBefore = handle.store.getState().room;
        const originalResult = await shim.callTool(tool, args);
        const toolResult =
          options.transformToolResult?.(options.evalCase.id, tool, originalResult) ?? originalResult;
        const roomAfter = handle.store.getState().room;
        const outcome = toolResult.isError ? "error" : "success";
        const baseReceipt: EvalCallReceipt = {
          index: calls.length + 1,
          tool,
          inputDigest: inputDigest(args),
          outcome,
          errorCode: errorCode(toolResult),
          revisionBefore: roomBefore.revision,
          revisionAfter: roomAfter.revision,
          ledgerCountBefore: roomBefore.activityLedger.length,
          ledgerCountAfter: roomAfter.activityLedger.length,
          resultSummary: resultSummary(tool, toolResult),
          result: toolResult,
        };
        const receipt =
          options.transformCallReceipt?.(options.evalCase.id, baseReceipt) ?? baseReceipt;
        calls.push(receipt);
        const expectedOutcome = expectation.outcome ?? "success";
        if (
          outcome !== expectedOutcome ||
          (expectation.errorCode !== undefined && receipt.errorCode !== expectation.errorCode)
        ) {
          throw new Error(`Unexpected tool outcome at call ${receipt.index}.`);
        }
        return toolResult;
      },
    });
    auxiliary = execution.auxiliary;
  } catch {
    executionCompleted = false;
  }

  const registeredBeforeCleanup = shim.toolNames();
  abortController.abort();
  unregisterRoomTools(shim.modelContext, registeredBeforeCleanup);
  const registeredAfterCleanup = shim.toolNames();
  const after = structuredClone(handle.store.getState().room);
  const observedSequence = calls.map((call) => call.tool);
  const sequenceMatches =
    JSON.stringify(observedSequence) === JSON.stringify(options.expectedSequence);
  const transitionContractMatches = calls.every(callTransitionMatchesContract);
  const observation: CaseObservation = {
    before,
    after,
    calls,
    registeredToolNames: registeredBeforeCleanup,
    cleanupToolNames: registeredAfterCleanup,
    auxiliary,
  };
  const assertions = assertionReceipts(options.evalCase, observation, options.assertionRegistry);
  const cleanupComplete = registeredAfterCleanup.length === 0;
  const passed =
    executionCompleted &&
    sequenceMatches &&
    transitionContractMatches &&
    cleanupComplete &&
    assertions.every((assertion) => assertion.outcome === "pass");

  return {
    id: options.evalCase.id,
    family: options.evalCase.family,
    outcome: passed ? "pass" : "fail",
    setup: {
      id: options.evalCase.setup,
      revision: before.revision,
      ledgerEventCount: before.activityLedger.length,
    },
    expectedSequence: options.expectedSequence,
    observedSequence,
    sequenceMatches,
    transitionContractMatches,
    executionCompleted,
    calls: calls.map(({ result: _result, ...receipt }) => receipt),
    assertions,
    terminal: summarizeTerminal(after),
    cleanup: {
      registeredBeforeCleanup,
      registeredAfterCleanup,
      complete: cleanupComplete,
    },
  };
}

export async function runEvalSuite(options: RunEvalSuiteOptions = {}): Promise<EvalSuiteResult> {
  const assertionRegistry = options.assertionRegistry ?? ASSERTION_REGISTRY;
  const executorRegistry = options.executorRegistry ?? CASE_EXECUTORS;
  const contract = loadEvalContract({
    assertionIds: new Set(Object.keys(assertionRegistry)),
    executorIds: new Set(Object.keys(executorRegistry)),
    paths: options.contractPaths,
  });
  const cases: CaseReceipt[] = [];
  for (const evalCase of contract.manifest.cases) {
    const executor = executorRegistry[evalCase.id];
    if (!executor) {
      throw new Error(`Missing executor for ${evalCase.id}.`);
    }
    cases.push(
      await runCase({
        evalCase,
        expectedSequence: contract.sequences.sequences[evalCase.id] ?? [],
        assertionRegistry,
        executor,
        transformToolResult: options.transformToolResult,
        transformCallReceipt: options.transformCallReceipt,
      }),
    );
  }

  const failed = cases.filter((entry) => entry.outcome === "fail").length;
  const report: EvalReport = {
    schemaVersion: 1,
    suiteId: "proofroom_deterministic_webmcp_eval",
    fixture: {
      roomId: "northstar_meridian_room",
      fixedClock: FIXED_EVAL_NOW,
    },
    contract: {
      manifestDigest: contract.manifestDigest,
      expectedSequenceDigest: contract.expectedSequenceDigest,
    },
    tools: {
      count: TOOL_NAMES.length,
      names: [...TOOL_NAMES],
    },
    totals: {
      total: cases.length,
      passed: cases.length - failed,
      failed,
      explicit: cases.filter((entry) => entry.family === "explicit").length,
      ambiguous: cases.filter((entry) => entry.family === "ambiguous").length,
      safety: cases.filter((entry) => entry.family === "safety").length,
      toolCalls: cases.reduce((total, entry) => total + entry.calls.length, 0),
      assertions: cases.reduce((total, entry) => total + entry.assertions.length, 0),
    },
    liveAgentSelection: {
      status: "not_run",
      includedInPassCount: false,
      explanation:
        "Live browser-agent selection was not run and is excluded from deterministic pass counts.",
    },
    cases,
    safety: {
      includesFullRoomState: false,
      includesRawBuyerContext: false,
      includesRawBriefText: false,
      includesRawUntrustedContent: false,
      includesStackTraces: false,
    },
    overallPass: failed === 0,
  };
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  assertSafeReport(serialized);
  const digest = createHash("sha256").update(serialized).digest("hex");

  if (options.writeArtifacts ?? true) {
    const outputDirectory = options.resultsDirectory ?? resultsDirectory;
    mkdirSync(outputDirectory, { recursive: true });
    writeFileSync(resolve(outputDirectory, DETERMINISTIC_REPORT_FILENAME), serialized);
    writeFileSync(resolve(outputDirectory, "README.md"), renderReadme(report, digest));
  }
  return { passed: failed === 0, report, serialized, digest };
}
