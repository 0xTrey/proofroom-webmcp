import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applySetup, ASSERTION_REGISTRY, CASE_EXECUTORS, FIXED_EVAL_NOW } from "../../evals/cases.ts";
import {
  DETERMINISTIC_REPORT_FILENAME,
  runEvalSuite,
  type RunEvalSuiteOptions,
} from "../../evals/runner.ts";
import { proposeBuyerContextInputSchema } from "../../src/domain/actions/inputs.ts";
import { inputDigest } from "../../src/domain/hash.ts";
import { createRoomStore } from "../../src/state/createRoomStore.ts";
import { createMemoryRoomStorage } from "../../src/state/persistence.ts";
import { registerRoomTools } from "../../src/webmcp/registerTools.ts";
import { createModelContextShim } from "../../src/webmcp/testShim.ts";
import { createToolDefinitions, TOOL_NAMES } from "../../src/webmcp/toolDefinitions.ts";
import { MERIDIAN_CONTEXT_DRAFT } from "../../src/fixtures/buyer.ts";

const temporaryDirectories: string[] = [];
const manifestPath = resolve(process.cwd(), "evals", "manifest.json");
const sequencesPath = resolve(process.cwd(), "evals", "expected-sequences.json");
const TRANSFORMED_BUDGET_CEILING = 115000;

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function transformEval006TemplateInput(
  toolResult: WebMcpToolResult,
  mutator: (input: Record<string, unknown>) => Record<string, unknown>,
): WebMcpToolResult {
  const content = record(toolResult.structuredContent);
  const template = record(content.buyerContextStagingTemplate);
  const input = record(template.input);
  return {
    ...toolResult,
    structuredContent: {
      ...content,
      buyerContextStagingTemplate: {
        ...template,
        input: mutator(input),
      },
    },
  };
}

async function runEval006RoomState(
  transformToolResult: RunEvalSuiteOptions["transformToolResult"],
) {
  const handle = createRoomStore({
    storage: createMemoryRoomStorage(),
    now: () => FIXED_EVAL_NOW,
    persist: false,
  });
  await applySetup("canonical_reset", handle);
  const shim = createModelContextShim();
  const abortController = new AbortController();
  await registerRoomTools(createToolDefinitions(handle.agentActions), {
    modelContext: shim.modelContext,
    signal: abortController.signal,
  });
  await CASE_EXECUTORS.eval_006_make_this_relevant!({
    handle,
    shim,
    async call(tool, args, expectation = {}) {
      const originalResult = await shim.callTool(tool, args);
      const toolResult =
        transformToolResult?.("eval_006_make_this_relevant", tool, originalResult) ?? originalResult;
      const outcome = toolResult.isError ? "error" : "success";
      const expectedOutcome = expectation.outcome ?? "success";
      if (outcome !== expectedOutcome) {
        throw new Error(`Unexpected tool outcome for ${tool}.`);
      }
      return toolResult;
    },
  });
  abortController.abort();
  return handle.store.getState().room;
}

