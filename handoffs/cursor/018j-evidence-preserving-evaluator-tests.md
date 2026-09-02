# Cursor work order 018j: evidence-preserving evaluator tests

## Outcome

Close two defects before the next authorized live Responses run:

1. The 018i dash normalizer currently uses `\s*`, which can consume line breaks next to an em dash
   even though the persistence contract requires line breaks to be preserved.
2. `npm run evals:responses:test` calls `runResponsesDry()` against the canonical
   `evals/responses-api/results/current.json`, so a test run can replace valid live evidence with a
   `not_run` seed.

Make model-text normalization line-break-safe and make the evaluator test suite byte-preserve the
canonical current receipt. The explicit `npm run evals:responses:dry` CLI must keep its documented
behavior of writing the canonical `not_run` seed. Do not make an OpenAI API request and do not
hand-edit the current receipt.

## Source boundary

Work only in:

- `evals/responses-api/redaction.ts`
- `evals/responses-api/dry.ts`
- `evals/responses-api/tests/responsesApi.test.ts`

Do not modify any other file, including `evals/responses-api/results/current.json`.

## Required correction

### Preserve line breaks during punctuation normalization

Change the em dash normalization pattern so it consumes horizontal spacing only, never `\n` or
`\r`. Preserve all existing 018i behavior for same-line spaced and unspaced punctuation. Add direct
tests for em dashes immediately before and after a newline and for CRLF input. The output must keep
the same line-break count and ordering while removing the forbidden dash.

### Isolate dry evaluator test output

Give `runResponsesDry` a narrow optional destination-path seam or equivalent dependency injection.
The no-argument production CLI path must remain the canonical current receipt. Tests must pass a
fresh temporary destination and validate that temporary file instead of the canonical result.

Update every call to `runResponsesDry` in the evaluator test file. No test may write, rename,
truncate, restore, or otherwise mutate the canonical current receipt. Use a fresh `mkdtempSync`
directory and clean up only that exact temporary directory. Do not use a broad or unresolved path.

The destination seam must not allow the CLI argument surface to redirect output. It exists for
in-process tests only. Keep atomic writes and restrictive file mode behavior for both the canonical
CLI path and injected test path. Create no durable new artifacts.

Add a focused regression that:

- captures the canonical current receipt bytes and SHA-256;
- runs the dry evaluator against a temporary path;
- validates the temporary `not_run` record;
- proves canonical bytes and SHA-256 are unchanged;
- cleans up the exact temporary directory in `finally`.

The complete `npm run evals:responses:test` command must leave the canonical current receipt
byte-identical. Capture and report SHA-256 before and after the full command.

Do not change cases, prompts, tools, assertions, scores, thresholds, truth labels, or contract
digest inputs. The digest must remain
`1eebf6898051a45235c055c6da231cda1799fe232d99f2867302d5562c8d30f3`.

## Verification

Run without a live request:

```text
npm run evals:responses:test
npm run typecheck
npm run lint
git diff --check
```

Because the current receipt is presently an honest `not_run` seed, these commands should all pass
without changing it.

## Stop conditions

Stop rather than weakening validation, changing the canonical dry CLI behavior, mutating current
evidence from a test, changing the contract digest, or making a network request.

## Return format

Return the line-break-safe normalization design, the injected dry destination design, every updated
dry-test call site, before and after current-receipt SHA-256, test and verification results, files
changed, and a keep or revise recommendation.
