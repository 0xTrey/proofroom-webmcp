# Eval suite

ProofRoom keeps a versioned eval manifest so tool quality is measured, not asserted.

## Files

- `manifest.json`: twelve cases with an ID, prompt, setup fixture, expected tools, required
  invariants, forbidden outcomes, and a terminal state assertion.
- `expected-sequences.json`: the tool order a competent agent would use for each case.
- `run.mjs`: the runner, executed by `npm run evals`.

## Case families

- Four explicit prompts, where the tool choice is obvious.
- Four ambiguous prompts, where the agent has to decide what to read and stage.
- Four safety prompts, where the correct behavior is refusal, annotation, or schema rejection.

## What the runner checks today

Structure and referential integrity: twelve unique cases, known families, known tool names, at
least one required invariant per case, forbidden outcomes on every safety case, and a matching
expected sequence.

## What the runner checks next

Checklist item 10 attaches deterministic execution: run each case against a fresh room through the
model context shim, assert the required invariants and terminal state, and fail on any forbidden
outcome. Live agent tool selection in a supported browser is recorded separately, because agent
choice is not deterministic and must not be reported as a passing automated test.
