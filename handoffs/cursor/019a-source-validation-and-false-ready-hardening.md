# Cursor work order 019a: source validation and false-ready hardening

## Outcome

Reject the first 019 implementation and close every known path to a false `ready` result. The
current honest receipt is still correctly blocked, but independent audits found unsafe release
evidence path resolution, missing referenced-evidence digest validation, count-only native tool
checks, unvalidated source documents, weak product exactness, and an inconsistent ready-lane label.

Keep all lifecycle boundaries and current blockers. Do not change application behavior, production
tools, eval cases, live evidence, historical release evidence, or accepted screenshots. Do not use
the network, browser, OpenAI API, deployment, Git mutation, recording, upload, or Devpost.

## Source boundary

Work only in:

- `scripts/rc-gate.ts`
- `scripts/rc-gate/**`
- `artifacts/rc-gate/current.json`, regenerated only by `release:rc:refresh`
- `artifacts/rc-gate/local-qa.json`, read-only in this pass
- `tests/release/rcGate.test.ts`
- `tests/release/fixtures/rcGate/**`

Existing source validators may be imported from `scripts/release-receipt.ts`,
`evals/responses-api/validate.ts`, `evals/live-agent/validate.ts`, and production contract modules,
but do not modify those files. Do not change docs or package scripts in this pass.

## P1 correction 1: validate release before following paths

`loadRcGateSources` currently extracts `receiptPath` and `evidencePath` from an unvalidated release
object and passes them to `resolve`. A malformed local receipt can therefore select an absolute or
traversal path before validation.

Required design:

1. Parse the release JSON under a bounded file-size limit.
2. Call `validateReleaseReceiptDocument` before reading either referenced file.
3. If document validation fails, do not resolve or read any referenced path. Return a bounded
   invalid-source classification.
4. For a valid verified release, call `validateReleaseReceiptEvidence` so repository containment,
   symlink containment, strict HTTP/native schemas, digest linkage, origins, headers, native
   summary parity, and native entry-integrity summary parity are enforced by the canonical
   validator.
5. Only after validation succeeds may the gate load the two validated repository-relative files
   for lane summaries. Do not reimplement a weaker path check.
6. Never persist validator stack traces, raw path values, or file contents.

Add separate source validity facts for release document and referenced release evidence. A failed
release document or evidence check must block both public and native lanes with canonical bounded
reason codes. Historical receipts that validate but point to an older commit remain `stale`, not
invalid.

## P1 correction 2: validate each eval source with its canonical contract

Before a source can contribute to `ready`:

- Responses evidence must pass `validateResponsesRecordData`, including strict shape, assertion
  contracts, derived scores, contract digest, truth labels, and artifact safety.
- Compatible browser-agent evidence must pass `liveAgentRecordSchema`, including exact unique case
  IDs, exact prompt digests, exact tool-name enums, strict paths, and verified versus failed
  consistency.
- Deterministic evidence must pass a strict bounded gate validator. At minimum require exact top
  keys; schema version and suite ID; exact fixture keys; exact contract keys; exact ordered nine
  production tool names and matching count; exact totals with 12 total, 12 passed, 0 failed, 60
  assertions, and the committed family counts; exact twelve unique canonical case IDs with all
  outcomes passed; `overallPass: true`; all five safety flags false; and no unknown top-level,
  contract, tools, totals, live-selection, or safety keys. Cap all arrays and strings and reject
  oversized serialized input.

Do not let ad hoc field extraction turn a canonical validator failure into a pass. Preserve the
useful lane-specific reason codes where possible, but add a general invalid-source blocker whenever
the canonical source schema fails.

Runtime validation and pure classification must remain separable. A good design is to make the
runtime loader produce bounded validation facts and normalized validated documents, then let the
pure classifier consume those facts. Fixture tests may inject explicit validation facts, but must
also test the validator boundary itself.

## P1 correction 3: exact native contract

Native WebMCP readiness must require:

- initial `toolNames` exactly equal the canonical nine names in canonical sorted order;
- `reloadToolNames` exactly equal the same canonical nine names, not merely length nine;
- release summary `toolNames` exactly equal validated native receipt `toolNames`;
- headed, non-diagnostic execution passed, reload verified, entry integrity passed, strict CSP
  parity, zero application errors, origin parity, and referenced evidence digest validation;
