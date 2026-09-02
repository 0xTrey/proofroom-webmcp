# Cursor work order 019b: schema and failure-receipt hardening

## Outcome

Reject the 019a candidate until every remaining false-ready and missing-receipt path is closed.
The current candidate is honestly blocked, and that must remain true. This pass must bind release
receipt bytes to their SHA-256 digest, make the runtime and published JSON Schema enforce the same
strict receipt contract, make product constants independent of production exports, eliminate the
validated-path reread gap, and guarantee a bounded failed local-QA receipt whenever receipt mode
starts but cannot complete successfully.

Do not change application behavior, production WebMCP tools, action names, eval cases, historical
release evidence, live Responses evidence, compatible browser evidence, or accepted screenshots.
Do not use the network, browser, OpenAI API, deployment, Git mutation, recording, upload, or
Devpost. Do not rerun the long full QA receipt in this pass.

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
- `package.json` and `package-lock.json` only if an existing dependency needs a test script or a
  dependency version must be made explicit. Prefer the already installed Ajv packages.

Existing production and evaluator contracts may be imported read-only. Do not modify product,
eval, documentation, release, or historical evidence files.

## P1 correction 1: cryptographically bind release bytes and digest

`validateReleaseSources(repositoryRoot, releaseRaw, releaseDigest)` currently treats any non-null
digest as acceptable. A valid object plus a forged digest can pass the pure validation seam.

Required design:

1. Read the final release receipt as bounded raw UTF-8 bytes.
2. Parse those exact bytes only after the size check.
3. Compute SHA-256 from those exact bytes.
4. Pass a source object containing bytes, parsed document, and computed digest, or another design
   where the validator itself recomputes the digest from supplied bytes.
5. If a supplied or persisted digest exists, compare it with the recomputed byte digest using exact
   lowercase hex equality. A forged digest must fail `RELEASE_DOCUMENT_INVALID` before any evidence
   path is opened.
6. The test seam must not be able to assert a digest without providing the bytes it claims to hash.
7. Never hash a reconstructed object to stand in for file bytes. JSON whitespace is part of the
   file digest.

Add a regression with a canonically valid release document, valid evidence, exact raw bytes, and a
forged non-null digest. It must fail before referenced evidence is read. Also prove the exact digest
of the supplied bytes passes.

## P1 correction 2: containment-safe evidence reads

The canonical release validator runs first, but `sourceValidation.ts` then reopens the two paths
using a weaker `resolve` plus `readFileSync`. Replace that reread with one bounded reader that, at
the moment of reading:

- rejects absolute paths, backslashes, empty segments, dot segments, and parent traversal;
- resolves the repository root and candidate using `realpathSync`;
- proves the candidate remains inside the real repository root with `relative` containment;
- requires a regular file;
- checks byte size before JSON parsing;
- hashes the exact bytes already read, avoiding a second path-based hash;
- returns only parsed JSON, byte count, and SHA-256;
- emits only bounded generic errors.

Keep canonical `validateReleaseReceiptEvidence` first. The safe reader is a defense-in-depth reload,
not a replacement for the canonical validator. Add direct absolute, traversal, symlink, directory,
oversize, and malformed JSON attacks at this reader boundary.

## P1 correction 3: independent immutable product contract

`CANONICAL_PRODUCT_TOOL_NAMES` and `CANONICAL_HUMAN_ONLY_ACTION_NAMES` currently spread the live
production exports, so a same-count production rename changes both actual and expected values.

Define literal immutable expected arrays in the gate for exactly:

```text
get_room_state
search_product_evidence
evaluate_requirement
calculate_roi
propose_buyer_context
stage_requirement
attach_evidence
save_stakeholder_brief
propose_decision_status
```

and exactly:

```text
approve_buyer_context
reject_buyer_context
approve_decision
reject_decision
apply_roi_assumptions
dismiss_recovery_notice
reset_room
```

Then compare the live `TOOL_NAMES`, live `HUMAN_ONLY_ACTION_NAMES`, and snapshot values against
those independent literals. The two judge-visible approval gates remain
`approve_buyer_context` and `approve_decision`. EU residency remains `unknown`. Add regressions that
prove a same-count production or snapshot substitution fails.

## P1 correction 4: one strict RC receipt contract

Replace every weak `z.record(...).and(z.object(...))` intersection with exact `z.strictObject`
schemas. Bound every string, array, record, integer, and nested object. Reject unknown keys at every
level. Use a UTF-8 whole-document ceiling of at most 256 KiB, measured with
`Buffer.byteLength(JSON.stringify(value), "utf8")` before and after semantic validation.

At minimum enforce:

- lane status as the exact `LaneStatus` enum;
- blocking-reason lane as the exact seven lifecycle lanes plus `receipt`;
- exact canonical reason-code-to-lane mapping, not an arbitrary valid code paired with any lane;
- unique reason codes, unless the architecture documents and tests why one code may appear in more
  than one canonical lane;
- exact product invariant arrays and EU value in the receipt schema;
- `ready` if and only if there are zero blockers, both readiness booleans are true, the candidate
  is clean, local QA passed with parity, and all seven lane summaries are positive;
