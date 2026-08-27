# Cursor work order 009b: phase-bound Chrome diagnostic evidence

## Objective

Resolve the remaining item 11 preparation blocker by replacing the incorrect empty-location assumption with a stricter, phase-bound contract based on Codex's independent Chrome 151 reproduction. Preserve strict CSP and fail closed on every unrelated console, page, request, or response error.

Do not deploy, commit, push, begin item 12, change the product UI, add a CSP eval allowance, or weaken any accepted test. Codex owns acceptance and deployment.

## Source boundary

- Repository: `/Users/treyharnden/Projects/proofroom-webmcp`
- Read work orders 009 and 009a, their implementation, the Cursor 009a report, and this work order.
- Work only in this repository.
- Preserve exactly nine WebMCP tools, two UI-only approvals, the strict CSP, and all accepted visual artifacts.
- Use no em dash characters.

## Independent root-cause evidence

Codex ran a fresh headed Google Chrome `151.0.7922.174` profile against a real local Wrangler origin with exactly these flags:

```text
--enable-experimental-web-platform-features
--enable-features=WebMCP,WebMCPTesting,DevToolsWebMCPSupport
```

A phase-instrumented diagnostic run produced:

- initial navigation and native registration: one exact eval-hash notice
- `document.modelContext.getTools()`: zero new notices
- the application module entry was `/assets/index-CitHfJ6b.js`
- the notice location was that exact loaded module URL, line 8, column 0
- a successful full verifier run produced the same notice once on initial registration and once on intentional reload registration
- the built module contains none of `eval(`, `new Function`, `eval-sha256`, or `Hash of blocked script`
- strict CSP remained `script-src 'self'`

The empty-location rule in 009a is therefore invalid for Chrome 151. The bundle attribution is how this browser reports the blocked WebMCP testing registration script. Do not classify a source-located message generically. Accept only the precise loaded-entry, lifecycle-bound shape below.

## 1. Add lifecycle phase and entry-integrity evidence

Extend every captured console error with a verifier lifecycle phase. Use stable names such as:

- `initial_registration`
- `native_discovery`
- `native_execution`
- `reload_registration`
- `cleanup`
- `other`

Set phases before each operation so an error is attributed at event time. Do not infer phases after the run.

After initial navigation, resolve the exact loaded module entry from the HTML document. Fetch its bytes through the page or browser context and record:

- same-origin module entry URL
- repository-safe URL path
- SHA-256 digest of the served bytes
- byte count
- scan results proving the served entry contains none of `eval(`, `new Function`, `eval-sha256`, or `Hash of blocked script`

Fail if the entry is absent, not same origin, not fingerprinted, empty, cannot be fetched, or contains any forbidden marker. This is an evidence scan, not a CSP substitute.

Read the effective root CSP in the browser and prove it equals the Worker contract and contains neither `unsafe-eval` nor `eval-sha256`.

## 2. Replace the classifier with a phase-bound contract

Allow zero known diagnostics for a future Chrome that emits none. If any known diagnostics exist, require exactly two and require all of these conditions:

- headed Google Chrome with a numeric version
- exact required feature flags and no extras
- all native functional assertions have passed
- initial and reload registration each discover the exact nine tools
- exact anchored message shape `Hash of blocked script: "eval-sha256-<base64 SHA-256>".` with optional surrounding whitespace and nothing else
- both messages are byte-for-byte identical
- one message has phase `initial_registration`
- one message has phase `reload_registration`
- neither message occurs during discovery, execution, cleanup, or another phase
- both location URLs exactly equal the resolved, same-origin loaded module entry URL
- both locations have the same positive line and same nonnegative column
- the served module entry passes every integrity scan above
- the effective CSP is the unchanged strict contract

Every generic CSP error, different hash message, one or three notices, mismatched messages, wrong phase, wrong URL, non-fingerprinted entry, different locations, app bundle marker, page error, request failure, response failure, or other console error must remain an application failure.

Update the diagnostic reason so it truthfully says Chrome 151 attributed the blocked WebMCP testing registration script to the loaded module entry during initial and reload registration. Do not call it browser-internal without the phase and entry evidence.

## 3. Prove reload registration and persist complete evidence

After reload, wait for and validate the exact nine native tools again before treating reload persistence as complete. Record `reloadRegistrationVerified: true` in the receipt.

Extend the native receipt with:

- lifecycle phase on each known diagnostic
- complete entry-integrity object
- exact effective CSP
- `reloadRegistrationVerified`

Harden `validateNativeReceipt()` so no field can be omitted or contradicted. Update the final release receipt TypeScript validator and JSON Schema as needed so verified release evidence references a passing native receipt with the phase-bound contract and entry digest.

Add negative tests for wrong phase, two diagnostics in one phase, wrong source URL, mismatched messages, mismatched locations, zero or nonnumeric source line, entry marker present, non-fingerprinted entry, CSP mismatch, missing reload registration proof, and missing entry digest. Keep all 009a negative tests.

## 4. Correct documentation

Update the 009 evidence README, release evidence README, and release runbook. State that Chrome 151 reports the strict-CSP WebMCP testing registration notice at the loaded module entry during initial and reload registration. Explain that the verifier classifies it only with exact phase, source, entry-integrity, CSP, native execution, and count proof. Do not describe all source-located CSP messages as acceptable.

Do not claim item 11 acceptance or public verification.

## Required verification

Run the focused native, Worker, and release receipt suites first. Then run:

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

Start a real local Wrangler origin and run:

```text
PROOFROOM_BASE_URL=http://127.0.0.1:8787 PROOFROOM_ALLOW_HTTP=1 npm run verify:public
PROOFROOM_BASE_URL=http://127.0.0.1:8787 npm run test:public
PROOFROOM_BASE_URL=http://127.0.0.1:8787 PROOFROOM_ALLOW_HTTP=1 PROOFROOM_NATIVE_OUTPUT=artifacts/qa/009-release-prep/native-local.json npm run verify:webmcp:chrome
```

The native lane must exit zero and the written receipt must independently validate. It must show exact initial and reload discovery, successful native reads and mutation proposal, correct persistence, zero application errors, strict CSP, clean module-entry scan, and either zero or exactly two phase-bound known diagnostics.

Confirm:

- native verification contains no shim or injected `document.modelContext`
- the strict CSP is unchanged and has no eval allowance
- the prepared release receipt remains `prepared`
- public HTTP and public browser checks pass
- accepted visual artifacts remain byte-identical
- no secret, credential, real customer data, or em dash character was added

## Required report

Return:

1. Exact files changed.
2. Lifecycle and entry-integrity contract.
3. Classifier conditions and every new negative test.
4. Exact native local receipt result, including Chrome version, phases, source URL path, line and column, entry digest, CSP, discovered tools before and after reload, executions, application error counts, known diagnostic count, and receipt digest.
5. Public HTTP and public Playwright results.
6. Every command with exact pass or fail counts.
7. Aggregate QA and visual artifact digest before and after.
8. Remaining item 11 risk or one concrete blocker.

## Stop condition

Stop when every correction and verification above is complete, or at the first concrete blocker after preserving diagnostics. Return the report to Codex. Do not deploy, commit, push, begin item 12, weaken CSP, or claim item 11 acceptance.
