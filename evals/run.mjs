#!/usr/bin/env node
/**
 * Eval manifest runner.
 *
 * This milestone builds the manifest and a controlled runner that validates its
 * structure, uniqueness, tool references, and sequence coverage. Executing the
 * twelve cases against the room and recording live agent selection is checklist
 * item 10, and this runner is where that execution will attach.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const here = new URL("./", import.meta.url);

const TOOL_NAMES = [
  "get_room_state",
  "search_product_evidence",
  "evaluate_requirement",
  "calculate_roi",
  "propose_buyer_context",
  "stage_requirement",
  "attach_evidence",
  "save_stakeholder_brief",
  "propose_decision_status",
];

const FAMILIES = new Set(["explicit", "ambiguous", "safety"]);
const REQUIRED_CASE_KEYS = [
  "id",
  "family",
  "prompt",
  "setup",
  "expectedTools",
  "requiredInvariants",
  "forbiddenOutcomes",
  "terminalState",
];

const manifest = JSON.parse(await readFile(new URL("manifest.json", here), "utf8"));
const sequences = JSON.parse(await readFile(new URL("expected-sequences.json", here), "utf8"));

const problems = [];

if (manifest.cases.length !== 12) {
  problems.push(`Expected 12 cases, found ${manifest.cases.length}.`);
}

const ids = new Set();

for (const testCase of manifest.cases) {
  for (const key of REQUIRED_CASE_KEYS) {
    if (!(key in testCase)) {
      problems.push(`${testCase.id ?? "unknown case"} is missing ${key}.`);
    }
  }

  if (ids.has(testCase.id)) {
    problems.push(`Duplicate case ID ${testCase.id}.`);
  }
  ids.add(testCase.id);

  if (!FAMILIES.has(testCase.family)) {
    problems.push(`${testCase.id} has an unknown family ${testCase.family}.`);
  }

  for (const tool of testCase.expectedTools) {
    if (!TOOL_NAMES.includes(tool)) {
      problems.push(`${testCase.id} references unknown tool ${tool}.`);
    }
  }

  if (testCase.requiredInvariants.length === 0) {
    problems.push(`${testCase.id} declares no required invariant.`);
  }

  if (!(testCase.id in sequences.sequences)) {
    problems.push(`${testCase.id} has no expected sequence.`);
  }
}

for (const [id, sequence] of Object.entries(sequences.sequences)) {
  if (!ids.has(id)) {
    problems.push(`Expected sequence ${id} has no matching case.`);
  }
  for (const tool of sequence) {
    if (!TOOL_NAMES.includes(tool)) {
      problems.push(`Sequence ${id} references unknown tool ${tool}.`);
    }
  }
}

const safetyCases = manifest.cases.filter((testCase) => testCase.family === "safety");
if (safetyCases.length < 4) {
  problems.push(`Expected at least 4 safety cases, found ${safetyCases.length}.`);
}

for (const testCase of safetyCases) {
  if (testCase.forbiddenOutcomes.length === 0) {
    problems.push(`Safety case ${testCase.id} declares no forbidden outcome.`);
  }
}

if (problems.length > 0) {
  console.error(`Eval manifest validation failed in ${fileURLToPath(here)}:`);
  for (const problem of problems) {
    console.error(`  ${problem}`);
  }
  process.exit(1);
}

console.log(
  `Eval manifest is valid: ${manifest.cases.length} cases, ${safetyCases.length} safety cases, ${TOOL_NAMES.length} known tools.`,
);
console.log("Case execution against the live room lands with checklist item 10.");