- `blocked` if and only if there is at least one blocker, and both readiness booleans are false;
- no `ready` receipt with a blocked, stale, failed, invalid, missing, or `not_run` lane;
- no blocked receipt with an empty blocker list;
- source digest nullability that matches each status rather than allowing arbitrary nulls;
- no absolute paths, credential URLs, secret-like values, unbounded truth-label strings, or raw
  nested content.

Create and export a canonical code-to-lane map from `reasons.ts`, and have `blockingReason()` reject
wrong pairings at construction time. Keep messages bounded and generic.

## P1 correction 5: make JSON Schema equivalent and executable

`artifacts/rc-gate/rc-gate.schema.json` currently leaves most nested objects unconstrained. Replace
it with a fully nested Draft 2020-12 schema that mirrors the runtime shape:

- `additionalProperties: false` on every object;
- exact required keys, enums, const values, formats, patterns, lengths, array sizes, uniqueness,
  and numeric bounds;
- exact nine tools, seven human-only names, two judge-visible approvals, and EU `unknown`;
- conditional readiness rules expressible in JSON Schema;
- maximum nested collection sizes and string lengths equivalent to Zod.

Use Ajv 2020 with formats in tests. A valid ready fixture and the honest blocked fixture must pass
both Zod and Ajv. Every malicious shape fixture must fail both validators. If a semantic rule cannot
be represented in JSON Schema, keep it in Zod but clearly test the boundary and do not describe the
two contracts as fully equivalent. The structural acceptance sets must match for all shared
fixtures.

Required attacks include an unknown nested key in every major object, an oversized truth-label
value, wrong reason lane, ready with blockers, ready with a blocked local lane, blocked with no
blockers, product array substitution, and a document above the whole-receipt byte ceiling.

## P1 correction 6: strict deterministic source bounds

Change the deterministic report ceiling to UTF-8 bytes using `Buffer.byteLength`. Require exact
case-level keys based on the committed report shape. Bound every case-level string and array, reject
unknown case keys, reject nested oversized strings, and verify all numeric values are finite bounded
integers where the contract expects integers. Continue requiring the exact twelve canonical IDs,
all pass outcomes, exact nine ordered tool names, fixed fixture, contract digests, totals, safety,
and `overallPass: true`.

Add unknown case key, oversized nested string, oversized nested array, multibyte byte-ceiling, and
non-finite number attacks. Do not weaken the existing deterministic assertions.

## P1 correction 7: always write a failed local-QA receipt

Receipt mode currently can throw while reading the live-agent record or hashing missing eval
artifacts, so a failed QA run may leave no fresh failed receipt.

Required behavior:

1. Once `runQa({ writeReceipt: true })` begins, every locally catchable failure must attempt one
   atomic bounded receipt write before returning nonzero.
2. This includes failed child steps, missing or malformed deterministic, Responses, or live-agent
   artifacts, visual digest failures before or after steps, workspace-read failures after start,
   and local summary parsing failures.
3. Use synthetic bounded step or preflight failure records when failure occurs before a child step,
   so the receipt explains only a safe category and never includes a raw exception, command output,
   absolute path, or secret.
4. Eval digests may be null only for a failed receipt. A passing receipt requires all three valid
   canonical artifacts and all three SHA-256 values.
5. Validate the local-QA receipt with its strict schema before the atomic write. Cap its serialized
   UTF-8 size at at most 128 KiB.
6. If even the atomic write itself fails, return nonzero and emit one bounded generic message. Do
   not claim `receiptWritten: true`.
7. Add safe test-only path and artifact injection points so tests write only to exact temporary
   directories, never the canonical receipt.
8. Preserve the normal non-receipt `npm run qa` behavior and exit-code propagation.

Add tests for a failed child with all eval files missing, malformed live-agent JSON, malformed
Responses JSON, visual digest failure before the first step, visual digest failure after steps, and
atomic write failure. Assert a strict failed receipt is written where possible, null digests are
used only on failure, no sensitive text leaks, and the reported `receiptWritten` flag is true only
when the file exists and validates.

## P1 correction 8: validate the final classified receipt

`validateRcGateReceipt()` returns a freshly classified object after adding parity blockers without
passing that final object through the receipt validator. Validate the exact returned object before
the CLI prints it. Refresh must validate before writing. Validate and hard-gate modes must validate
the persisted input, rebuild, add parity blockers, validate the final result, then print. A validator
failure must exit nonzero and must never print `READY`.

## Mandatory verification

Do not run `npm run qa:receipt`, the OpenAI Responses evaluator, browser tests, public verification,
native Chrome verification, deployment, or any command that mutates Git.

Run:

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

The honest refresh and validate commands must exit 0 and report blocked. The hard gate must exit 1.
The current Responses artifact must remain 7/7 at 100. Compatible browser-agent evidence remains
valid `not_run`. Do not edit current receipts by hand.

## Stop conditions

Stop rather than weakening a validator, trusting a caller-provided digest, reopening a validated
path without containment, deriving expected values from the live values being checked, allowing
Zod and Ajv shared fixtures to disagree, omitting a failed receipt after a catchable failure, or
making the honest current candidate ready.

## Return format

Return: release-byte binding design, safe-read design, independent literal contracts, Zod and Ajv
parity matrix, deterministic bounds, local-QA failure matrix, final-output validation proof, tests
and commands, expected hard-gate exit, current blocker list, files changed, and keep or revise
recommendation.
