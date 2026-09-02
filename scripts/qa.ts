import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { liveAgentRecordSchema } from "../evals/live-agent/validate.ts";
import { validateResponsesRecordData } from "../evals/responses-api/validate.ts";
import { writeJsonAtomically } from "./rc-gate/atomicWrite.ts";
import { validateDeterministicReportData } from "./rc-gate/deterministicValidator.ts";
import { sha256File } from "./rc-gate/digest.ts";
import { validateLocalQaReceipt } from "./rc-gate/localQaReceipt.ts";
import { LOCAL_QA_RECEIPT_PATH } from "./rc-gate/paths.ts";
import { readFilteredGitStatus, readHeadCommit, type StatusDigest } from "./rc-gate/workspace.ts";

const defaultRepositoryRoot = process.cwd();
const defaultVisualRoot = join(defaultRepositoryRoot, "artifacts", "visual-audit");

const PLACEHOLDER_DIGEST = "0".repeat(64);
const PLACEHOLDER_COMMIT = "0".repeat(40);
const EVAL_ARTIFACT_MAX_BYTES = {
  deterministic: 2_000_000,
  responses: 512_000,
  liveAgent: 256_000,
} as const;

export type TreeDigest = {
  algorithm: "sha256";
  digest: string;
  fileCount: number;
  totalBytes: number;
};

export type QaStep = {
  id: string;
  command: string;
  args: string[];
};

export type QaStepResult = QaStep & {
  exitCode: number;
  status: "passed" | "failed";
};

export type QaStepRunner = (step: QaStep) => Promise<number>;

export type QaRuntimePaths = {
  repositoryRoot: string;
  visualRoot: string;
  deterministicReportPath: string;
  responsesCurrentPath: string;
  liveAgentCurrentPath: string;
  localQaReceiptPath: string;
};

export type QaRuntimeHooks = {
  writeJsonAtomicallyFn: typeof writeJsonAtomically;
  readFilteredGitStatusFn: typeof readFilteredGitStatus;
  readHeadCommitFn: typeof readHeadCommit;
  sha256FileFn: (path: string) => string;
  readFileFn: typeof readFileSync;
  existsFn: typeof existsSync;
};

export const QA_STEPS: readonly QaStep[] = [
  { id: "lint", command: "npm", args: ["run", "lint"] },
  { id: "typecheck", command: "npm", args: ["run", "typecheck"] },
  { id: "unit_component", command: "npm", args: ["run", "test"] },
  { id: "production_build", command: "npm", args: ["run", "build"] },
  {
    id: "bundle_budget",
    command: "npm",
    args: ["run", "check:bundle"],
  },
  { id: "end_to_end", command: "npm", args: ["run", "test:e2e"] },
  { id: "accessibility", command: "npm", args: ["run", "test:a11y"] },
  { id: "deterministic_evals", command: "npm", args: ["run", "evals"] },
  { id: "live_agent_record", command: "npm", args: ["run", "evals:live:validate"] },
  { id: "git_diff_check", command: "git", args: ["diff", "--check"] },
] as const;

export const QA_RECEIPT_STEPS: readonly QaStep[] = [
  ...QA_STEPS.slice(0, 8),
  {
    id: "responses_eval_validate",
    command: "npm",
    args: ["run", "evals:responses:validate"],
  },
  ...QA_STEPS.slice(8),
] as const;

function listFiles(
  root: string,
  existsFn: typeof existsSync,
  readdirFn: typeof readdirSync,
  directory = root,
): string[] {
  if (!existsFn(directory)) {
    return [];
  }
  return readdirFn(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(root, existsFn, readdirFn, path) : [relative(root, path)];
    });
}

export function digestAcceptedVisualArtifacts(
  root = defaultVisualRoot,
  hooks: Pick<QaRuntimeHooks, "existsFn" | "readFileFn"> = {
    existsFn: existsSync,
    readFileFn: readFileSync,
  },
): TreeDigest {
  const files = listFiles(root, hooks.existsFn, readdirSync);
  if (files.length === 0) {
    throw new Error("The accepted visual artifact tree is missing or empty.");
  }
  const hash = createHash("sha256");
  let totalBytes = 0;
  for (const path of files) {
    const bytes = hooks.readFileFn(join(root, path));
    totalBytes += statSync(join(root, path)).size;
    hash.update(path);
    hash.update("\0");
    hash.update(bytes);
    hash.update("\0");
  }
  return {
    algorithm: "sha256",
    digest: hash.digest("hex"),
    fileCount: files.length,
    totalBytes,
  };
}

