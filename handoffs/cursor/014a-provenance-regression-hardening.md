# Cursor work order 014a: harden the provenance regression proof

## Objective

Close the one remaining audit gap in work order 014 without changing product behavior.

The current `eval_001_canonical_journey` and `eval_006_make_this_relevant` executors correctly read
`buyerContextStagingTemplate.input` from `get_room_state` and pass that validated object to
`propose_buyer_context`. The current digest assertion proves value equality. Because the canonical
template and `MERIDIAN_CONTEXT_DRAFT` have identical values, however, that assertion alone would
not catch a future regression that reintroduced the fixture directly into either executor.

Use the eval runner's existing `transformToolResult` hook to prove that the executor follows a
controlled, schema-valid variation in the immediately preceding read result. Also prove that the
existing strict schema rejects added and missing fields before the mutation runs.

This is test and assertion hardening only. Do not change runtime tool output, the proposal schema,
the nine-tool registry, application UI, fixtures, deterministic manifest, expected sequences,
release evidence, deployment, or Devpost.

## Repository and starting state

Work only in:

`/Users/treyharnden/Projects/proofroom-webmcp`

Preserve the entire current dirty working tree, including accepted work orders 011 through 014.
Do not reset, clean, restore, or overwrite unrelated changes.

Read completely before editing:

- `AGENTS.md`
- `handoffs/cursor/014-agent-input-provenance.md`
- `evals/cases.ts`
- `evals/runner.ts`
- `tests/evals/runner.test.ts`
- `src/domain/actions/inputs.ts`
- `src/domain/schemas.ts`

## Required changes

### 1. Prove the executor follows the returned tool result

Add a focused runner regression test for `eval_006_make_this_relevant` that uses
`transformToolResult` to change one schema-valid, non-sensitive template input value in the
`get_room_state` result before it is returned to the executor. Use a bounded numeric field such as
`budgetCeiling` and keep the value inside the existing schema.

The test must prove all of the following:

- the case completes with the exact expected two-call sequence
- `propose_buyer_context` receives the digest of the transformed template input
- the provenance assertion passes
- the staged proposal contains the transformed value
- approved buyer context remains null

If either executor later passes `MERIDIAN_CONTEXT_DRAFT` directly, this test must fail.

Use `writeArtifacts: false`. Do not serialize the transformed raw profile into a durable report.

### 2. Prove strict added and missing field rejection

Add focused tests that transform the `get_room_state` template input for
`eval_006_make_this_relevant` in these two ways:

- add one unknown top-level input key
- remove one required top-level input key

Each case must fail before `propose_buyer_context` is called. Assert:

- `executionCompleted` is false
- the observed sequence contains only `get_room_state`
- no buyer context proposal was staged
- the overall eval run fails

Do not weaken or replace `proposeBuyerContextInputSchema`. It is already a `z.strictObject` through
`buyerContextSchema`.

### 3. Make adjacency explicit in the provenance assertion

In `proposalMatchesReadTemplate`, require the proposal call index to equal the read call index plus
one. Return a safe failure detail when they are not adjacent. Keep the exact-sequence contract as
the primary trace gate, but make the assertion match its own "immediately preceding" wording.

Do not add raw input values to assertion details or reports.

## Expected files

- `evals/cases.ts`
- `tests/evals/runner.test.ts`

Touch no other files unless a type-only change is strictly required.

## Acceptance gates

Run and report exact results for:

```text
npm run lint
npm run typecheck
npm run test -- --run tests/evals/runner.test.ts
npm run test
npm run evals
npm run evals:live:validate
git diff --check
```

Also confirm:

- exactly nine tools remain registered
- `proposeBuyerContextInputSchema` is unchanged
- `approve_buyer_context` and `approve_decision` remain absent
- `evals/live-agent/current.json` remains `not_run`
- deterministic generated artifacts remain byte-identical because the manifest and production
  execution are unchanged
- no commit, push, deploy, or Devpost mutation occurred

## Return format

Return:

1. summary
2. exact files changed
3. how the controlled transformed-template test fails on fixture reintroduction
4. added-field and missing-field rejection evidence
5. exact command results and test counts
6. contract confirmations
7. git status summary
8. recommendation for Codex acceptance

Stop when the bounded regression proof passes or at the first concrete blocker after preserving
diagnostics. Do not start another work order.
