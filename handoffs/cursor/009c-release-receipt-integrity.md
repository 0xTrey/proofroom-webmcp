# Cursor work order 009c: release receipt integrity

## Objective

Close the final release-preparation audit gap. The local public and native lanes pass, but the release receipt CLI currently validates only its handwritten TypeScript rules. It does not execute the committed JSON Schema, permits unknown keys in several nested objects, and does not prove that referenced evidence files exist, match their declared SHA-256 digests, validate independently, and describe the same public origin.

Make the final verified receipt self-consistent and evidence-backed. Preserve all accepted 009b native behavior and receipt bytes unless a required test proves a correction is needed.

Do not deploy, commit, push, begin item 12, change product UI, weaken CSP, or rerun native Chrome unless a native source change requires it. Codex owns acceptance and deployment.

## Source boundary

- Repository: `/Users/treyharnden/Projects/proofroom-webmcp`
- Read work orders 009, 009a, and 009b, the current release and native validators, public verifier, JSON Schema, prepared receipt, evidence READMEs, runbook, and tests.
- Work only in this repository.
- Preserve exactly nine WebMCP tools, two UI-only approvals, strict CSP, and accepted visual artifacts.
- Use no em dash characters.

## 1. Make the CLI execute both validators

Use the existing Ajv 8 and ajv-formats development dependencies in `scripts/release-receipt.ts`. The `release:receipt:validate` CLI must:

1. parse the selected receipt
2. run the handwritten TypeScript validator
3. load and compile `artifacts/release/release-receipt.schema.json`
4. run JSON Schema validation with date-time formats enabled
5. fail nonzero with bounded useful errors if either validator fails

Export a testable schema-validation helper. Cache compilation inside the process. Do not maintain a second copied schema.

Add tests proving a fixture rejected only by JSON Schema still makes the CLI-level helper fail. Keep Ajv dependencies in `devDependencies` and justify them as executable release validation, not test-only baggage.

## 2. Fail closed on every nested object

Add exact-key validation to every handwritten nested object, including:

- `preparation`
- `deployment`
- `deployment.build`
- `verification`
- `verification.responseHeaders`
- `verification.httpVerifier`
- `verification.publicPlaywright`
- `verification.nativeChrome` and its existing children
- `failure`

Unknown nested keys must fail both TypeScript and JSON Schema validation. Remove the duplicate `failure.stage` check.

Add negative tests for an extra key at each major nesting level. A verified receipt must not accept unreviewed proof fields.

## 3. Add lifecycle and cross-field consistency

Require `verification.verifiedAt` as a valid UTC timestamp for a verified receipt. Keep `preparedAt` and `deployment.deployedAt`. Enforce:

- `preparedAt <= deployedAt <= verifiedAt`
- `preparation.sourceCommit === deployment.gitCommit`
- normalized `preparation.githubRemote === deployment.githubRemote`
- normalized GitHub remote repository identity equals `deployment.publicRepositoryUrl`
- preparation and deployment worker names match
- preparation deterministic eval digest equals verification deterministic eval digest
- preparation visual digest equals both verification visual digests
- `liveAgentSelectionStatus` is the exact enum `not_run`, `passed`, or `blocked`, not free-form prose

For GitHub normalization, accept the normal HTTPS `.git` remote form and public URL form for the same repository. Reject a different host, owner, or repository.

Add negative tests for every mismatch and for invalid timestamp order.

## 4. Validate referenced evidence at the CLI boundary

For a `verified` receipt, the CLI must resolve `httpVerifier.receiptPath` and `nativeChrome.evidencePath` under the repository root and fail if either is missing, outside the repository, unreadable, or has a SHA-256 digest different from the declared value.

Add or export a fail-closed `validatePublicVerificationReceipt()` in `scripts/verify-public.ts`. It must enforce exact keys and the real receipt contract: schema version and kind, passed status, HTTPS origin for release evidence, exact four checked routes, exact response count, same-origin assets, expected fingerprinted JS and CSS paths, required security header values, strict CSP, and a valid internal digest recomputed from the receipt fields.

At the verified release CLI boundary:

- parse and validate the referenced public HTTP receipt
- parse and validate the referenced native receipt with `validateNativeReceipt()`
- require both evidence origins to equal `new URL(publicUrl).origin`
- require native browser version, flags, tools, reload registration, entry path/digest/byte count, effective CSP, error counts, known diagnostic count, diagnostic phases/location, and evidence summary to match the final receipt
- require the public HTTP response headers to equal the final receipt response headers

Keep pure structural helper tests synthetic. Add filesystem integration tests in a temporary directory for valid evidence, missing file, digest mismatch, origin mismatch, and native-summary mismatch. Never overwrite durable real evidence in those tests.

The honest `prepared` receipt must continue to validate without evidence files or public claims.

## 5. Update evidence documentation

Update `artifacts/release/README.md` and `docs/release-runbook.md` to state that `release:receipt:validate` executes both TypeScript and JSON Schema validation and, for `verified`, verifies the referenced file bytes and cross-checks both evidence receipts against the public URL and final summary.

Do not claim item 11 acceptance or public verification.

## Required verification

Run focused release/public/native tests first. Then run:

```text
npm run lint
npm run typecheck
npm test
npm run build
npm run check:bundle
npm run deploy:dry-run
npm run test:e2e
npm run test:a11y
npm run evals
npm run qa
npm run release:receipt:validate
git diff --check
git diff --exit-code -- artifacts/visual-audit/003-baseline artifacts/visual-audit/004-context artifacts/visual-audit/005-evidence artifacts/visual-audit/006-decision artifacts/visual-audit/007-recovery artifacts/qa/009-release-prep/native-local.json
```

The prepared receipt must pass the combined CLI without any referenced public evidence. Do not fabricate a durable verified receipt. Use only temporary fixtures for verified-evidence integration tests.

Confirm:

- 009b native receipt is byte-identical
- strict CSP is unchanged
- public and native verifier runtime behavior is unchanged except for exported validation helpers
- accepted visual artifacts are byte-identical
- no secret, credential, real customer data, or em dash character was added

## Required report

Return:

1. Exact files changed.
2. Combined TypeScript and JSON Schema CLI behavior.
3. Every exact-key and cross-field invariant.
4. Evidence-file validation and cross-check behavior.
5. Focused and aggregate test counts.
6. Native local receipt digest before and after.
7. Visual artifact digest before and after.
8. Remaining item 11 risk or one concrete blocker.

## Stop condition

Stop when every correction and verification above is complete, or at the first concrete blocker after preserving diagnostics. Return the report to Codex. Do not deploy, commit, push, begin item 12, modify the product UI, weaken CSP, or claim item 11 acceptance.
