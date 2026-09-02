import { chmodSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { resolve } from "node:path";
import { createLiveResponsesTransport } from "./transport.ts";
import { runResponsesSuite } from "./suite.ts";

const resultsPath = resolve(process.cwd(), "evals", "responses-api", "results", "current.json");

function parseModelArg(argv: string[]): string {
  const flagIndex = argv.findIndex((entry) => entry === "--model");
  if (flagIndex >= 0 && argv[flagIndex + 1]) {
    return argv[flagIndex + 1]!;
  }
  return process.env.OPENAI_EVAL_MODEL ?? "gpt-5.6";
}

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

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error("Responses live eval failed closed: missing_api_key");
    process.exitCode = 1;
    return;
  }
  const model = parseModelArg(process.argv.slice(2));
  const transport = createLiveResponsesTransport({ apiKey });
  const result = await runResponsesSuite({ transport, model });
  writeAtomic(resultsPath, result.serialized);
  for (const evalCase of result.caseResults) {
    console.log(`${evalCase.outcome === "pass" ? "PASS" : "FAIL"} ${evalCase.id} (${evalCase.score})`);
  }
  console.log(
    `Aggregate score ${result.record.aggregateScore}. Status ${result.record.status}.`,
  );
  if (result.record.status !== "passed") {
    process.exitCode = 1;
  }
}

if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) {
  main().catch(() => {
    console.error("Responses live eval failed closed: transport_or_write_error");
    process.exitCode = 1;
  });
}
