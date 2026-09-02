# Cursor work order 019c: schema parity and QA fail-closed correction

## Outcome

Reject 019b. Keep the honest candidate blocked while closing the remaining audit findings:

1. the checked-in JSON Schema accepts a blocking reason paired with the wrong lane;
2. local QA hashes evaluator files without canonically validating their contents;
3. missing or invalid eval evidence can create a failed receipt while `runQa` incorrectly returns
   exit 0;
4. post-start workspace or HEAD read failures may prevent a fallback failed receipt;
5. `receiptWritten` can be true after a no-op writer without readback proof;
6. the evidence reader retains a path-check-to-read race;
7. ready-receipt nullability and positive-lane semantics are not exact enough.

Do not change the product, WebMCP tools, action names, evaluator contracts, evidence contents,
historical release receipts, screenshots, documentation, package scripts, or current lifecycle
truth. Do not use the network, browser, OpenAI API, deployment, Git mutation, recording, upload, or
Devpost. Do not run the long `qa:receipt` command.

## Source boundary

Work only in:

- `scripts/qa.ts`
- `scripts/rc-gate.ts`
- `scripts/rc-gate/**`
- `artifacts/rc-gate/rc-gate.schema.json`
- `artifacts/rc-gate/current.json`, regenerated only through `release:rc:refresh`
- `tests/qa/qaOrchestration.test.ts`
- `tests/release/rcGate.test.ts`
- `tests/release/fixtures/rcGate/**`

Production evaluator validators may be imported read-only. Do not modify them.

## P1 correction 1: blocker code and lane parity in Ajv

The malicious `WORKTREE_DIRTY` plus `responsesApi` fixture currently fails Zod but passes Ajv. That
is an explicit failed acceptance criterion, not an acceptable semantic exception.

Make every item in `blockingReasons` satisfy one canonical code-and-lane pair from
`BLOCKING_REASON_CODE_TO_LANES`. Codes that legitimately map to multiple lanes may use any one of
those declared pairs. The checked-in Draft 2020-12 schema must encode the same pairs.

Also reject duplicate instances of the same code-and-lane pair even when their messages differ.
Use Draft 2020-12 `contains`, `minContains: 0`, and `maxContains: 1`, or another exact schema design,
for every canonical pair. Preserve the ability for one multi-lane code to appear once in each of
its canonical lanes. Set `uniqueItems: true` as an additional exact-object defense.

Required shared fixtures, all of which must fail both Zod and Ajv:

- valid code with wrong lane;
- same code and lane twice with identical messages;
- same code and lane twice with different messages;
- unknown code;
- valid multi-lane code placed in a noncanonical third lane.

The test must use the checked-in `artifacts/rc-gate/rc-gate.schema.json`, not an in-memory alternate.
Remove the current assertion that intentionally expects Ajv to pass the wrong-lane attack.

## P1 correction 2: exact ready receipt semantics and nullability

For a `ready` receipt, enforce in both Zod and Ajv:

- each of the seven lane summaries has its one exact positive status expected by the classifier;
- every lane-summary digest is a non-null SHA-256;
- `localQa` is passed, its receipt digest, candidate commit, workspace status digest, and all three
  eval digests are non-null, and workspace parity is true;
- deterministic status is passed with exact canonical nine tools, 12 passed, 0 failed, 60
  assertions, and both contract digests non-null;
- Responses status is passed with non-null model, timestamps, seven exact case IDs, score 100,
  7 passes, 0 failures, contract digest, and the exact bounded truth labels required by the current
  contract;
- public deployment status is ready with all identifiers and evidence digests needed by the
  classifier non-null;
- native status is ready with non-null identity, origin, entry integrity, headed true, 9 tools
  before and after, execution passed, CSP parity true, and zero application errors;
- compatible browser status is verified with non-null browser/build/origin/time fields, exact pass
  and fail counts, and bounded evidence paths;
- product invariants are passed, exact literal arrays are present, EU is unknown, and
  `humanOnlyAbsentFromTools` is true.

Do not require positive fields on an honestly blocked, stale, failed, invalid, or not-run lane when
the source contract legitimately uses nulls. Add one malicious shared fixture per ready section
with a required positive field changed to null or a wrong positive status. Each fixture must fail
both validators.

Zod-only whole-document byte and secret scanning may remain documented semantic checks because JSON
Schema cannot measure serialized UTF-8 bytes or scan the complete serialization. All representable
structural and conditional rules must match in the shared Zod/Ajv matrix.

## P1 correction 3: canonically validate local-QA eval artifacts

Replace `safeSha256File` for eval evidence with bounded exact-byte reads that parse JSON, call the
canonical validator, then hash those same bytes only after validation succeeds:

- deterministic: `validateDeterministicReportData`;
- Responses: `validateResponsesRecordData`;
- compatible browser agent: `liveAgentRecordSchema.parse`.

