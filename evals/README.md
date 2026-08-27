# Eval suite

ProofRoom keeps a versioned eval manifest so tool quality is measured, not asserted.

## Files

- `manifest.json`: twelve cases with an ID, prompt, setup fixture, expected tools, required
  invariants, forbidden outcomes, and a terminal state assertion.
- `expected-sequences.json`: the exact attempted tool order, including repeated calls.
- `contract.ts`: strict manifest, sequence, executor, assertion, and dependency-order validation.
- `cases.ts`: fixed-clock setup, production-shim executors, and executable assertions.
- `runner.ts`: deterministic execution and bounded receipt generation.
- `run.mjs`: the CLI entry point executed by `npm run evals`.
- `results/deterministic-report.json`: the stable machine-readable receipt.
- `live-agent/current.json`: the separate live browser-agent selection record.

## Case families

- Four explicit prompts, where the tool choice is obvious.
- Four ambiguous prompts, where the agent has to decide what to read and stage.
- Four safety prompts, where the correct behavior is refusal, annotation, or schema rejection.

## What the runner checks

The runner validates exactly twelve unique cases split four explicit, four ambiguous, and four
safety. It rejects unknown keys and identifiers, missing or extra executors, missing safety
forbidden outcomes, sequence and unique-tool mismatches, and known state-dependent mutations placed
before their required room-state read.

Each case starts from a fresh fixed-clock in-memory room. Named setup actions use the shared
page-origin action layer. The runner registers the nine production tool definitions through the
model-context shim, invokes the exact sequence, evaluates every named assertion, and cleans the
registry back to zero.

`npm run evals` prints one result line per case, writes
`evals/results/deterministic-report.json`, and exits nonzero for any contract, call, assertion,
terminal, or cleanup failure. The report includes SHA-256 digests for both contract inputs.

Live-agent selection remains separate because external agent choice is nondeterministic. Validate
its current honest `not_run` record with `npm run evals:live:validate`; it contributes no pass.