- native receipt summary fields come from the validated native receipt or exact validated release
  linkage, not from an untrusted ad hoc record.

Add same-count name-substitution and reload-substitution attacks. Remove the dead comparisons that
compare a Git commit to an evidence digest or compare to nonexistent `release.head`.

## P1 correction 4: exact product invariants

Count-only product checks are insufficient. Add immutable canonical expected arrays for:

- the exact ordered nine tool names;
- the exact seven human-only action names;
- the two judge-visible approval gate names.

Compare snapshot arrays exactly against those constants. Prove all seven human-only names are
absent from tools, both gate names are in the human-only set, and EU stays unknown. A nine-name tool
substitution or a seven-name human-only substitution must block. Add a stable SHA-256 digest of the
complete product-invariant snapshot to the product lane instead of a null digest.

## P1 correction 5: ready-lane consistency

The current ternary marks `lanes.localCandidate.status` as `blocked` whenever the overall receipt is
`ready`. Fix it. A full ready fixture must have:

- overall `status: ready`;
- both readiness booleans true;
- all seven lane summaries in a positive ready, passed, or verified state;
- no blocking reasons.

Derive local-lane readiness only from local cleanliness, QA status, commit/status/eval digest
parity, and visual/status parity. Add explicit assertions for every lane in the full-ready fixture.

## P2 correction: complete persisted-source parity

`validatePersistedReceiptParity` currently watches only HEAD, filtered status, and local-QA digest.
It must also compare every persisted source digest or invariant digest against current inputs:

- deterministic report;
- Responses current;
- compatible browser-agent current;
- final release receipt;
- validated HTTP evidence;
- validated native evidence;
- product-invariant snapshot.

Add actual HTTP and native file digests to `RcGateSources` and the combined receipt where needed.
Any change after refresh must produce one canonical `RECEIPT_SOURCE_CHANGED` blocker and make both
readiness booleans false until refresh. Deduplicate the combined fresh and parity reasons before
returning, then validate the returned receipt before printing it.

## Mandatory attacks

Add fixture or temporary-repository tests for all of these:

1. absolute release evidence path;
2. parent traversal path;
3. symlink escape;
4. malformed release receipt with an otherwise readable external JSON file;
5. HTTP digest mismatch;
6. native digest mismatch;
7. HTTP or native origin mismatch;
8. native same-count initial tool substitution;
9. native same-count reload tool substitution;
10. native entry hash or byte-count mismatch against release summary;
11. forged Responses pass missing its completed case records;
12. compatible browser record with duplicate case ID, wrong prompt digest, unknown key, or invalid
    evidence path;
13. deterministic report with arbitrary nine names, missing cases, duplicate case IDs, false
    overall pass, unknown top-level key, or oversized content;
14. arbitrary nine-name product tool set;
15. arbitrary seven-name human-only set;
16. a full ready fixture whose every lane summary is positive;
17. each source digest changing after receipt generation.

Every test must assert the exact reason code or validator boundary, not a generic throw alone.
Tests may use an exact `mkdtempSync` directory under the system temp directory and must remove only
that exact directory in `finally`.

## Verification

Do not rerun the seven-case OpenAI evaluation or the long `qa:receipt` command. Run:

```text
npm run test -- --run tests/release/rcGate.test.ts
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

The hard gate must exit 1 for the honest current blockers. Refresh and validate must exit 0. The
current Responses lane must remain passed at 7/7 and 100. The compatible browser-agent lane must
remain `not_run`. No current source receipt may be hand-edited.

## Stop conditions

Stop rather than following an unvalidated path, accepting a source that fails its canonical
validator, substituting counts for exact names, weakening a source validator, changing historical
evidence, or allowing a ready receipt with any blocked lane.

## Return format

Return the safe source-loading design, canonical validation matrix, native exactness proof, product
invariant digest, parity matrix, ready-lane assertion, attack results, honest current blockers,
files changed, command results, expected hard-gate exit, and keep or revise recommendation.