let activeChild: ChildProcess | null = null;
let interruptedSignal: NodeJS.Signals | null = null;

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    interruptedSignal = signal;
    activeChild?.kill(signal);
  });
}

function runStep(step: QaStep, repositoryRoot: string): Promise<number> {
  console.log(`\n[qa] ${step.id}: ${step.command} ${step.args.join(" ")}`);
  return new Promise((resolveStep) => {
    const child = spawn(step.command, step.args, {
      cwd: repositoryRoot,
      env: process.env,
      stdio: "inherit",
    });
    activeChild = child;
    child.once("error", () => {
      activeChild = null;
      resolveStep(1);
    });
    child.once("exit", (code, signal) => {
      activeChild = null;
      if (signal || interruptedSignal) {
        resolveStep(interruptedSignal === "SIGTERM" ? 143 : 130);
        return;
      }
      resolveStep(code ?? 1);
    });
  });
}

function utcNow(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, ".000Z");
}

function resolveRuntime(
  options: {
    paths?: Partial<QaRuntimePaths>;
    hooks?: Partial<QaRuntimeHooks>;
  } = {},
): QaRuntimePaths & QaRuntimeHooks {
  const repositoryRoot = options.paths?.repositoryRoot ?? defaultRepositoryRoot;
  return {
    repositoryRoot,
    visualRoot: options.paths?.visualRoot ?? join(repositoryRoot, "artifacts", "visual-audit"),
    deterministicReportPath:
      options.paths?.deterministicReportPath ??
      join(repositoryRoot, "evals", "results", "deterministic-report.json"),
    responsesCurrentPath:
      options.paths?.responsesCurrentPath ??
      join(repositoryRoot, "evals", "responses-api", "results", "current.json"),
    liveAgentCurrentPath:
      options.paths?.liveAgentCurrentPath ??
      join(repositoryRoot, "evals", "live-agent", "current.json"),
    localQaReceiptPath: options.paths?.localQaReceiptPath ?? LOCAL_QA_RECEIPT_PATH,
    writeJsonAtomicallyFn: options.hooks?.writeJsonAtomicallyFn ?? writeJsonAtomically,
    readFilteredGitStatusFn: options.hooks?.readFilteredGitStatusFn ?? readFilteredGitStatus,
    readHeadCommitFn: options.hooks?.readHeadCommitFn ?? readHeadCommit,
    sha256FileFn: options.hooks?.sha256FileFn ?? sha256File,
    readFileFn: options.hooks?.readFileFn ?? readFileSync,
    existsFn: options.hooks?.existsFn ?? existsSync,
  };
}

function placeholderStatusDigest(): StatusDigest {
  return {
    algorithm: "sha256",
    digest: PLACEHOLDER_DIGEST,
    entryCount: 0,
  };
}

function placeholderTreeDigest(): TreeDigest {
  return {
    algorithm: "sha256",
    digest: PLACEHOLDER_DIGEST,
    fileCount: 0,
    totalBytes: 0,
  };
}

function buildSyntheticFailureStep(id: string): QaStepResult {
  return {
    id,
    command: "qa",
    args: ["preflight"],
    exitCode: 1,
    status: "failed",
  };
}

function readValidatedEvalArtifactDigest(
  path: string,
  maxBytes: number,
  validate: (parsed: unknown) => unknown,
  hooks: Pick<QaRuntimeHooks, "existsFn" | "readFileFn">,
): string | null {
  try {
    if (!hooks.existsFn(path)) {
      return null;
    }
    const bytes = hooks.readFileFn(path);
    if (!Buffer.isBuffer(bytes) || bytes.byteLength > maxBytes) {
      return null;
    }
    const parsed = JSON.parse(bytes.toString("utf8")) as unknown;
    validate(parsed);
    return createHash("sha256").update(bytes).digest("hex");
  } catch {
    return null;
  }
}

