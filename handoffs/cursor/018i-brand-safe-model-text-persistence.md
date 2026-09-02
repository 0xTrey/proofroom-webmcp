# Cursor work order 018i: brand-safe model text persistence

## Outcome

Make the Responses evaluator fail closed on forbidden em dash characters and normalize only the
model-derived text fields that it persists. The current live result passed all seven cases at 100,
but `npm run lint` correctly found em dash characters in two persisted assistant summaries. Fix the
generator, not the evidence file. Do not hand-edit or overwrite the current live artifact, and do
not make an OpenAI API request.

This is a persistence-boundary correction only. Do not change model prompts, case inputs, tool
schemas, tool execution, assertion semantics, assertion contracts, scores, thresholds, truth
labels, production state, or any other evidence lane.

## Source boundary

Work only in:

- `evals/responses-api/redaction.ts`
- `evals/responses-api/assertions.ts`
- `evals/responses-api/tests/responsesApi.test.ts`
- `evals/responses-api/validate.ts` only if strict validation needs a direct brand-safe refinement

Do not modify `evals/responses-api/results/current.json`. Do not modify the contract digest version
or any file outside this list.

## Required design

Add one small exported helper for persisted text. It must:

- replace every U+2014 em dash deterministically before length clamping;
- replace U+2013 en dash with a plain hyphen so model punctuation is consistently ASCII-safe;
- preserve line breaks, wording, case, Markdown, and all other characters;
- avoid awkward doubled spaces around the replacement;
- clamp only after normalization so the stored value stays within its existing maximum;
- never rewrite tool inputs, model prompts, model responses held in memory for scoring, or
  production data.

Use the helper for `boundedFinalAssistantText` and for any transport or execution error text that
can be persisted in a Responses record. Assertions must continue to score the original in-memory
assistant text. The persisted summary may be punctuation-normalized, but its meaning and score must
not change.

Extend `assertArtifactSafe` so any persisted em dash character causes validation to fail with a
bounded, nonsecret error. This makes a future missed persistence path fail before an artifact can
be written. It is acceptable to reject an en dash too if the implementation deliberately enforces
the same ASCII-safe boundary, but the em dash rejection is mandatory.

Do not increment `ASSERTION_SEMANTICS_VERSION`. This change is serialization policy, not case,
assertion, truth-label, prompt, or tool-contract semantics. The contract digest must remain
`1eebf6898051a45235c055c6da231cda1799fe232d99f2867302d5562c8d30f3`.

## Mandatory regressions

Add focused tests proving:

1. A completed case whose model final text contains spaced and unspaced em dash characters stores
   no em dash and stays within 500 characters.
2. En dash is stored as a plain hyphen.
3. Newlines and Markdown around normalized punctuation are preserved.
4. Assertion evaluation still uses the original semantic text and produces the same assertion
   results and score.
5. Error-message persistence removes secret-like values, normalizes forbidden dash punctuation,
   and retains the 240-character ceiling.
6. `assertArtifactSafe` rejects a nested persisted em dash, including one inside
   `boundedFinalAssistantText`.
7. A normal safe artifact still passes.
8. The contract digest remains exactly the value above.

Do not run the dry evaluator because it would replace the authorized live artifact. Do not mutate
that artifact in a test. If existing tests call the dry evaluator, isolate the new focused tests so
they do not invoke those cases.

## Verification

Run without a live request:

```text
npm run evals:responses:test
npm run typecheck
git diff --check
```

The repository-wide lint command is expected to remain blocked until Codex regenerates the live
artifact through the authorized evaluator. Report that fact rather than editing the artifact.

## Stop conditions

Stop rather than changing the score, contract digest, prompt, tool output, product state, or live
artifact. Stop if the correction would require replaying or rewriting existing evidence.

## Return format

Return the design, files changed, regression results, unchanged contract digest, verification
results, confirmation that the live artifact was untouched, and a keep or revise recommendation.
