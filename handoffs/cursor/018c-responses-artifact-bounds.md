# Cursor work order 018c: Responses artifact bounds

## Outcome

Close the remaining persisted-artifact denial-of-service gap before the first live Responses run.
The assertion contract, contract digest, scoring, cases, prompts, tools, and truth labels are already
correct. Do not change them.

A hand-edited completed artifact can currently contain unbounded assertion descriptions, assertion
details, or terminal requirement-status strings and still validate. Add explicit field bounds and a
whole-artifact UTF-8 byte ceiling. This is a storage and validation hardening change only.

Do not make a live API request.

## Source boundary

Work only in:

- `evals/responses-api/**`
- `evals/responses-api/results/current.json` only if the dry command regenerates the same honest
  `not_run` seed
- one factual sentence in `evals/README.md` only if the artifact byte ceiling needs documentation

Do not modify application source, production tools, deterministic evals,
`evals/live-agent/current.json`, package scripts, dependencies, top-level README, gallery assets,
release receipts, or external systems.

## Required bounds

Define named constants for the persisted contract and use them in both generation safety and
validation. At minimum enforce:

- a whole serialized artifact ceiling of 262,144 UTF-8 bytes;
- assertion IDs no longer than 120 characters;
- assertion descriptions and details no longer than 500 characters each;
- safe input digests as lowercase 64-character SHA-256 hex values, with at most 16 per case;
- tool sequences of at most 16 entries per case;
- terminal requirement-status maps with at most 64 entries, keys no longer than 120 characters,
  and values no longer than 120 characters;
- nullable terminal status strings no longer than 120 characters;
- bounded final assistant text no longer than 500 characters in the schema itself.

Keep existing tighter bounds where they already exist. Do not increase any current limit. Do not
truncate a hand-edited artifact during validation. Reject it. Runner-generated values may use the
existing deterministic text clamp where appropriate, but do not hide an evaluator bug by silently
discarding assertions or terminal entries.

The whole-artifact byte check must happen against the serialized UTF-8 representation before JSON
parsing in the file validator and before a generated suite result is returned for persistence. The
in-memory data validator must enforce the same ceiling on its serialized representation.

## Adversarial coverage

Add non-live tests proving rejection of:

1. a 501-character assertion description;
2. a 501-character assertion detail;
3. an oversized requirement-status key;
4. an oversized requirement-status value;
5. more than 64 requirement-status entries;
6. a malformed or uppercase safe input digest;
7. more than 16 safe input digests or tool calls;
8. a 501-character final assistant text;
9. a valid-shape artifact whose serialized UTF-8 size exceeds 262,144 bytes.

Also prove that the current honest `not_run` seed and a normal completed fixture still validate.
The existing 33 evaluator tests must remain green.

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

Confirm:

- all oversized or malformed fixtures fail for the expected boundary;
- the current `not_run` artifact remains honest and validates;
- the contract digest is stable across two independent invocations;
- 447 product tests, 12 deterministic cases, and 60 assertions remain unchanged;
- `evals/live-agent/current.json` remains byte-identical `not_run`;
- exactly nine tools, two UI-only approvals, and EU residency unknown remain unchanged;
- no API request, credential access, commit, push, deployment, recording, upload, or Devpost
  mutation occurs.

## Stop conditions

Stop rather than weakening validation if any normal runner fixture exceeds the proposed bounds, if
the whole-artifact check causes the honest generated record to fail, or if a bound requires a
product, case, prompt, score, tool, or truth-label change.

## Return format

Return:

1. summary;
2. exact constants and enforcement points;
3. adversarial tests and rejection reasons;
4. files changed;
5. full verification results and counts;
6. unchanged lifecycle and product invariants;
7. keep or revise recommendation and residual risks.
