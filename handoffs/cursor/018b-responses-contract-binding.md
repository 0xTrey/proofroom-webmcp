# Cursor work order 018b: Responses evidence contract binding

## Outcome

Close the final false-pass path in the local Responses evaluator and add two bounded safety
improvements before the first live run.

The current validator checks declared scores and totals, but it accepts invented assertion IDs as
long as there is one passing assertion per dimension. Bind each case to the exact expected
assertion contract and bind every result artifact to the current cases, assertion contract, truth
labels, and nine production tool schemas.

Do not change product behavior, case prompts, acceptance thresholds, or lifecycle claims. Do not
make a live API request.

## Source boundary

Work only in:

- `evals/responses-api/**`
- `evals/responses-api/results/current.json`
- bounded evaluator documentation only if the new contract digest needs one factual sentence

Do not modify application source, production tools, deterministic evals,
`evals/live-agent/current.json`, package scripts, dependencies, README, gallery assets, release
receipts, or external systems.

## Exact assertion contract

Define one canonical assertion contract for each of the seven case IDs. Each entry must include:

- assertion ID;
- dimension;
- critical flag.

The runner must prove the generated assertion list exactly matches the expected contract for that
case in canonical order before building a case result. The completed-record validator must enforce
the same exact contract. Reject missing, extra, reordered, duplicated, renamed, re-dimensioned, or
criticality-changed assertions.

Add adversarial tests proving an artifact fails when it replaces real assertions with invented
passing IDs, flips one assertion's dimension, changes criticality, adds an extra assertion, removes
an assertion, or reorders assertions.

This remains an internal consistency gate, not a claim of cryptographic authorship.

## Contract digest

Add a deterministic SHA-256 `contractDigest` to both `not_run` and completed artifacts. Compute it
from canonical JSON containing exactly:

1. schema version and truth labels;
2. the seven case IDs, families, setup names, and exact prompts in canonical order;
3. the exact assertion contracts above;
4. the ordered nine tool names, descriptions, explicit `strict: false`, and production input
   schemas as adapted for Responses.

Use a fixed-clock in-memory room only to adapt the production definitions. Do not execute any tool.
Canonicalize object keys recursively before hashing so the digest is stable across runs.

The dry command, runner, and validator must independently recompute the digest and reject any
missing or stale value. Seed the current `not_run` artifact with the correct digest. Add tests for
case prompt drift, assertion contract drift, tool schema drift, and a hand-edited digest.

Do not put response IDs, timestamps, keys, environment data, or local paths into the digest.

## Normalized secret-key sanitization

Harden recursive output sanitization so forbidden keys are matched case-insensitively after
removing punctuation and underscores. At minimum, remove normalized forms of:

- activity ledger;
- canonical buyer;
- evidence catalog;
- encrypted content;
- raw reasoning;
- OpenAI API key and generic API key;
- authorization;
- access token;
- bearer token;
- private state;
- raw private state;
- secret.

Add nested adversarial tests for casing, snake case, camel case, kebab case, and punctuation
variants. Do not remove legitimate public fields such as requirement IDs, input digests, trust
classes, or approval instructions.

Make artifact safety structural: parse JSON and inspect keys plus secret-like values instead of
rejecting harmless assistant prose merely because it uses a word such as `reasoning` or
`authorization`. Continue rejecting plaintext `sk-` style credential values wherever they occur.

## Bounded response generation

Add a fixed `max_output_tokens` to every Responses request and its request type. Use 4096 unless
current official API types prove it invalid. Test that every initial and replay request includes
the bound. Do not add temperature or change model selection.

Document and test that request timeouts are intentionally non-retryable, while only HTTP 429 and
5xx responses receive the two bounded retries specified in work order 018. Do not expand retries
to ambiguous transport failures.

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

- all new adversarial fixtures fail for the expected reason;
- the seeded not-run artifact validates only with the current contract digest;
- 447 product tests, 12 deterministic cases, and 60 assertions remain unchanged;
- the live browser-agent artifact remains byte-identical `not_run`;
- exactly nine production tools, two UI-only approvals, and EU residency unknown remain unchanged;
- no API request, commit, push, deployment, recording, upload, or Devpost mutation occurs.

## Stop conditions

Stop rather than weakening the validator if contract canonicalization is unstable across two
independent invocations, if computing the digest executes a tool or mutates a room, or if strict
assertion binding rejects a genuine runner result.

## Return format

Return:

1. summary;
2. exact assertion-binding design;
3. contract-digest inputs and stability evidence;
4. normalized sanitization design;
5. response-token and retry contract;
6. files changed;
7. adversarial test results;
8. full verification results and counts;
9. unchanged lifecycle and product invariants;
10. keep/revise recommendation and residual risks.
