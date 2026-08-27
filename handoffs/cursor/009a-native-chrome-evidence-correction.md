# Cursor work order 009a: native Chrome evidence correction

## Objective

Close the remaining item 11 preparation blocker without weakening ProofRoom's Content Security Policy. The native Chrome 151 run proved real discovery and execution through `document.modelContext`, then emitted two identical CSP `eval-sha256` diagnostics from the flagged testing surface. Preserve that fact as a narrow, structured, disclosed browser diagnostic while continuing to fail on every application error, request failure, response failure, page error, or unexpected console message.

Also harden the native and release receipt validators so a passing receipt cannot omit or misstate material proof.

Do not deploy, commit, push, begin item 12, add `unsafe-eval`, add a Chrome-internal hash to CSP, or weaken any public HTTP/browser gate. Codex owns acceptance and deployment.

## Source boundary

- Repository: `/Users/treyharnden/Projects/proofroom-webmcp`
- Read `AGENTS.md`, work orders 009 and the current item 11 implementation, the root reproduction below, and the accepted release-evidence contract.
- Work only in this repository.
- Preserve exactly nine WebMCP tools, two UI-only approvals, the strict CSP, and all accepted visual artifacts.
- Use no em dash characters.

## Root reproduction

Codex independently ran the native verifier against a real local Wrangler origin using headed Google Chrome `151.0.7922.174` and the required flags.

The native lane successfully completed discovery, schema and annotation checks, `get_room_state`, `propose_buyer_context`, exact revision and ledger advancement, visible pending state, approved-context absence, reload persistence, and storage cleanup. It then failed only because Chrome logged this exact diagnostic twice:

```text
 Hash of blocked script: "eval-sha256-+CsItOgDyYUV0cButNNF02fx9NeCL52rS31Mq6+jjQM=".
```

The strict `script-src 'self'` policy correctly blocks eval. The testing API still completed both tool executions. A prior bounded attempt to allowlist the browser-internal eval hash caused native execution failure and was correctly reverted.

## 1. Classify the exact testing diagnostic without hiding errors

Add a strict classifier for known Chrome WebMCP testing diagnostics. It may classify a console error only when all of these are true:

- headed Google Chrome is running with the exact required WebMCP testing flags
- the message matches the complete anchored shape `Hash of blocked script: "eval-sha256-<base64 SHA-256>".` with optional surrounding whitespace and nothing else
- the diagnostic has no application source URL, line, or column, or has only the browser's empty/internal location shape observed in the real run
- native discovery and both native tool executions have already satisfied every functional assertion
- there are exactly two such messages for this run

Do not key acceptance to the current hash value, because the browser's internal evaluated script may change. Do not classify a generic CSP error, `EvalError`, page error, source-located message, request failure, response failure, or any other console message.

Separate captured events into:

- `applicationConsoleErrors`
- `pageErrors`
- `requestFailures`
- `responseFailures`
- `knownBrowserDiagnostics`

The run must fail unless the first four arrays are empty. It must also fail if the known diagnostic array is anything other than exactly two messages matching the strict classifier. For a future Chrome version that emits zero known diagnostics, allow zero and record zero. Do not require two forever. The accepted counts are therefore zero or exactly two, never one or more than two.

The native receipt must record every known diagnostic with:

- stable diagnostic code such as `chrome_webmcp_testing_eval_hash_notice`
- original bounded message
- console location URL, line, and column
- Chrome version
- why it is not counted as an application error

The receipt must record `applicationErrorCounts` with console, page, request, and response all zero, plus `knownBrowserDiagnosticCount`. Do not put the known diagnostics into an array named `failures`.

Keep the strict CSP unchanged. Add an exact test proving neither `unsafe-eval` nor an `eval-sha256` allowance appears in the Worker or `_headers` CSP.

## 2. Harden native receipt validation

`validateNativeReceipt()` currently validates only part of the claimed proof. Make it fail closed on every material field:

- exact schema version, kind, and passed status
- HTTPS origin, except an explicitly marked localhost diagnostic receipt
- exact Chrome product and numeric version
- headed true for accepted evidence; headless must set `diagnosticOnly: true`
- exact required flags and no extras
- exact nine discovered names in the browser's stable discovered order
- exact `object` or `json-string` input mode
- safe successful summaries for both tool executions
- exact revision and ledger deltas
- pending proposal visible, approved context absent, reload persistence, and storage cleanup
- all four application error counts zero and backing arrays empty
- known browser diagnostic count equals the backing array length and is zero or two
- every known diagnostic passes the strict classifier