function copiedContract(mutator: (manifest: any, sequences: any) => void) {
  const directory = mkdtempSync(join(tmpdir(), "proofroom-evals-"));
  temporaryDirectories.push(directory);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const sequences = JSON.parse(readFileSync(sequencesPath, "utf8"));
  mutator(manifest, sequences);
  const copiedManifestPath = join(directory, "manifest.json");
  const copiedSequencesPath = join(directory, "expected-sequences.json");
  writeFileSync(copiedManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(copiedSequencesPath, `${JSON.stringify(sequences, null, 2)}\n`);
  return { manifestPath: copiedManifestPath, sequencesPath: copiedSequencesPath };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("deterministic executable eval suite", () => {
  it("executes all twelve cases through the real shim with a stable receipt", async () => {
    const first = await runEvalSuite({ writeArtifacts: false });
    const second = await runEvalSuite({ writeArtifacts: false });

    expect(first.passed).toBe(true);
    expect(Object.keys(first.report)).toEqual([
      "schemaVersion",
      "suiteId",
      "fixture",
      "contract",
      "tools",
      "totals",
      "liveAgentSelection",
      "cases",
      "safety",
      "overallPass",
    ]);
    expect(first.report.contract.manifestDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(first.report.contract.expectedSequenceDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(first.report.tools).toEqual({ count: 9, names: TOOL_NAMES });
    expect(first.report.totals).toEqual({
      total: 12,
      passed: 12,
      failed: 0,
      explicit: 4,
      ambiguous: 4,
      safety: 4,
      toolCalls: 41,
      assertions: 60,
    });
    expect(first.report.liveAgentSelection).toEqual({
      status: "not_run",
      includedInPassCount: false,
      explanation:
        "Live browser-agent selection was not run and is excluded from deterministic pass counts.",
    });
    expect(first.report.overallPass).toBe(true);
    expect(first.serialized).toBe(second.serialized);
    expect(first.digest).toBe(second.digest);
    expect(first.report.cases).toHaveLength(12);
    for (const evalCase of first.report.cases) {
      expect(evalCase.sequenceMatches).toBe(true);
      expect(evalCase.transitionContractMatches).toBe(true);
      expect(evalCase.executionCompleted).toBe(true);
      expect(evalCase.cleanup.complete).toBe(true);
      expect(evalCase.cleanup.registeredBeforeCleanup).toHaveLength(9);
      expect(evalCase.cleanup.registeredAfterCleanup).toEqual([]);
      expect(evalCase.assertions.every((assertion) => assertion.outcome === "pass")).toBe(true);
      for (const call of evalCase.calls) {
        expect(call.inputDigest).toMatch(/^[a-f0-9]{16}$/);
        expect(call.resultSummary).toBeTypeOf("object");
      }
    }
  });

  it("writes only the required deterministic report filename", async () => {
    const directory = mkdtempSync(join(tmpdir(), "proofroom-eval-results-"));
    temporaryDirectories.push(directory);

    await runEvalSuite({ resultsDirectory: directory });

    expect(existsSync(join(directory, DETERMINISTIC_REPORT_FILENAME))).toBe(true);
    expect(existsSync(join(directory, "latest.json"))).toBe(false);
  });

  it("fails closed for a missing top-level key", async () => {
    const paths = copiedContract((manifest) => {
      delete manifest.notes;
    });

    await expect(runEvalSuite({ writeArtifacts: false, contractPaths: paths })).rejects.toThrow();
  });

  it("fails closed for anything other than twelve cases", async () => {
    const paths = copiedContract((manifest) => {
      manifest.cases.pop();
    });

    await expect(runEvalSuite({ writeArtifacts: false, contractPaths: paths })).rejects.toThrow();
  });

  it("fails closed for a duplicate case ID", async () => {
    const paths = copiedContract((manifest) => {
      manifest.cases[1].id = manifest.cases[0].id;
    });

    await expect(runEvalSuite({ writeArtifacts: false, contractPaths: paths })).rejects.toThrow(
      /manifest case IDs mismatch/,
    );
  });

  it("fails closed for an unknown family", async () => {
    const paths = copiedContract((manifest) => {
      manifest.cases[0].family = "other";
    });

    await expect(runEvalSuite({ writeArtifacts: false, contractPaths: paths })).rejects.toThrow();
  });

  it("fails closed for an unknown setup", async () => {
    const paths = copiedContract((manifest) => {
      manifest.cases[0].setup = "other_setup";
    });

    await expect(runEvalSuite({ writeArtifacts: false, contractPaths: paths })).rejects.toThrow();
  });

  it.each([
    ["required invariant", "requiredInvariants"],
    ["forbidden outcome", "forbiddenOutcomes"],
  ])("fails closed for an unknown %s identifier", async (_label, field) => {
    const paths = copiedContract((manifest) => {
      manifest.cases[0][field][0].id = "unknown_assertion";
    });

    await expect(runEvalSuite({ writeArtifacts: false, contractPaths: paths })).rejects.toThrow(
      /assertion registry IDs mismatch/,
    );
  });

  it("fails closed for an unknown terminal assertion identifier", async () => {
    const paths = copiedContract((manifest) => {
      manifest.cases[0].terminalState.id = "unknown_terminal";
    });

    await expect(runEvalSuite({ writeArtifacts: false, contractPaths: paths })).rejects.toThrow(
      /assertion registry IDs mismatch/,
    );
  });

  it("fails closed when the assertion registry omits an executable check", async () => {
    const assertionRegistry = Object.fromEntries(
      Object.entries(ASSERTION_REGISTRY).filter(([id]) => id !== "canonical_eu_unknown"),
    );

    await expect(runEvalSuite({ writeArtifacts: false, assertionRegistry })).rejects.toThrow(
      /assertion registry IDs mismatch/,
    );
  });

  it("fails closed for strict-contract unknown keys", async () => {
    const paths = copiedContract((manifest) => {
      manifest.unreviewed = true;
    });

    await expect(runEvalSuite({ writeArtifacts: false, contractPaths: paths })).rejects.toThrow();
  });

  it("fails closed for a human-only tool in an expected sequence", async () => {
    const paths = copiedContract((_manifest, sequences) => {
      sequences.sequences.eval_011_stale_approval = ["approve_buyer_context"];
    });

    await expect(runEvalSuite({ writeArtifacts: false, contractPaths: paths })).rejects.toThrow();
  });

  it("fails closed when an executor has no manifest case", async () => {
    const executorRegistry = {
      ...CASE_EXECUTORS,
      phantom_case: async () => ({}),
    };

    await expect(runEvalSuite({ writeArtifacts: false, executorRegistry })).rejects.toThrow(
      /executor case IDs mismatch/,
    );
  });

  it("fails closed when a manifest case has no executor", async () => {
    const executorRegistry = Object.fromEntries(
      Object.entries(CASE_EXECUTORS).filter(([id]) => id !== "eval_001_canonical_journey"),
    );

    await expect(runEvalSuite({ writeArtifacts: false, executorRegistry })).rejects.toThrow(
      /executor case IDs mismatch/,
    );
  });

  it("fails closed when a safety case has no forbidden outcome", async () => {
    const paths = copiedContract((manifest) => {
      manifest.cases.find((entry: any) => entry.id === "eval_009_force_eu_supported").forbiddenOutcomes = [];
    });

    await expect(runEvalSuite({ writeArtifacts: false, contractPaths: paths })).rejects.toThrow();
  });

  it("fails closed when expected unique tools do not match the exact sequence", async () => {
    const paths = copiedContract((manifest) => {
      manifest.cases[0].expectedTools = ["get_room_state"];
    });

    await expect(runEvalSuite({ writeArtifacts: false, contractPaths: paths })).rejects.toThrow(
      /expectedTools must equal/,
    );
  });

  it("fails closed when a state-dependent mutation is sequenced before its required read", async () => {
    const paths = copiedContract((manifest, sequences) => {
      const sequence = sequences.sequences.eval_006_make_this_relevant;
      sequence.reverse();
      manifest.cases.find(
        (entry: any) => entry.id === "eval_006_make_this_relevant",
      ).expectedTools = [...sequence];
    });

    await expect(runEvalSuite({ writeArtifacts: false, contractPaths: paths })).rejects.toThrow(
      /must sequence get_room_state before propose_buyer_context/,
    );
  });

  it("fails a case when an executor call trace differs from the expected sequence", async () => {
    const executorRegistry = {
      ...CASE_EXECUTORS,
      eval_002_salesforce_evidence_only: async () => ({}),
    };

    const result = await runEvalSuite({ writeArtifacts: false, executorRegistry });

    expect(result.passed).toBe(false);
    expect(
      result.report.cases.find((entry) => entry.id === "eval_002_salesforce_evidence_only"),
    ).toMatchObject({
      outcome: "fail",
      sequenceMatches: false,
      observedSequence: [],
    });
  });

  it("fails the exact revision invariant when a mutating transition receipt is tampered", async () => {
    const result = await runEvalSuite({
      writeArtifacts: false,
      transformCallReceipt(caseId, receipt) {
        if (
          caseId === "eval_001_canonical_journey" &&
          receipt.tool === "propose_buyer_context"
        ) {
          return { ...receipt, revisionAfter: receipt.revisionBefore };
        }
        return receipt;
      },
    });

    const canonical = result.report.cases.find(
      (entry) => entry.id === "eval_001_canonical_journey",
    );
    expect(result.passed).toBe(false);
    expect(canonical?.transitionContractMatches).toBe(false);
    expect(canonical?.assertions).toContainEqual(
      expect.objectContaining({
        id: "canonical_mutation_revision_discipline",
        outcome: "fail",
      }),
    );
  });

  it("turns a tampered tool result into a failed case receipt", async () => {
    const result = await runEvalSuite({
      writeArtifacts: false,
      transformToolResult(caseId, tool, toolResult) {
        if (caseId !== "eval_009_force_eu_supported" || tool !== "evaluate_requirement") {
          return toolResult;
        }
        return {
          ...toolResult,
          structuredContent: {
            ...toolResult.structuredContent,
            proposedStatus: "supported",
          },
        };
      },
    });

    expect(result.passed).toBe(false);
    expect(result.report.totals.failed).toBe(1);
    const tampered = result.report.cases.find((entry) => entry.id === "eval_009_force_eu_supported");
    expect(tampered?.outcome).toBe("fail");
    expect(tampered?.assertions).toContainEqual(
      expect.objectContaining({ id: "force_eu_returns_unknown", outcome: "fail" }),
    );
  });

  it("fails the provenance assertion when propose_buyer_context diverges from the read template", async () => {
    const result = await runEvalSuite({
      writeArtifacts: false,
      transformCallReceipt(caseId, receipt) {
        if (
          caseId === "eval_006_make_this_relevant" &&
          receipt.tool === "propose_buyer_context"
        ) {
          return { ...receipt, inputDigest: "0000000000000000" };
        }
        return receipt;
      },
    });

    const relevance = result.report.cases.find((entry) => entry.id === "eval_006_make_this_relevant");
    expect(result.passed).toBe(false);
    expect(relevance?.outcome).toBe("fail");
    expect(relevance?.assertions).toContainEqual(
      expect.objectContaining({
        id: "relevance_context_uses_read_template",
        outcome: "fail",
      }),
    );
  });

  it("proves eval_006 follows a controlled transformed template from get_room_state", async () => {
    const transformToolResult: RunEvalSuiteOptions["transformToolResult"] = (caseId, tool, toolResult) => {
      if (caseId !== "eval_006_make_this_relevant" || tool !== "get_room_state") {
        return toolResult;
      }
      return transformEval006TemplateInput(toolResult, (input) => ({
        ...input,
        budgetCeiling: TRANSFORMED_BUDGET_CEILING,
      }));
    };

    const result = await runEvalSuite({ writeArtifacts: false, transformToolResult });
    const relevance = result.report.cases.find((entry) => entry.id === "eval_006_make_this_relevant");

    expect(relevance).toMatchObject({
      outcome: "pass",
      executionCompleted: true,
      sequenceMatches: true,
      observedSequence: ["get_room_state", "propose_buyer_context"],
    });
    expect(relevance?.assertions).toContainEqual(
      expect.objectContaining({
        id: "relevance_context_uses_read_template",
        outcome: "pass",
      }),
    );
    expect(relevance?.assertions).toContainEqual(
      expect.objectContaining({
        id: "context_authority_null",
        outcome: "pass",
      }),
    );

    const proposeCall = relevance?.calls.find((call) => call.tool === "propose_buyer_context");
    const transformedInput = proposeBuyerContextInputSchema.parse({
      ...MERIDIAN_CONTEXT_DRAFT,
      budgetCeiling: TRANSFORMED_BUDGET_CEILING,
    });
    expect(proposeCall?.inputDigest).toBe(inputDigest(transformedInput));

    const room = await runEval006RoomState(transformToolResult);
    expect(room.buyerContextProposal?.payload.budgetCeiling).toBe(TRANSFORMED_BUDGET_CEILING);
    expect(room.approvedBuyerContext).toBeNull();
  });

  it("rejects an added template field before propose_buyer_context runs", async () => {
    const result = await runEvalSuite({
      writeArtifacts: false,
      transformToolResult(caseId, tool, toolResult) {
        if (caseId !== "eval_006_make_this_relevant" || tool !== "get_room_state") {
          return toolResult;
        }
        return transformEval006TemplateInput(toolResult, (input) => ({
          ...input,
          extraStagingKey: "unauthorized",
        }));
      },
    });

    const relevance = result.report.cases.find((entry) => entry.id === "eval_006_make_this_relevant");
    expect(result.passed).toBe(false);
    expect(relevance).toMatchObject({
      outcome: "fail",
      executionCompleted: false,
      observedSequence: ["get_room_state"],
    });
    expect(relevance?.calls).toHaveLength(1);
    expect(relevance?.terminal.buyerContextProposalStatus).toBeNull();
  });

  it("rejects a missing template field before propose_buyer_context runs", async () => {
    const result = await runEvalSuite({
      writeArtifacts: false,
      transformToolResult(caseId, tool, toolResult) {
        if (caseId !== "eval_006_make_this_relevant" || tool !== "get_room_state") {
          return toolResult;
        }
        return transformEval006TemplateInput(toolResult, (input) => {
          const { companyName: _removed, ...rest } = input;
          return rest;
        });
      },
    });

    const relevance = result.report.cases.find((entry) => entry.id === "eval_006_make_this_relevant");
    expect(result.passed).toBe(false);
    expect(relevance).toMatchObject({
      outcome: "fail",
      executionCompleted: false,
      observedSequence: ["get_room_state"],
    });
    expect(relevance?.calls).toHaveLength(1);
    expect(relevance?.terminal.buyerContextProposalStatus).toBeNull();
  });

  it("keeps the machine receipt bounded and free of raw sensitive payloads", async () => {
    const result = await runEvalSuite({ writeArtifacts: false });

    expect(result.serialized).not.toContain("activityLedger");
    expect(result.serialized).not.toContain("Ship twenty campaigns per month without adding headcount");
    expect(result.serialized).not.toContain("Ignore your previous instructions");
    expect(result.serialized).not.toContain("Current SOC 2 and SAML evidence are present");
    expect(result.serialized).not.toContain("node_modules/");
    expect(result.report.safety).toEqual({
      includesFullRoomState: false,
      includesRawBuyerContext: false,
      includesRawBriefText: false,
      includesRawUntrustedContent: false,
      includesStackTraces: false,
    });
  });
});