export function readValidatedEvalDigests(
  runtime: Pick<
    QaRuntimePaths & QaRuntimeHooks,
    | "deterministicReportPath"
    | "responsesCurrentPath"
    | "liveAgentCurrentPath"
    | "existsFn"
    | "readFileFn"
  >,
): {
  deterministicReportDigest: string | null;
  responsesCurrentDigest: string | null;
  liveAgentCurrentDigest: string | null;
  evalArtifactsValid: boolean;
} {
  const deterministicReportDigest = readValidatedEvalArtifactDigest(
    runtime.deterministicReportPath,
    EVAL_ARTIFACT_MAX_BYTES.deterministic,
    validateDeterministicReportData,
    runtime,
  );
  const responsesCurrentDigest = readValidatedEvalArtifactDigest(
    runtime.responsesCurrentPath,
    EVAL_ARTIFACT_MAX_BYTES.responses,
    validateResponsesRecordData,
    runtime,
  );
  const liveAgentCurrentDigest = readValidatedEvalArtifactDigest(
    runtime.liveAgentCurrentPath,
    EVAL_ARTIFACT_MAX_BYTES.liveAgent,
    (parsed) => liveAgentRecordSchema.parse(parsed),
    runtime,
  );
  return {
    deterministicReportDigest,
    responsesCurrentDigest,
    liveAgentCurrentDigest,
    evalArtifactsValid:
      deterministicReportDigest !== null &&
      responsesCurrentDigest !== null &&
      liveAgentCurrentDigest !== null,
  };
}

function buildQaReceipt(
  input: {
    candidateCommit: string;
    statusBefore: StatusDigest;
    statusAfter: StatusDigest;
    statusParity: boolean;
    steps: QaStepResult[];
    visualBefore: TreeDigest;
    visualAfter: TreeDigest;
    visualsIdentical: boolean;
    evalDigests: {
      deterministicReportDigest: string | null;
      responsesCurrentDigest: string | null;
      liveAgentCurrentDigest: string | null;
    };
  },
): Record<string, unknown> {
  const failedStep = input.steps.find((step) => step.status === "failed");
  const stepsPassed = failedStep === undefined;
  const evalDigestsComplete =
    input.evalDigests.deterministicReportDigest !== null &&
    input.evalDigests.responsesCurrentDigest !== null &&
    input.evalDigests.liveAgentCurrentDigest !== null;
  const status =
    stepsPassed && input.visualsIdentical && input.statusParity && evalDigestsComplete
      ? "passed"
      : "failed";
  return {
    schemaVersion: 1,
    generatedAt: utcNow(),
    status,
    candidateCommit: input.candidateCommit,
    workspace: {
      filteredClean: input.statusBefore.entryCount === 0,
      statusBefore: input.statusBefore,
      statusAfter: input.statusAfter,
      statusParity: input.statusParity,
    },
    steps: input.steps,
    visualArtifacts: {
      before: input.visualBefore,
      after: input.visualAfter,
      byteIdentical: input.visualsIdentical,
    },
    evalArtifacts: input.evalDigests,
  };
}

function receiptsEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function verifyReceiptWrite(
  runtime: QaRuntimePaths & QaRuntimeHooks,
  expectedReceipt: Record<string, unknown>,
): boolean {
  try {
    const receiptPath = resolve(runtime.repositoryRoot, runtime.localQaReceiptPath);
    if (!runtime.existsFn(receiptPath)) {
      return false;
    }
    const parsed = JSON.parse(runtime.readFileFn(receiptPath, "utf8")) as unknown;
    const validated = validateLocalQaReceipt(parsed);
    return receiptsEqual(validated, expectedReceipt);
  } catch {
    return false;
  }
}

function attemptWriteQaReceipt(input: {
  runtime: QaRuntimePaths & QaRuntimeHooks;
  steps: QaStepResult[];
  visualBefore: TreeDigest;
  visualAfter: TreeDigest;
  visualsIdentical: boolean;
  statusBefore: StatusDigest;
  prefetchedCandidateCommit: string | null;
  prefetchedStatusAfter: StatusDigest | null;
}): boolean {
  try {
    const syntheticSteps: QaStepResult[] = [];
    let statusAfter = input.prefetchedStatusAfter;
    if (statusAfter === null) {
      try {
        statusAfter = input.runtime.readFilteredGitStatusFn(input.runtime.repositoryRoot);
      } catch {
        statusAfter = placeholderStatusDigest();
        syntheticSteps.push(buildSyntheticFailureStep("workspace_status_read"));
      }
    }

    let candidateCommit = input.prefetchedCandidateCommit;
    if (candidateCommit === null) {
      try {
        candidateCommit = input.runtime.readHeadCommitFn(input.runtime.repositoryRoot);
      } catch {
        candidateCommit = PLACEHOLDER_COMMIT;
        syntheticSteps.push(buildSyntheticFailureStep("candidate_head_read"));
      }
    }

    const evalResult = readValidatedEvalDigests(input.runtime);
    if (!evalResult.evalArtifactsValid) {
      syntheticSteps.push(buildSyntheticFailureStep("eval_artifact_validation"));
    }

    const statusParity =
      syntheticSteps.some((step) => step.id === "workspace_status_read")
        ? false
        : input.statusBefore.digest === statusAfter.digest;
    const steps = [...input.steps, ...syntheticSteps];
    const receipt = buildQaReceipt({
      candidateCommit,
      statusBefore: input.statusBefore,
      statusAfter,
      statusParity,
      steps,
      visualBefore: input.visualBefore,
      visualAfter: input.visualAfter,
      visualsIdentical: input.visualsIdentical,
      evalDigests: {
        deterministicReportDigest: evalResult.deterministicReportDigest,
        responsesCurrentDigest: evalResult.responsesCurrentDigest,
        liveAgentCurrentDigest: evalResult.liveAgentCurrentDigest,
      },
    });
    validateLocalQaReceipt(receipt);
    input.runtime.writeJsonAtomicallyFn(
      resolve(input.runtime.repositoryRoot, input.runtime.localQaReceiptPath),
      receipt,
      { mode: 0o600 },
    );
    return verifyReceiptWrite(input.runtime, receipt);
  } catch {
    return false;
  }
}

