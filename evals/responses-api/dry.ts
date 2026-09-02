import { chmodSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { adaptToolDefinitions, validateAdaptedTools } from "./adapter.ts";
import { RESPONSES_EVAL_CASES, validateResponsesCases } from "./cases.ts";
import { buildNotRunRecord } from "./suite.ts";
import { assertArtifactByteCeiling } from "./artifactBounds.ts";
import { assertArtifactSafe } from "./redaction.ts";
import {
  validateResponsesRecord,
  validateResponsesRecordData,
  assertTruthLabels,
} from "./validate.ts";
import { createRoomStore } from "../../src/state/createRoomStore.ts";
import { createMemoryRoomStorage } from "../../src/state/persistence.ts";
import { FIXED_EVAL_NOW } from "../cases.ts";

const canonicalResultsPath = resolve(
  process.cwd(),
  "evals",
  "responses-api",
  "results",
  "current.json",
);

export type RunResponsesDryOptions = {
  /** In-process test seam only. The CLI always writes the canonical current receipt. */
  resultsPath?: string;
};

function writeAtomic(path: string, contents: string): void {
  const directory = dirname(path);
  const tempPath = join(directory, ".current.json.tmp");
  try {
    writeFileSync(tempPath, contents, { mode: 0o600 });
    try {
      chmodSync(tempPath, 0o600);
    } catch {
      // Restrictive permissions are best-effort on platforms that support them.
    }
    renameSync(tempPath, path);
  } catch {
    try {
      unlinkSync(tempPath);
    } catch {
      // Ignore cleanup failures after a failed write.
    }
    throw new Error("atomic_write_failed");
  }
}

export function runResponsesDry(options?: RunResponsesDryOptions): void {
  const destinationPath = options?.resultsPath ?? canonicalResultsPath;
  validateResponsesCases();
  const handle = createRoomStore({
    storage: createMemoryRoomStorage(),
    now: () => FIXED_EVAL_NOW,
    persist: false,
  });
  const registry = adaptToolDefinitions(handle.agentActions);
  validateAdaptedTools(registry.tools);

  for (const evalCase of RESPONSES_EVAL_CASES) {
    if (!evalCase.prompt.trim()) {
      throw new Error(`Case ${evalCase.id} has an empty prompt.`);
    }
  }

  const seed = buildNotRunRecord(
    "No live OpenAI Responses eval has been run. Codex runs the live CLI after independent review.",
  );
  const seedSerialized = `${JSON.stringify(seed, null, 2)}\n`;
  assertArtifactByteCeiling(seedSerialized);
  assertArtifactSafe(seedSerialized);
  validateResponsesRecordData(seed);
  assertTruthLabels(validateResponsesRecordData(seed));
  writeAtomic(destinationPath, seedSerialized);

  const record = validateResponsesRecord(destinationPath);
  assertTruthLabels(record);
  console.log(`Responses dry check passed for ${RESPONSES_EVAL_CASES.length} cases.`);
  console.log(`Result path: ${destinationPath}`);
}

if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) {
  try {
    runResponsesDry();
  } catch {
    console.error("Responses dry check failed: validation_error");
    process.exitCode = 1;
  }
}
