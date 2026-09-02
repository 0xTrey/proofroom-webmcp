import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  QA_RECEIPT_STEPS,
  QA_STEPS,
  readValidatedEvalDigests,
  runQa,
  type QaStep,
  type TreeDigest,
} from "../../scripts/qa.ts";
import {
  LOCAL_QA_MAX_RECEIPT_BYTES,
  validateLocalQaReceipt,
} from "../../scripts/rc-gate/localQaReceipt.ts";
import { validateDeterministicReportData } from "../../scripts/rc-gate/deterministicValidator.ts";
import { deterministicReport } from "../release/fixtures/rcGate/helpers.ts";

const stableVisualDigest: TreeDigest = {
  algorithm: "sha256",
  digest: "a".repeat(64),
  fileCount: 49,
  totalBytes: 13_924_973,
};

describe("aggregate QA orchestration", () => {
  it("uses the required named bundle command", () => {
    expect(QA_STEPS.find((step) => step.id === "bundle_budget")).toEqual({
      id: "bundle_budget",
      command: "npm",
      args: ["run", "check:bundle"],
    });
  });

  it("inserts responses validation after deterministic evals in receipt mode", () => {
    const index = QA_RECEIPT_STEPS.findIndex((step) => step.id === "responses_eval_validate");
    expect(index).toBeGreaterThan(
      QA_RECEIPT_STEPS.findIndex((step) => step.id === "deterministic_evals"),
    );
    expect(index).toBeLessThan(
      QA_RECEIPT_STEPS.findIndex((step) => step.id === "live_agent_record"),
    );
    expect(QA_RECEIPT_STEPS[index]).toEqual({
      id: "responses_eval_validate",
      command: "npm",
      args: ["run", "evals:responses:validate"],
    });
  });

  it("stops after the first failed child and propagates its exact exit code", async () => {
    const steps: QaStep[] = [
      { id: "first", command: "node", args: ["first"] },
      { id: "failing", command: "node", args: ["failing"] },
      { id: "must_not_run", command: "node", args: ["must-not-run"] },
    ];
    const observed: string[] = [];
    const output: string[] = [];
    vi.spyOn(console, "log").mockImplementation((message) => output.push(String(message)));

    const exitCode = await runQa({
      steps,
      stepRunner: async (step) => {
        observed.push(step.id);
        return step.id === "failing" ? 23 : 0;
      },
      digestVisualArtifacts: () => stableVisualDigest,
    });

    expect(exitCode).toBe(23);
    expect(observed).toEqual(["first", "failing"]);
    const summary = JSON.parse(output.at(-1)?.trim() ?? "{}");
    expect(summary).toMatchObject({
      status: "fail",
      completed: ["first"],
      firstFailedStep: "failing",
      liveAgentStatus: "not_run",
      liveAgentIncludedInPassCount: false,
      visualDigestBefore: stableVisualDigest.digest,
      visualDigestAfter: stableVisualDigest.digest,
    });
  });

  it("writes a strict failed receipt when a child step fails and eval artifacts are missing", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "proofroom-qa-fail-"));
    const receiptPath = join(tempDir, "local-qa.json");
    const output: string[] = [];
    vi.spyOn(console, "log").mockImplementation((message) => output.push(String(message)));

    const exitCode = await runQa({
      writeReceipt: true,
      steps: [{ id: "failing", command: "node", args: ["failing"] }],
      digestVisualArtifacts: () => stableVisualDigest,
      paths: {
        repositoryRoot: tempDir,
        localQaReceiptPath: receiptPath,
        deterministicReportPath: join(tempDir, "missing-deterministic.json"),
        responsesCurrentPath: join(tempDir, "missing-responses.json"),
        liveAgentCurrentPath: join(tempDir, "missing-live-agent.json"),
      },
      hooks: {
        readFilteredGitStatusFn: () => ({
          algorithm: "sha256",
          digest: "a".repeat(64),
          entryCount: 0,
        }),
        readHeadCommitFn: () => "c".repeat(40),
      },
      stepRunner: async () => 1,
    });

    expect(exitCode).toBe(1);
    const summary = JSON.parse(output.at(-1)?.trim() ?? "{}");
    expect(summary.receiptWritten).toBe(true);
    const receipt = validateLocalQaReceipt(
      JSON.parse(readFileSync(receiptPath, "utf8")) as unknown,
    );
    expect(receipt.status).toBe("failed");
    expect(receipt.evalArtifacts.deterministicReportDigest).toBeNull();
    expect(receipt.evalArtifacts.responsesCurrentDigest).toBeNull();
    expect(receipt.evalArtifacts.liveAgentCurrentDigest).toBeNull();
    expect(JSON.stringify(receipt)).not.toMatch(/\/Users\//);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("writes a failed receipt when responses and live-agent artifacts are missing", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "proofroom-qa-malformed-"));
    const receiptPath = join(tempDir, "local-qa.json");
    const output: string[] = [];
    vi.spyOn(console, "log").mockImplementation((message) => output.push(String(message)));

    const exitCode = await runQa({
      writeReceipt: true,
      steps: [{ id: "only", command: "node", args: ["only"] }],
      digestVisualArtifacts: () => stableVisualDigest,
      paths: {
        repositoryRoot: tempDir,
        localQaReceiptPath: receiptPath,
        deterministicReportPath: join(tempDir, "missing-deterministic.json"),
        responsesCurrentPath: join(tempDir, "missing-responses.json"),
        liveAgentCurrentPath: join(tempDir, "missing-live-agent.json"),
      },
      hooks: {
        readFilteredGitStatusFn: () => ({
          algorithm: "sha256",
          digest: "a".repeat(64),
          entryCount: 0,
        }),
        readHeadCommitFn: () => "c".repeat(40),
      },
      stepRunner: async () => 0,
    });

    expect(exitCode).toBe(1);
    const summary = JSON.parse(output.at(-1)?.trim() ?? "{}");
    expect(summary.receiptWritten).toBe(true);
    expect(summary.firstFailedStep).toBe("eval_artifact_validation");
    const receipt = validateLocalQaReceipt(
      JSON.parse(readFileSync(receiptPath, "utf8")) as unknown,
    );
    expect(receipt.status).toBe("failed");
    expect(receipt.evalArtifacts.responsesCurrentDigest).toBeNull();
    expect(receipt.evalArtifacts.liveAgentCurrentDigest).toBeNull();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("writes a failed receipt for visual digest failures before and after steps", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "proofroom-qa-visual-"));
    const receiptPath = join(tempDir, "local-qa.json");
    const output: string[] = [];
    vi.spyOn(console, "log").mockImplementation((message) => output.push(String(message)));
    let calls = 0;

    const beforeExit = await runQa({
      writeReceipt: true,
      steps: [{ id: "only", command: "node", args: ["only"] }],
      digestVisualArtifacts: () => {
        calls += 1;
        throw new Error("visual tree missing");
      },
      paths: {
        repositoryRoot: tempDir,
        localQaReceiptPath: receiptPath,
      },
      hooks: {
        readFilteredGitStatusFn: () => ({
          algorithm: "sha256",
          digest: "a".repeat(64),
          entryCount: 0,
        }),
        readHeadCommitFn: () => "c".repeat(40),
      },
      stepRunner: async () => 0,
    });
    expect(beforeExit).toBe(1);
    expect(calls).toBe(1);
    expect(JSON.parse(output.at(-1)?.trim() ?? "{}").receiptWritten).toBe(true);

    calls = 0;
    output.length = 0;
    const afterExit = await runQa({
      writeReceipt: true,
      steps: [{ id: "only", command: "node", args: ["only"] }],
      digestVisualArtifacts: () => {
        calls += 1;
        if (calls === 1) {
          return stableVisualDigest;
        }
        return {
          ...stableVisualDigest,
          digest: "b".repeat(64),
        };
      },
      paths: {
        repositoryRoot: tempDir,
        localQaReceiptPath: receiptPath,
      },
      hooks: {
        readFilteredGitStatusFn: () => ({
          algorithm: "sha256",
          digest: "a".repeat(64),
          entryCount: 0,
        }),
        readHeadCommitFn: () => "c".repeat(40),
      },
      stepRunner: async () => 0,
    });
    expect(afterExit).toBe(1);
    const receipt = validateLocalQaReceipt(
      JSON.parse(readFileSync(receiptPath, "utf8")) as unknown,
    );
    expect(receipt.status).toBe("failed");
    expect(receipt.visualArtifacts.byteIdentical).toBe(false);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("rejects malformed and canonically invalid eval artifacts without producing pass digests", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "proofroom-qa-eval-artifacts-"));
    const deterministicPath = join(tempDir, "deterministic.json");
    const responsesPath = join(tempDir, "responses.json");
    const liveAgentPath = join(tempDir, "live-agent.json");
    writeFileSync(deterministicPath, "{", "utf8");
    writeFileSync(responsesPath, JSON.stringify({ schemaVersion: 1, status: "passed" }), "utf8");
    writeFileSync(liveAgentPath, JSON.stringify({ schemaVersion: 2, status: "verified" }), "utf8");

    const digests = readValidatedEvalDigests({
      deterministicReportPath: deterministicPath,
      responsesCurrentPath: responsesPath,
      liveAgentCurrentPath: liveAgentPath,
      existsFn: (path) => path === deterministicPath || path === responsesPath || path === liveAgentPath,
      readFileFn: readFileSync,
    });
    expect(digests.deterministicReportDigest).toBeNull();
    expect(digests.responsesCurrentDigest).toBeNull();
    expect(digests.liveAgentCurrentDigest).toBeNull();
    expect(digests.evalArtifactsValid).toBe(false);

    const validJsonInvalidContent = join(tempDir, "valid-json-invalid-content.json");
    writeFileSync(
      validJsonInvalidContent,
      JSON.stringify(deterministicReport({ overallPass: false })),
      "utf8",
    );
    expect(() => validateDeterministicReportData(JSON.parse(readFileSync(validJsonInvalidContent, "utf8")))).toThrow();
    expect(
      readValidatedEvalDigests({
        deterministicReportPath: validJsonInvalidContent,
        responsesCurrentPath: responsesPath,
        liveAgentCurrentPath: liveAgentPath,
        existsFn: (path) =>
          path === validJsonInvalidContent || path === responsesPath || path === liveAgentPath,
        readFileFn: readFileSync,
      }).deterministicReportDigest,
    ).toBeNull();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("writes strict failed receipts for status-before, status-after, and HEAD read failures", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "proofroom-qa-workspace-head-"));
    const receiptPath = join(tempDir, "local-qa.json");
    const output: string[] = [];
    vi.spyOn(console, "log").mockImplementation((message) => output.push(String(message)));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const statusBeforeExit = await runQa({
      writeReceipt: true,
      steps: [{ id: "only", command: "node", args: ["only"] }],
      digestVisualArtifacts: () => stableVisualDigest,
      paths: { repositoryRoot: tempDir, localQaReceiptPath: receiptPath },
      hooks: {
        readFilteredGitStatusFn: () => {
          throw new Error("/Users/secret/status");
        },
        readHeadCommitFn: () => "c".repeat(40),
      },
      stepRunner: async () => 0,
    });
    expect(statusBeforeExit).toBe(1);
    let receipt = validateLocalQaReceipt(JSON.parse(readFileSync(receiptPath, "utf8")) as unknown);
    expect(receipt.status).toBe("failed");
    expect(receipt.steps.some((step) => step.id === "workspace_status_read")).toBe(true);
    expect(JSON.stringify(receipt)).not.toMatch(/\/Users\//);

    output.length = 0;
    let statusAfterCalls = 0;
    const statusAfterExit = await runQa({
      writeReceipt: true,
      steps: [{ id: "only", command: "node", args: ["only"] }],
      digestVisualArtifacts: () => stableVisualDigest,
      paths: { repositoryRoot: tempDir, localQaReceiptPath: receiptPath },
      hooks: {
        readFilteredGitStatusFn: () => {
          statusAfterCalls += 1;
          if (statusAfterCalls === 1) {
            return { algorithm: "sha256", digest: "a".repeat(64), entryCount: 0 };
          }
          throw new Error("status-after failed");
        },
        readHeadCommitFn: () => "c".repeat(40),
      },
      stepRunner: async () => 0,
    });
    expect(statusAfterExit).toBe(1);
    expect(statusAfterCalls).toBe(2);
    receipt = validateLocalQaReceipt(JSON.parse(readFileSync(receiptPath, "utf8")) as unknown);
    expect(receipt.workspace.statusParity).toBe(false);
    expect(receipt.steps.some((step) => step.id === "workspace_status_read")).toBe(true);

    output.length = 0;
    const headExit = await runQa({
      writeReceipt: true,
      steps: [{ id: "only", command: "node", args: ["only"] }],
      digestVisualArtifacts: () => stableVisualDigest,
      paths: { repositoryRoot: tempDir, localQaReceiptPath: receiptPath },
      hooks: {
        readFilteredGitStatusFn: () => ({
          algorithm: "sha256",
          digest: "a".repeat(64),
          entryCount: 0,
        }),
        readHeadCommitFn: () => {
          throw new Error("head failed");
        },
      },
      stepRunner: async () => 0,
    });
    expect(headExit).toBe(1);
    receipt = validateLocalQaReceipt(JSON.parse(readFileSync(receiptPath, "utf8")) as unknown);
    expect(receipt.steps.some((step) => step.id === "candidate_head_read")).toBe(true);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("requires verified readback before reporting receiptWritten true", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "proofroom-qa-readback-"));
    const receiptPath = join(tempDir, "local-qa.json");
    const output: string[] = [];
    vi.spyOn(console, "log").mockImplementation((message) => output.push(String(message)));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const noOpExit = await runQa({
      writeReceipt: true,
      steps: [{ id: "failing", command: "node", args: ["failing"] }],
      digestVisualArtifacts: () => stableVisualDigest,
      paths: { repositoryRoot: tempDir, localQaReceiptPath: receiptPath },
      hooks: {
        readFilteredGitStatusFn: () => ({
          algorithm: "sha256",
          digest: "a".repeat(64),
          entryCount: 0,
        }),
        readHeadCommitFn: () => "c".repeat(40),
        writeJsonAtomicallyFn: () => {},
      },
      stepRunner: async () => 1,
    });
    expect(noOpExit).toBe(1);
    expect(JSON.parse(output.at(-1)?.trim() ?? "{}").receiptWritten).toBe(false);

    output.length = 0;
    writeFileSync(receiptPath, JSON.stringify({ stale: true }), "utf8");
    const staleExit = await runQa({
      writeReceipt: true,
      steps: [{ id: "failing", command: "node", args: ["failing"] }],
      digestVisualArtifacts: () => stableVisualDigest,
      paths: { repositoryRoot: tempDir, localQaReceiptPath: receiptPath },
      hooks: {
        readFilteredGitStatusFn: () => ({
          algorithm: "sha256",
          digest: "a".repeat(64),
          entryCount: 0,
        }),
        readHeadCommitFn: () => "c".repeat(40),
        writeJsonAtomicallyFn: () => {},
      },
      stepRunner: async () => 1,
    });
    expect(staleExit).toBe(1);
    expect(JSON.parse(output.at(-1)?.trim() ?? "{}").receiptWritten).toBe(false);

    output.length = 0;
    const malformedExit = await runQa({
      writeReceipt: true,
      steps: [{ id: "failing", command: "node", args: ["failing"] }],
      digestVisualArtifacts: () => stableVisualDigest,
      paths: { repositoryRoot: tempDir, localQaReceiptPath: receiptPath },
      hooks: {
        readFilteredGitStatusFn: () => ({
          algorithm: "sha256",
          digest: "a".repeat(64),
          entryCount: 0,
        }),
        readHeadCommitFn: () => "c".repeat(40),
        writeJsonAtomicallyFn: (_path, value) => {
          writeFileSync(
            receiptPath,
            JSON.stringify({ ...(value as Record<string, unknown>), status: "passed" }),
            "utf8",
          );
        },
      },
      stepRunner: async () => 1,
    });
    expect(malformedExit).toBe(1);
    expect(JSON.parse(output.at(-1)?.trim() ?? "{}").receiptWritten).toBe(false);

    output.length = 0;
    const differentExit = await runQa({
      writeReceipt: true,
      steps: [{ id: "failing", command: "node", args: ["failing"] }],
      digestVisualArtifacts: () => stableVisualDigest,
      paths: { repositoryRoot: tempDir, localQaReceiptPath: receiptPath },
      hooks: {
        readFilteredGitStatusFn: () => ({
          algorithm: "sha256",
          digest: "a".repeat(64),
          entryCount: 0,
        }),
        readHeadCommitFn: () => "c".repeat(40),
        writeJsonAtomicallyFn: (_path, value) => {
          writeFileSync(
            receiptPath,
            JSON.stringify({ ...(value as Record<string, unknown>), candidateCommit: "d".repeat(40) }),
            "utf8",
          );
        },
      },
      stepRunner: async () => 1,
    });
    expect(differentExit).toBe(1);
    expect(JSON.parse(output.at(-1)?.trim() ?? "{}").receiptWritten).toBe(false);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("rejects local receipt leaks and oversized multibyte receipts", () => {
    const baseReceipt = {
      schemaVersion: 1,
      generatedAt: "2026-08-31T16:00:00.000Z",
      status: "failed",
      candidateCommit: "c".repeat(40),
      workspace: {
        filteredClean: true,
        statusBefore: { algorithm: "sha256", digest: "a".repeat(64), entryCount: 0 },
        statusAfter: { algorithm: "sha256", digest: "a".repeat(64), entryCount: 0 },
        statusParity: true,
      },
      steps: [
        {
          id: "lint",
          command: "npm",
          args: ["https://user:pass@example.com/run lint"],
          exitCode: 1,
          status: "failed",
        },
      ],
      visualArtifacts: {
        before: { algorithm: "sha256", digest: "a".repeat(64), fileCount: 1, totalBytes: 1 },
        after: { algorithm: "sha256", digest: "a".repeat(64), fileCount: 1, totalBytes: 1 },
        byteIdentical: true,
      },
      evalArtifacts: {
        deterministicReportDigest: null,
        responsesCurrentDigest: null,
        liveAgentCurrentDigest: null,
      },
    };
    expect(() => validateLocalQaReceipt(baseReceipt)).toThrow(/credential-bearing URLs/);

    expect(() =>
      validateLocalQaReceipt({
        ...baseReceipt,
        steps: [
          {
            id: "lint",
            command: "npm",
            args: ["run", "lint"],
            exitCode: 1,
            status: "failed",
          },
        ],
        candidateCommit: "c".repeat(40),
        workspace: {
          ...baseReceipt.workspace,
          statusBefore: {
            algorithm: "sha256",
            digest: "a".repeat(64),
            entryCount: 0,
          },
        },
      }),
    ).not.toThrow();

    expect(() =>
      validateLocalQaReceipt({
        ...baseReceipt,
        steps: [
          {
            id: "lint",
            command: "/Users/secret/bin",
            args: ["run", "lint"],
            exitCode: 1,
            status: "failed",
          },
        ],
      }),
    ).toThrow(/absolute paths/);

    expect(() =>
      validateLocalQaReceipt({
        ...baseReceipt,
        steps: [
          {
            id: "lint",
            command: "C:\\secret\\bin",
            args: ["run", "lint"],
            exitCode: 1,
            status: "failed",
          },
        ],
      }),
    ).toThrow(/absolute paths/);

    expect(() =>
      validateLocalQaReceipt({
        ...baseReceipt,
        steps: [
          {
            id: "lint",
            command: "npm",
            args: ["run", "sk-1234567890abcdef"],
            exitCode: 1,
            status: "failed",
          },
        ],
      }),
    ).toThrow(/secret-like values/);

    const oversized = {
      ...baseReceipt,
      steps: [
        {
          id: "lint",
          command: "npm",
          args: ["run", "lint"],
          exitCode: 1,
          status: "failed",
        },
      ],
      overflow: "é".repeat(LOCAL_QA_MAX_RECEIPT_BYTES),
    };
    expect(() => validateLocalQaReceipt(oversized)).toThrow(/bounded UTF-8 size/);
  });

  it("reports receiptWritten false when atomic write fails", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "proofroom-qa-write-fail-"));
    mkdirSync(join(tempDir, "blocked"), { recursive: true });
    const receiptPath = join(tempDir, "blocked", "local-qa.json");
    const output: string[] = [];
    vi.spyOn(console, "log").mockImplementation((message) => output.push(String(message)));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const exitCode = await runQa({
      writeReceipt: true,
      steps: [{ id: "failing", command: "node", args: ["failing"] }],
      digestVisualArtifacts: () => stableVisualDigest,
      paths: {
        repositoryRoot: tempDir,
        localQaReceiptPath: receiptPath,
      },
      hooks: {
        readFilteredGitStatusFn: () => ({
          algorithm: "sha256",
          digest: "a".repeat(64),
          entryCount: 0,
        }),
        readHeadCommitFn: () => "c".repeat(40),
        writeJsonAtomicallyFn: () => {
          throw new Error("write blocked");
        },
      },
      stepRunner: async () => 1,
    });

    expect(exitCode).toBe(1);
    const summary = JSON.parse(output.at(-1)?.trim() ?? "{}");
    expect(summary.receiptWritten).toBe(false);
    rmSync(tempDir, { recursive: true, force: true });
  });
});
