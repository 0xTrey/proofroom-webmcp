import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const repositoryRoot = process.cwd();
const visualRoot = join(repositoryRoot, "artifacts", "visual-audit");

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

export type QaStepRunner = (step: QaStep) => Promise<number>;

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

function listFiles(root: string, directory = root): string[] {
  if (!existsSync(directory)) {
    return [];
  }
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(root, path) : [relative(root, path)];
    });
}

export function digestAcceptedVisualArtifacts(root = visualRoot): TreeDigest {
  const files = listFiles(root);
  if (files.length === 0) {
    throw new Error("The accepted visual artifact tree is missing or empty.");
  }
  const hash = createHash("sha256");
  let totalBytes = 0;
  for (const path of files) {
    const bytes = readFileSync(join(root, path));
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

function runStep(step: QaStep): Promise<number> {
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

export async function runQa(options: {
  stepRunner?: QaStepRunner;
  steps?: readonly QaStep[];
  digestVisualArtifacts?: () => TreeDigest;
} = {}): Promise<number> {
  const stepRunner = options.stepRunner ?? runStep;
  const steps = options.steps ?? QA_STEPS;
  const digestVisualArtifacts =
    options.digestVisualArtifacts ?? digestAcceptedVisualArtifacts;
  const visualBefore = digestVisualArtifacts();
  const completed: string[] = [];
  let firstFailedStep: string | null = null;
  let exitCode = 0;

  for (const step of steps) {
    const code = await stepRunner(step);
    if (code !== 0) {
      firstFailedStep = step.id;
      exitCode = code;
      break;
    }
    completed.push(step.id);
  }

  const visualAfter = digestVisualArtifacts();
  const visualsIdentical =
    visualBefore.digest === visualAfter.digest &&
    visualBefore.fileCount === visualAfter.fileCount &&
    visualBefore.totalBytes === visualAfter.totalBytes;
  if (!visualsIdentical && exitCode === 0) {
    firstFailedStep = "visual_artifact_integrity";
    exitCode = 1;
  }
  const liveAgentRecord = JSON.parse(
    readFileSync(join(repositoryRoot, "evals", "live-agent", "current.json"), "utf8"),
  ) as { status?: string };

  console.log(
    `\n${JSON.stringify(
      {
        status: exitCode === 0 ? "pass" : "fail",
        completed,
        firstFailedStep,
        liveAgentStatus: liveAgentRecord.status ?? "invalid",
        liveAgentIncludedInPassCount: false,
        visualDigestBefore: visualBefore.digest,
        visualDigestAfter: visualAfter.digest,
        visualArtifacts: {
          before: visualBefore,
          after: visualAfter,
          byteIdentical: visualsIdentical,
        },
      },
      null,
      2,
    )}`,
  );
  return exitCode;
}

if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) {
  process.exitCode = await runQa();
}
