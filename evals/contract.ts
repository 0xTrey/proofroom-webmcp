import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { AGENT_ACTION_NAMES } from "../src/domain/actions/index.ts";

const evalDirectory = resolve(process.cwd(), "evals");
const defaultManifestPath = resolve(evalDirectory, "manifest.json");
const defaultSequencesPath = resolve(evalDirectory, "expected-sequences.json");

export const EVAL_CASE_IDS = [
  "eval_001_canonical_journey",
  "eval_002_salesforce_evidence_only",
  "eval_003_budget_ceiling_90k",
  "eval_004_two_briefs",
  "eval_005_is_this_a_fit",
  "eval_006_make_this_relevant",
  "eval_007_missing_security_evidence",
  "eval_008_update_after_budget_change",
  "eval_009_force_eu_supported",
  "eval_010_testimonial_injection",
  "eval_011_stale_approval",
  "eval_012_unknown_keys_and_oversized_text",
] as const;

export const EVAL_FAMILIES = ["explicit", "ambiguous", "safety"] as const;
export const EVAL_SETUPS = [
  "canonical_reset",
  "evidence_attached",
  "evidence_attached_budget_90k",
  "stale_context_proposal",
] as const;

const toolNameSchema = z.enum(AGENT_ACTION_NAMES);
const assertionReferenceSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9_]+$/),
  description: z.string().min(8).max(240),
});

const evalCaseSchema = z.strictObject({
  id: z.enum(EVAL_CASE_IDS),
  family: z.enum(EVAL_FAMILIES),
  prompt: z.string().min(12).max(600),
  setup: z.enum(EVAL_SETUPS),
  expectedTools: z.array(toolNameSchema).max(AGENT_ACTION_NAMES.length),
  requiredInvariants: z.array(assertionReferenceSchema).min(1),
  forbiddenOutcomes: z.array(assertionReferenceSchema).min(1),
  terminalState: assertionReferenceSchema,
});

export const evalManifestSchema = z.strictObject({
  version: z.literal(2),
  room: z.literal("northstar_meridian_room"),
  notes: z.string().min(20).max(500),
  cases: z.array(evalCaseSchema).length(12),
});

export const expectedSequencesSchema = z.strictObject({
  version: z.literal(2),
  notes: z.string().min(20).max(500),
  sequences: z.record(z.enum(EVAL_CASE_IDS), z.array(toolNameSchema).max(24)),
});

export type EvalManifest = z.infer<typeof evalManifestSchema>;
export type EvalCase = EvalManifest["cases"][number];
export type ToolName = z.infer<typeof toolNameSchema>;
export type ExpectedSequences = z.infer<typeof expectedSequencesSchema>;

export type EvalContract = {
  manifest: EvalManifest;
  sequences: ExpectedSequences;
  manifestDigest: string;
  expectedSequenceDigest: string;
  manifestPath: string;
  sequencesPath: string;
  evalDirectory: string;
};

const REQUIRED_READ_BEFORE_MUTATION: ReadonlyArray<{
  caseId: (typeof EVAL_CASE_IDS)[number];
  read: ToolName;
  mutation: ToolName;
}> = [
  {
    caseId: "eval_001_canonical_journey",
    read: "get_room_state",
    mutation: "propose_buyer_context",
  },
  {
    caseId: "eval_004_two_briefs",
    read: "get_room_state",
    mutation: "save_stakeholder_brief",
  },
  {
    caseId: "eval_006_make_this_relevant",
    read: "get_room_state",
    mutation: "propose_buyer_context",
  },
  {
    caseId: "eval_008_update_after_budget_change",
    read: "get_room_state",
    mutation: "propose_decision_status",
  },
];

function parseJson(path: string): { parsed: unknown; raw: Buffer } {
  const raw = readFileSync(path);
  return { parsed: JSON.parse(raw.toString("utf8")) as unknown, raw };
}

function assertEqualSets(label: string, actual: Iterable<string>, expected: Iterable<string>): void {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = [...expectedSet].filter((value) => !actualSet.has(value));
  const extra = [...actualSet].filter((value) => !expectedSet.has(value));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `${label} mismatch. Missing: ${missing.join(", ") || "none"}. Extra: ${extra.join(", ") || "none"}.`,
    );
  }
}

function uniqueInOrder(values: readonly string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}

export function loadEvalContract(options: {
  assertionIds: ReadonlySet<string>;
  executorIds: ReadonlySet<string>;
  paths?: { manifestPath: string; sequencesPath: string };
}): EvalContract {
  const manifestPath = options.paths?.manifestPath ?? defaultManifestPath;
  const sequencesPath = options.paths?.sequencesPath ?? defaultSequencesPath;
  const manifestSource = parseJson(manifestPath);
  const sequencesSource = parseJson(sequencesPath);
  const manifest = evalManifestSchema.parse(manifestSource.parsed);
  const sequences = expectedSequencesSchema.parse(sequencesSource.parsed);

  assertEqualSets("manifest case IDs", manifest.cases.map((entry) => entry.id), EVAL_CASE_IDS);
  assertEqualSets("expected-sequence case IDs", Object.keys(sequences.sequences), EVAL_CASE_IDS);
  assertEqualSets("executor case IDs", options.executorIds, manifest.cases.map((entry) => entry.id));

  for (const family of EVAL_FAMILIES) {
    const count = manifest.cases.filter((entry) => entry.family === family).length;
    if (count !== 4) {
      throw new Error(`Expected four ${family} cases, found ${count}.`);
    }
  }

  const referencedAssertionIds: string[] = [];
  for (const entry of manifest.cases) {
    const sequence = sequences.sequences[entry.id];
    if (!sequence) {
      throw new Error(`Missing expected sequence for ${entry.id}.`);
    }
    const expectedTools = uniqueInOrder(sequence);
    if (JSON.stringify(entry.expectedTools) !== JSON.stringify(expectedTools)) {
      throw new Error(
        `${entry.id} expectedTools must equal the sequence's unique tools in first-call order.`,
      );
    }

    const caseAssertionIds = [
      ...entry.requiredInvariants.map((assertion) => assertion.id),
      ...entry.forbiddenOutcomes.map((assertion) => assertion.id),
      entry.terminalState.id,
    ];
    if (new Set(caseAssertionIds).size !== caseAssertionIds.length) {
      throw new Error(`${entry.id} repeats an assertion identifier.`);
    }
    referencedAssertionIds.push(...caseAssertionIds);
  }

  for (const dependency of REQUIRED_READ_BEFORE_MUTATION) {
    const sequence = sequences.sequences[dependency.caseId];
    const readIndex = sequence.indexOf(dependency.read);
    const mutationIndex = sequence.indexOf(dependency.mutation);
    if (mutationIndex !== -1 && (readIndex === -1 || readIndex > mutationIndex)) {
      throw new Error(
        `${dependency.caseId} must sequence ${dependency.read} before ${dependency.mutation}.`,
      );
    }
  }
  assertEqualSets("assertion registry IDs", options.assertionIds, referencedAssertionIds);

  return {
    manifest,
    sequences,
    manifestDigest: createHash("sha256").update(manifestSource.raw).digest("hex"),
    expectedSequenceDigest: createHash("sha256").update(sequencesSource.raw).digest("hex"),
    manifestPath,
    sequencesPath,
    evalDirectory,
  };
}
