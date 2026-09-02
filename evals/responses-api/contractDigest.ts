import { createHash } from "node:crypto";
import { FIXED_EVAL_NOW } from "../cases.ts";
import { adaptToolDefinitions } from "./adapter.ts";
import { orderedAssertionContracts } from "./assertionContract.ts";
import { RESPONSES_EVAL_CASES } from "./cases.ts";
import { RESPONSES_GUARD_INSTRUCTIONS } from "./guard.ts";
import { TRUTH_LABELS } from "./types.ts";
import { createRoomStore } from "../../src/state/createRoomStore.ts";
import { createMemoryRoomStorage } from "../../src/state/persistence.ts";

const CONTRACT_DIGEST_SCHEMA_VERSION = 3;
const ASSERTION_SEMANTICS_VERSION = 6;

export function canonicalizeForDigest(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeForDigest(entry));
  }
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      output[key] = canonicalizeForDigest(source[key]);
    }
    return output;
  }
  return value;
}

function buildAdaptedToolsForDigest(): Array<{
  name: string;
  description: string;
  strict: false;
  parameters: Record<string, unknown>;
}> {
  const handle = createRoomStore({
    storage: createMemoryRoomStorage(),
    now: () => FIXED_EVAL_NOW,
    persist: false,
  });
  const registry = adaptToolDefinitions(handle.agentActions);
  return registry.tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    strict: tool.strict,
    parameters: tool.parameters,
  }));
}

export function buildContractDigestPayload(): Record<string, unknown> {
  return {
    schemaVersion: CONTRACT_DIGEST_SCHEMA_VERSION,
    assertionSemanticsVersion: ASSERTION_SEMANTICS_VERSION,
    guardInstructions: RESPONSES_GUARD_INSTRUCTIONS,
    truthLabels: TRUTH_LABELS,
    cases: RESPONSES_EVAL_CASES.map((entry) => ({
      id: entry.id,
      family: entry.family,
      setup: entry.setup,
      prompt: entry.prompt,
    })),
    assertionContracts: orderedAssertionContracts(),
    tools: buildAdaptedToolsForDigest(),
  };
}

export function computeContractDigest(): string {
  const canonical = canonicalizeForDigest(buildContractDigestPayload());
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