Use the source contracts' existing bounds, plus a small outer file-size bound before parsing.
Missing, malformed, oversized, or canonically invalid content must yield a null digest and a safe
`eval_artifact_validation` failure. Never persist raw content, parse details, stack traces, absolute
paths, or secrets.

If every child step exits 0 but any eval artifact is invalid, `runQa({ writeReceipt: true })` must:

- add one bounded synthetic failed step with ID `eval_artifact_validation`;
- write a strict failed receipt with null only for invalid or missing digests;
- set `firstFailedStep` to `eval_artifact_validation`;
- return exit 1;
- report `receiptWritten: true` only after verified readback.

Add separate malformed JSON and canonical-invalid-content tests for all three eval artifacts. At
least one test must prove arbitrary valid JSON cannot become a passing digest.

## P1 correction 4: fallback receipt after workspace or HEAD failures

Once receipt mode begins, safe local failures must still attempt one bounded failed receipt.

- Capture safe candidate HEAD and status-before values during preflight when possible.
- If status-before, status-after, or HEAD cannot be read, use explicit zero-value placeholders that
  satisfy shape constraints only in a failed receipt, set workspace parity false, and add one
  synthetic failed step such as `workspace_status_read` or `candidate_head_read`.
- A status-after failure must not call the same failing reader again as a prerequisite for writing.
- No fallback path may create a passing receipt from placeholder values.
- Preserve the original nonzero child exit when one already exists. Otherwise use exit 1.

Add separate status-before, status-after, and HEAD failure tests. Every catchable case must write a
strict failed receipt into an exact temporary directory and return nonzero.

## P1 correction 5: read back before claiming receiptWritten

After the atomic writer returns:

1. require the exact destination file to exist;
2. read it through the injected runtime reader;
3. parse and validate it with `validateLocalQaReceipt`;
4. prove its logical JSON value exactly equals the receipt that was requested for write;
5. only then return or report `receiptWritten: true`.

A no-op writer, stale pre-existing file, malformed replacement, or valid but different replacement
must report false and force a nonzero exit. Add all four tests.

## P1 correction 6: local receipt byte and leak enforcement

Keep the 128 KiB UTF-8 limit. Add tests that a multibyte receipt above the limit fails and cannot be
written as a passing receipt. Add whole-receipt guards for:

- POSIX absolute user paths;
- Windows absolute paths;
- credential-bearing URLs;
- `sk-` secret-like values.

The local receipt validator must reject those patterns anywhere in the serialized document. Test
both step args and other bounded string fields. Generic failure summaries must not echo injected
exception messages.

## P2 correction: descriptor-bound evidence read

`readBoundedContainedJson` currently calls `realpathSync`, then later opens by path. Remove the
common path replacement race:

1. resolve and contain the candidate as now;
2. open the validated physical path once with read-only and no-follow flags where supported;
3. use `fstatSync` on that descriptor to require a regular file and enforce size before reading;
4. read through that same descriptor, never by path;
5. compare descriptor identity and stable size/time metadata before and after the read;
6. re-resolve and re-check containment after opening, and compare final path device/inode with the
   open descriptor;
7. close the descriptor in `finally`;
8. hash and parse only the bytes read from the bound descriptor.

Add safe injectable filesystem hooks if needed to deterministically test a final-file replacement
between the initial path check and open. A replacement with a symlink or a different inode must
fail. Keep all errors bounded and generic.

## Verification

Do not run the full QA receipt, Responses evaluator, browser tests, public/native verification,
deployment, or Git mutation. Run:

```text
npm run test -- --run tests/qa/qaOrchestration.test.ts tests/release/rcGate.test.ts
npm run release:rc:refresh
npm run release:rc:validate
npm run release:rc:gate
PROOFROOM_RELEASE_RECEIPT=artifacts/release/release-receipt.json npm run release:receipt:validate
npm run evals:responses:validate
npm run evals:live:validate
npm run lint
npm run typecheck
git diff --check
```

Refresh and validate must exit 0 with `BLOCKED`. Hard gate must exit 1. Responses stays 7/7 at 100.
Compatible browser evidence stays valid `not_run`. The current blocker list must remain honest and
must still include stale local QA until the root agent runs the final long receipt.

## Stop conditions

Stop rather than declaring a Zod/Ajv malicious-fixture mismatch acceptable, hashing invalid eval
JSON, returning 0 with a failed receipt, trusting a writer without readback, requiring a second
successful workspace read to write a failure receipt, weakening canonical validators, editing
evidence, or making the honest candidate ready.

## Return format

Return: blocker-pair parity matrix, ready-field parity matrix, canonical eval-validation matrix,
workspace/HEAD failure matrix, receipt readback matrix, leak and byte-cap results, descriptor-bound
read design, commands and exact exits, current blockers, files changed, and keep or revise
recommendation.
