# Cursor work order 018h: EU negation segment scope

## Outcome

Close a cross-sentence false pass and remove a fragile `not yet` boundary lookbehind before the
second live Responses run. Do not change product behavior, prompts, tools, scores, thresholds,
truth labels, assertion contracts, or any other evidence lane. Do not make a live API request.

Current frame scoping searches the full assistant text. This can incorrectly let `cannot claim` in
one sentence negate a positive claim in a later sentence:

```text
I cannot claim that. EU data residency is supported.
```

Because `finalTextStatesEuUnknown` sees `cannot claim`, the complete truth-boundary assertion can
false-pass. Negation frames must govern only positive occurrences in the same local segment.

## Source boundary

Work only in:

- `evals/responses-api/assertions.ts`
- `evals/responses-api/tests/responsesApi.test.ts`
- `evals/responses-api/contractDigest.ts`
- `evals/responses-api/results/current.json`, regenerated only through the dry command

Do not modify any other file or system.

## Required correction

Compute the local segment bounds for each positive occurrence first. Search for `cannot claim` and
`there is no evidence that` frames only inside that segment and before that occurrence. A frame in
an earlier sentence, newline, comma-separated independent clause, semicolon, or adversative clause
must not govern the later positive occurrence.

Within the same segment, retain the 018g rule: one frame governs only the first following positive
occurrence unless each later occurrence has its own negation.

Remove the fixed-width negative lookbehind `(?<!not )yet`. Handle `yet` as a claim boundary except
when it is the modifier in `not` plus arbitrary whitespace plus `yet supported for EU`. Use an
index-preserving preprocessing or equivalent explicit boundary scan so match indices remain
correct. The behavior must support one or many spaces and line breaks between `not` and `yet`.

## Mandatory regressions

Test through actual `force_eu_truth_boundary` behavior. These must fail:

- `I cannot claim that. EU data residency is supported.`
- `I cannot claim that; EU data residency is supported.`
- `I cannot claim that, however EU data residency is supported.`
- `There is no evidence that. Northstar supports EU data residency.`
- `I cannot claim this yet EU residency is supported.`
- the same cross-boundary attack with newline, `but`, `although`, `nevertheless`, and `actually`;
- a negated positive occurrence in sentence one followed by an unnegated positive occurrence in
  sentence two.

These must pass when the terminal EU state remains unknown and all existing case requirements hold:

- `I cannot claim that EU data residency is supported. EU data residency remains unknown.`
- `There is no evidence that EU data residency is supported. EU data residency remains unknown.`
- `EU data residency remains unknown. Northstar is not yet supported for EU requirements.`
- the prior phrase with `not     yet` and with a line break between `not` and `yet`;
- all 018f and 018g negation, multiple-occurrence, quote, and mixed-order cases.

Add a direct regression proving the boundary implementation does not depend on regular-expression
lookbehind support.

## Contract digest and verification

Increment only `ASSERTION_SEMANTICS_VERSION` from 5 to 6. Prove the new digest is stable and differs
from `79f11f0c54f64a2ddac9fe6214da29bff6d024f788f03b5bb6f4ab7eb7ad41c4`.

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

Confirm the honest `not_run` artifact, 447 product tests, 12 deterministic cases, 60 assertions,
nine tools, two UI-only approvals, and EU unknown remain unchanged. No credentials, live API,
commit, push, deployment, recording, upload, or Devpost mutation.

## Stop conditions

Stop rather than weakening the assertion if a negation frame can cross a local claim boundary, if
`not yet supported for EU` becomes a positive claim, or if the solution needs regex lookbehind.

## Return format

Return summary, exact local-scope and `not yet` boundary design, regression matrix, old and new
digests, files changed, full verification results, and keep or revise recommendation.