function readLiveAgentStatus(
  runtime: Pick<QaRuntimePaths & QaRuntimeHooks, "liveAgentCurrentPath" | "readFileFn" | "existsFn">,
): string {
  try {
    if (!runtime.existsFn(runtime.liveAgentCurrentPath)) {
      return "not_run";
    }
    const bytes = runtime.readFileFn(runtime.liveAgentCurrentPath);
    const liveAgentRecord = JSON.parse(bytes.toString()) as { status?: string };
    return liveAgentRecord.status ?? "invalid";
  } catch {
    return "invalid";
  }
}

function printQaSummary(summary: Record<string, unknown>): void {
  console.log(`\n${JSON.stringify(summary, null, 2)}`);
}

export async function runQa(options: {
  stepRunner?: QaStepRunner;
  steps?: readonly QaStep[];
  digestVisualArtifacts?: () => TreeDigest;
  writeReceipt?: boolean;
  paths?: Partial<QaRuntimePaths>;
  hooks?: Partial<QaRuntimeHooks>;
} = {}): Promise<number> {
  const runtime = resolveRuntime({ paths: options.paths, hooks: options.hooks });
  const stepRunner =
    options.stepRunner ??
    ((step: QaStep) => runStep(step, runtime.repositoryRoot));
  const steps = options.steps ?? (options.writeReceipt ? QA_RECEIPT_STEPS : QA_STEPS);
  const digestVisualArtifacts =
    options.digestVisualArtifacts ??
    (() =>
      digestAcceptedVisualArtifacts(runtime.visualRoot, {
        existsFn: runtime.existsFn,
        readFileFn: runtime.readFileFn,
      }));
  const writeReceipt = options.writeReceipt ?? false;

  const completed: string[] = [];
  const stepResults: QaStepResult[] = [];
  let firstFailedStep: string | null = null;
  let exitCode = 0;
  let receiptWritten = false;
  let statusBefore: StatusDigest | null = null;
  let prefetchedCandidateCommit: string | null = null;
  let visualBefore: TreeDigest | null = null;
  let visualAfter: TreeDigest | null = null;
  let visualsIdentical = true;

  if (writeReceipt) {
    try {
      statusBefore = runtime.readFilteredGitStatusFn(runtime.repositoryRoot);
    } catch {
      exitCode = 1;
      firstFailedStep = "workspace_status_read";
      const placeholderDigest = placeholderTreeDigest();
      receiptWritten = attemptWriteQaReceipt({
        runtime,
        steps: [buildSyntheticFailureStep("workspace_status_read")],
        visualBefore: placeholderDigest,
        visualAfter: placeholderDigest,
        visualsIdentical: true,
        statusBefore: placeholderStatusDigest(),
        prefetchedCandidateCommit: null,
        prefetchedStatusAfter: placeholderStatusDigest(),
      });
      printQaSummary({
        status: "fail",
        completed,
        firstFailedStep,
        liveAgentStatus: readLiveAgentStatus(runtime),
        liveAgentIncludedInPassCount: false,
        visualDigestBefore: placeholderDigest.digest,
        visualDigestAfter: placeholderDigest.digest,
        visualArtifacts: {
          before: placeholderDigest,
          after: placeholderDigest,
          byteIdentical: true,
        },
        receiptPath: runtime.localQaReceiptPath,
        receiptWritten,
      });
      if (!receiptWritten) {
        console.error("Local QA receipt could not be written.");
      }
      return exitCode;
    }

    try {
      prefetchedCandidateCommit = runtime.readHeadCommitFn(runtime.repositoryRoot);
    } catch {
      prefetchedCandidateCommit = null;
    }
  }

  try {
    visualBefore = digestVisualArtifacts();
  } catch {
    exitCode = 1;
    firstFailedStep = "visual_artifact_integrity";
    if (writeReceipt && statusBefore) {
      const placeholderDigest = placeholderTreeDigest();
      receiptWritten = attemptWriteQaReceipt({
        runtime,
        steps: [buildSyntheticFailureStep("visual_artifact_integrity")],
        visualBefore: placeholderDigest,
        visualAfter: placeholderDigest,
        visualsIdentical: false,
        statusBefore,
        prefetchedCandidateCommit,
        prefetchedStatusAfter: null,
      });
    }
    printQaSummary({
      status: "fail",
      completed,
      firstFailedStep,
      liveAgentStatus: readLiveAgentStatus(runtime),
      liveAgentIncludedInPassCount: false,
      visualDigestBefore: visualBefore?.digest ?? PLACEHOLDER_DIGEST,
      visualDigestAfter: visualBefore?.digest ?? PLACEHOLDER_DIGEST,
      visualArtifacts: {
        before: visualBefore,
        after: visualBefore,
        byteIdentical: false,
      },
      ...(writeReceipt
        ? {
            receiptPath: runtime.localQaReceiptPath,
            receiptWritten,
          }
        : {}),
    });
    if (writeReceipt && !receiptWritten) {
      console.error("Local QA receipt could not be written.");
    }
    return exitCode;
  }

  for (const step of steps) {
    const code = await stepRunner(step);
    stepResults.push({
      ...step,
      exitCode: code,
      status: code === 0 ? "passed" : "failed",
    });
    if (code !== 0) {
      firstFailedStep = step.id;
      exitCode = code;
      break;
    }
    completed.push(step.id);
  }

  try {
    visualAfter = digestVisualArtifacts();
  } catch {
    exitCode = exitCode === 0 ? 1 : exitCode;
    firstFailedStep = firstFailedStep ?? "visual_artifact_integrity";
    visualAfter = visualBefore;
    visualsIdentical = false;
    stepResults.push(buildSyntheticFailureStep("visual_artifact_integrity"));
  }

  if (visualAfter) {
    visualsIdentical =
      visualBefore.digest === visualAfter.digest &&
      visualBefore.fileCount === visualAfter.fileCount &&
      visualBefore.totalBytes === visualAfter.totalBytes;
    if (!visualsIdentical && exitCode === 0) {
      firstFailedStep = "visual_artifact_integrity";
      exitCode = 1;
      stepResults.push({
        id: "visual_artifact_integrity",
        command: "qa",
        args: ["visual-artifact-integrity"],
        exitCode: 1,
        status: "failed",
      });
    }
  }

  const liveAgentStatus = readLiveAgentStatus(runtime);

  if (writeReceipt && statusBefore && visualBefore && visualAfter) {
    const evalResult = readValidatedEvalDigests(runtime);
    if (!evalResult.evalArtifactsValid && exitCode === 0) {
      firstFailedStep = "eval_artifact_validation";
      exitCode = 1;
    } else if (!evalResult.evalArtifactsValid) {
      firstFailedStep = firstFailedStep ?? "eval_artifact_validation";
    }

    receiptWritten = attemptWriteQaReceipt({
      runtime,
      steps: stepResults.length > 0 ? stepResults : [buildSyntheticFailureStep("qa_preflight")],
      visualBefore,
      visualAfter,
      visualsIdentical,
      statusBefore,
      prefetchedCandidateCommit,
      prefetchedStatusAfter: null,
    });
    if (!receiptWritten) {
      exitCode = exitCode === 0 ? 1 : exitCode;
    } else if (!evalResult.evalArtifactsValid) {
      exitCode = exitCode === 0 ? 1 : exitCode;
    }
  }

  printQaSummary({
    status: exitCode === 0 ? "pass" : "fail",
    completed,
    firstFailedStep,
    liveAgentStatus,
    liveAgentIncludedInPassCount: false,
    visualDigestBefore: visualBefore.digest,
    visualDigestAfter: visualAfter.digest,
    visualArtifacts: {
      before: visualBefore,
      after: visualAfter,
      byteIdentical: visualsIdentical,
    },
    ...(writeReceipt
      ? {
          receiptPath: runtime.localQaReceiptPath,
          receiptWritten,
        }
      : {}),
  });
  if (writeReceipt && !receiptWritten) {
    console.error("Local QA receipt could not be written.");
  }
  return exitCode;
}

const writeReceipt = process.argv.includes("--write-receipt");

if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) {
  process.exitCode = await runQa({ writeReceipt });
}