Add negative unit tests for wrong flags, extra tool, headless receipt claiming accepted evidence, nonzero application error, one known diagnostic, three known diagnostics, source-located CSP error, generic CSP error, and missing execution proof.

Import and use the canonical `MERIDIAN_CONTEXT_DRAFT` fixture in the native executor instead of copying the buyer-context payload.

## 3. Harden final release receipt validation

Extend both the TypeScript validator and JSON schema so `verification.nativeChrome` requires:

- exact Chrome version
- exact nine names from the allowed enum, unique
- `headed: true`
- `diagnosticOnly: false`
- exact required feature flags
- execution result passed
- application error counts all zero
- known browser diagnostic count, zero or two
- evidence path and digest

Extend the overall release verification object so application error counts distinguish console, page, request, and response. All must be zero. Known browser diagnostics must be reported separately and must equal the native receipt count.

Tighten timestamps to valid UTC date-time values and evidence paths to repository-relative paths with no `..` traversal. Tighten required header values to the exact response contract and require all CSP directives, including proof that `unsafe-eval` and `eval-sha256` are absent.

Add negative schema and TypeScript tests for wrong tool names, wrong header value, unsafe CSP, absolute evidence path, path traversal, invalid timestamp, headless native evidence, nonzero application errors, and inconsistent known-diagnostic count.

The durable prepared receipt must remain honest and must not add public or deployment claims.

## 4. Correct evidence language

Update:

- `artifacts/qa/009-release-prep/README.md`
- `artifacts/release/README.md`
- `docs/release-runbook.md`

State precisely that:

- hash-fragment routes are one HTTP document; the public browser suite verifies the Product, Evaluation, and Decision client surfaces
- the native testing lane may record the exact Chrome testing diagnostic separately from application errors
- strict CSP remains enforced and contains neither `unsafe-eval` nor an eval hash allowance
- a verified release may have zero application errors and either zero or two disclosed Chrome testing diagnostics
- natural-language browser-agent selection remains a separate, unrun evidence state

Do not claim item 11 acceptance.

## Required verification

Run:

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
git diff --exit-code -- artifacts/visual-audit/003-baseline artifacts/visual-audit/004-context artifacts/visual-audit/005-evidence artifacts/visual-audit/006-decision artifacts/visual-audit/007-recovery
```

Then start a real local Wrangler origin and run:

```text
PROOFROOM_BASE_URL=http://127.0.0.1:8787 PROOFROOM_ALLOW_HTTP=1 npm run verify:public
PROOFROOM_BASE_URL=http://127.0.0.1:8787 npm run test:public
PROOFROOM_BASE_URL=http://127.0.0.1:8787 PROOFROOM_ALLOW_HTTP=1 PROOFROOM_NATIVE_OUTPUT=artifacts/qa/009-release-prep/native-local.json npm run verify:webmcp:chrome
```

The native run must exit zero, write the real local evidence receipt, show exact native discovery and both native executions, record zero application errors, and record either zero or exactly two known Chrome testing diagnostics. If it produces any other console, page, request, response, or diagnostic state, fail and preserve the blocker.

Confirm:

- CSP is byte-for-byte strict and has no eval allowance
- native verification contains no shim or injected `document.modelContext`
- the real local native receipt validates and is not diagnostic-only
- the prepared release receipt remains `prepared`
- public HTTP and public browser checks still pass
- accepted visual artifacts are byte-identical
- no secret, credential, real customer data, or em dash character was added

## Required report

Return:

1. Exact files changed.
2. Diagnostic classifier and why it is bounded.
3. Native receipt shape and every fail-closed condition.
4. Release receipt hardening and negative tests.
5. Exact local native Chrome result, including Chrome version, nine names, executions, application error counts, known diagnostic count, and receipt digest.
6. Public HTTP and Playwright results.
7. Every command with exact pass or fail counts.
8. Aggregate QA and visual artifact digest before and after.
9. Remaining item 11 risk or one concrete blocker.

## Stop condition

Stop when every correction and verification above is complete, or at the first concrete blocker after preserving diagnostics. Return the report to Codex. Do not deploy, commit, push, begin item 12, add a CSP eval allowance, or claim item 11 acceptance.
