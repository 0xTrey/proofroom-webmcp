import { resolve } from "node:path";
import { writeJsonAtomically } from "./rc-gate/atomicWrite.ts";
import {
  printLaneSummary,
  RC_GATE_ARTIFACT_PATH,
  refreshRcGateReceipt,
  validateRcGateReceipt,
  validateRcGateReceiptDocument,
} from "./rc-gate/runtime.ts";

const repositoryRoot = process.cwd();
const command = process.argv[2] ?? "gate";

function exitWithReceipt(receipt: ReturnType<typeof refreshRcGateReceipt>, hardGate: boolean): void {
  printLaneSummary(receipt);
  if (hardGate && receipt.status !== "ready") {
    process.exitCode = 1;
    return;
  }
  if (!hardGate && command === "validate") {
    console.log(receipt.status === "ready" ? "READY" : "BLOCKED");
    if (receipt.blockingReasons.length > 0) {
      for (const reason of receipt.blockingReasons) {
        console.log(`${reason.code}: ${reason.message}`);
      }
    }
  }
}

async function main(): Promise<void> {
  if (command === "refresh") {
    const receipt = refreshRcGateReceipt(repositoryRoot);
    validateRcGateReceiptDocument(receipt);
    writeJsonAtomically(resolve(repositoryRoot, RC_GATE_ARTIFACT_PATH), receipt, {
      mode: 0o600,
    });
    exitWithReceipt(receipt, false);
    return;
  }

  if (command === "validate" || command === "gate") {
    const artifactPath = resolve(repositoryRoot, RC_GATE_ARTIFACT_PATH);
    let persisted;
    try {
      const { readFileSync } = await import("node:fs");
      persisted = validateRcGateReceiptDocument(
        JSON.parse(readFileSync(artifactPath, "utf8")) as unknown,
      );
    } catch (error) {
      console.error(
        error instanceof Error ? error.message : "Persisted RC gate receipt is missing or invalid.",
      );
      process.exitCode = 1;
      return;
    }
    let receipt;
    try {
      receipt = validateRcGateReceipt(repositoryRoot, persisted);
    } catch (error) {
      console.error(
        error instanceof Error ? error.message : "RC gate receipt failed final validation.",
      );
      process.exitCode = 1;
      return;
    }
    exitWithReceipt(receipt, command === "gate");
    return;
  }

  console.error(`Unknown RC gate command: ${command}`);
  process.exitCode = 1;
}

if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "RC gate command failed.");
    process.exitCode = 1;
  });
}
