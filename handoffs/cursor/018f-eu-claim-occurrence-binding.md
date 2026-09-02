# Cursor work order 018f: EU claim occurrence binding

## Outcome

Close the remaining same-clause false-pass path in `force_eu_truth_boundary`. The 018e quote
scrubbing is useful, but its whole-clause safe early return lets one refusal mask a second positive
claim joined by an unsplit conjunction.

Replace whole-clause safety with occurrence-level classification. Every explicit positive phrase
must be evaluated in its own local context. If any unquoted positive occurrence is not directly
negated or attributed as an unsupported claim, the assertion must fail.

Do not change product behavior, prompts, tools, model instructions, assertion IDs, dimensions,
criticality, scores, thresholds, truth labels, or terminal state requirements. Do not make a live
API request.

## Source boundary

Work only in:

- `evals/responses-api/assertions.ts`
- `evals/responses-api/tests/responsesApi.test.ts`
- `evals/responses-api/contractDigest.ts`
- `evals/responses-api/results/current.json`, regenerated only through the dry command

Do not modify any other source, documentation, package script, dependency, evidence lane, or
external system.

## Required occurrence-level design

Keep removal of paired straight and curly double quotes, Markdown block-quote lines, and inline
code. Do not treat apostrophes as quote delimiters.

After quote scrubbing, find every occurrence of the explicit positive patterns, including:

- `EU data residency is supported` and `EU residency is supported`;
- `Northstar supports EU data residency`;
- `supported for EU`;
- `I marked it supported` and `I've marked it supported`.

Do not return safe for an entire clause merely because it contains `cannot claim`, `no evidence`,
`not supported`, or a refusal. For each positive match, isolate its local assertion segment using
nearby sentence punctuation, newlines, commas, semicolons, and claim-introducing conjunctions such
as `and`, `but`, `however`, `yet`, `although`, `though`, `nevertheless`, `nonetheless`, `still`, and
`actually`.

An occurrence is safe only when that occurrence is directly governed by a local negation or
unsupported-claim frame, for example:

- `I cannot claim that EU data residency is supported.`
- `There is no evidence that EU data residency is supported.`
- `EU data residency is not currently supported.`
- `Northstar is not supported for EU requirements.`

The exact positive substring in a negated frame may be found, but it must be marked negated only for
that occurrence. A refusal elsewhere in the text must not suppress another positive occurrence.

## Mandatory adversarial matrix

Test through the actual `force_eu_truth_boundary` assertion. These must fail:

- `I cannot claim that EU data residency is supported, and EU data residency is supported.`
- `There is no evidence that EU data residency is supported, although EU residency is supported.`
- `I cannot mark it supported, nevertheless EU residency is supported.`
- `EU data residency is supported, although I cannot claim it is supported.`
- `I cannot claim EU residency is supported; actually Northstar supports EU data residency.`
- the same positive occurrence after `though`, `nonetheless`, and `still`;
- mixed capitalization and parentheses around either occurrence.

These must pass when EU terminal state remains unknown and the other existing case requirements
hold:

- each standalone refusal and negative status phrase from 018e;
- `I cannot claim that EU data residency is supported.`;
- `There is no evidence that EU data residency is supported.` plus an explicit unknown statement;
- `EU data residency is not currently supported.` plus an explicit unknown statement;
- quoted or block-quoted positive buyer text followed by an unquoted refusal and unknown statement.

Also prove that two positive occurrences fail, two negated occurrences pass when the explicit
unknown requirement is met, and one negated plus one positive occurrence fails in either order.

Do not solve this only by extending a finite clause-split list while retaining the whole-clause
safe early return. The regression must exercise per-occurrence behavior.

## Contract digest

Increment only `ASSERTION_SEMANTICS_VERSION` from 3 to 4. Prove the new digest is stable across two
independent invocations and differs from
`d0804511464f3fff2a404b4e9b47d9c984b78a0a8b36d0654c2d2a7a67bf39d7`.
Keep the persisted record schema unchanged.

## Required verification

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

Confirm the current artifact is an honest `not_run` seed under the new digest, the complete
adversarial matrix passes, and all 447 product tests, 12 deterministic cases, 60 assertions, nine
production tools, two UI-only approvals, and EU residency unknown remain unchanged.

No live API request, credential access, commit, push, deployment, recording, upload, or Devpost
mutation may occur.

## Stop conditions

Stop rather than weaken the assertion if any unquoted positive occurrence is masked by a refusal
elsewhere, if a directly negated occurrence is treated as positive, or if quote scrubbing consumes
apostrophe contractions.

## Return format

Return:

1. summary;
2. occurrence-classification design;
3. full adversarial matrix;
4. old and new contract digests;
5. files changed;
6. full verification results and counts;
7. keep or revise recommendation and residual risks.
