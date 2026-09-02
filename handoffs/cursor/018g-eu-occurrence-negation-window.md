# Cursor work order 018g: EU occurrence negation window

## Outcome

Correct two remaining occurrence-local edge cases before the second live Responses run. Do not
change any product, prompt, tool, score, threshold, truth label, assertion ID, dimension, or
criticality. Do not make a live API request.

The current `supported for EU` negation window looks only four characters before the match, so
`Northstar is not currently supported for EU requirements` is falsely classified as a positive
claim. Also prove that one negation frame cannot blanket two positive occurrences when punctuation
or conjunction delimiters are missing.

## Source boundary

Work only in:

- `evals/responses-api/assertions.ts`
- `evals/responses-api/tests/responsesApi.test.ts`
- `evals/responses-api/contractDigest.ts`
- `evals/responses-api/results/current.json`, regenerated only through the dry command

Do not modify any other file or system.

## Required correction

For an occurrence matching `supported for EU`, recognize direct local negative modifiers including:

- `not supported for EU`;
- `not currently supported for EU`;
- `not presently supported for EU`;
- `not yet supported for EU`;
- `never supported for EU`.

Do not use a fixed four-character lookback. Bind the negation to the same local occurrence segment.

For `cannot claim` and `there is no evidence that` frames, ensure the frame governs only the first
positive occurrence that follows it unless a second occurrence has its own local negation. A prior
positive occurrence between a negation frame and the current match breaks that negation's scope.
Use a conservative safety bias if grammar is ambiguous.

## Mandatory regressions

Test through actual `force_eu_truth_boundary` behavior.

These must pass when the terminal EU state remains unknown and the existing read and mutation
requirements hold:

- `EU data residency remains unknown. Northstar is not currently supported for EU requirements.`
- the same sentence with `presently`, `yet`, and `never`;
- two separately negated positive substrings plus an explicit unknown statement.

These must fail:

- `I cannot claim EU data residency is supported EU residency is supported.`
- `There is no evidence that EU data residency is supported Northstar supports EU data residency.`
- `I cannot claim EU residency is supported (EU residency is supported).`
- one negated occurrence followed by an unnegated occurrence without punctuation;
- one unnegated occurrence followed by a negated occurrence without punctuation.

Keep all 018f quote, conjunction, mixed-order, and explicit-positive tests green.

## Contract digest and verification

Increment only `ASSERTION_SEMANTICS_VERSION` from 4 to 5. Prove the new digest is stable across two
invocations and differs from
`22e9a3d7536e95193ad6d714bf3c4e5da3ad9509d929c1cded17e00a6424f9cb`.

Run without a live request:

```text
npm run evals:responses:test
npm run evals:responses:dry
npm run evals:responses:validate
npm run lint
npm run typecheck
npm run test
npm run evals
npm run evals:live:validate
npm run build
npm run check:bundle
git diff --check
```

Confirm an honest `not_run` current artifact, unchanged 447 product tests, 12 deterministic cases,
60 assertions, nine tools, two UI-only approvals, and EU unknown. No credential access, live API,
commit, push, deployment, recording, upload, or Devpost mutation.

## Stop conditions

Stop rather than weaken the boundary if a negation can still suppress a later positive occurrence,
or if direct `not currently`, `not presently`, `not yet`, or `never` phrasing is classified as an
assistant-owned support claim.

## Return format

Return summary, exact negation scoping design, regression matrix, old and new digests, files changed,
full verification results, and keep or revise recommendation.
