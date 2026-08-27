# Cursor work order 009: Cloudflare release-candidate preparation

## Objective

Prepare ProofRoom for a safe, reproducible Cloudflare Workers release. Harden the Worker response contract, add public-release and native WebMCP verification harnesses, create release evidence structures, and prove the deployment bundle is ready with a Wrangler dry run.

Do not perform the actual deployment. Do not commit or push. Do not begin final README, demo video, or Devpost submission work. Codex owns deployment, public verification, release receipt completion, acceptance, commit, and push.

## Source boundary

- Repository: `/Users/treyharnden/Projects/proofroom-webmcp`
- Read `AGENTS.md`, the PRD and spec Cloudflare, testing, and submission sections, accepted work orders through 008a, current Worker and Wrangler configuration, Vite build output shape, all WebMCP registration code and schemas, the deterministic report, Playwright configuration, and existing release-quality tests.
- Work only in this repository.
- Use the existing Cloudflare Workers static-assets architecture. Add no database, authentication, API service, analytics, model call, or WebMCP tool.
- Keep exactly nine WebMCP tools and two UI-only approvals.
- Preserve all accepted visual artifacts byte-for-byte.
- Use no em dash characters.

## Verified environment and official test path

- Wrangler authentication is healthy for Cloudflare account `0xTrey`.
- Current local Chrome is `Google Chrome 151.0.7922.174`.
- Official challenge guidance says ChatGPT's in-app browser supports WebMCP directly.
- Official Chrome guidance says local testing requires `chrome://flags/#enable-webmcp-testing`.
- For an automated fresh Chrome profile, launch with `--enable-experimental-web-platform-features` and `--enable-features=WebMCP,WebMCPTesting,DevToolsWebMCPSupport`.
- Current testing access uses `document.modelContext.getTools()` and `document.modelContext.executeTool(...)`. Do not use `navigator.modelContextTesting`, the ProofRoom test shim, or an injected fake `document.modelContext` in the native verification lane.

## 1. Harden and test the Worker response contract

Keep the Worker minimal and client-first. Export testable constants or a pure response helper so unit tests can verify exact behavior without a network.

Every Worker response, including SPA fallback and asset responses, must include:

- `Origin-Agent-Cluster: ?1`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Content-Type-Options: nosniff`
- `Cross-Origin-Opener-Policy: same-origin`
- `Content-Security-Policy` with a conservative same-origin policy that allows the existing bundled app, self-hosted fonts, SVG/data images if needed, and inline styles only if the current React UI requires them; it must deny object embedding and framing
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

Do not set `Permissions-Policy: tools=()` or any policy that blocks same-origin WebMCP. The default `tools` policy is `self`. Add an exact test that rejects a blocking tools policy.

Cache behavior:

- document and SPA fallback responses must revalidate or use `no-cache`
- fingerprinted `/assets/` files must use `public, max-age=31536000, immutable`
- non-fingerprinted public assets may use a bounded public cache
- preserve upstream content type, status, and body
- never cache an error response as immutable

Keep `public/_headers` aligned with the Worker security contract where static platform support applies. The Worker is authoritative. Add unit coverage for root HTML, fingerprinted assets, public SVG, 404 or error response, preserved status and content type, every required security header, and absent blocking tools policy.

Update `wrangler.jsonc` to a current `2026-08-26` compatibility date if the official plugin output supports it. Preserve SPA fallback, the `ASSETS` binding, Worker name `proofroom-webmcp`, and observability. Do not add account IDs, routes, secrets, or environment-specific values.

## 2. Add a public-release HTTP verifier

Create a small TypeScript CLI, invoked as `npm run verify:public`, that requires `PROOFROOM_BASE_URL` and fails closed unless it is a valid HTTPS origin, except that an explicit `PROOFROOM_ALLOW_HTTP=1` may allow localhost for development.

It must use argument-safe native Node APIs and verify:

- root returns 200 HTML
- `/#product`, `/#evaluation`, and `/#decision` resolve through the SPA
- HTML identifies ProofRoom, has exactly one document title, includes the module entry, favicon, and social image metadata, and does not expose a real customer claim
- the module entry, CSS asset, favicon, and social image return 200 with correct content types
- module and CSS asset names are fingerprinted
- all required Worker security headers have exact values or exact required directives
- no `Permissions-Policy` value disables `tools`
- HTML is not immutable-cached
- fingerprinted assets are immutable-cached
- unknown SPA route returns the app shell rather than a provider error page
- no response leaks a server exception, stack trace, secret-like token, or directory path

Write a bounded machine receipt only when an explicit repository-relative output path is supplied. The default verification run may write to `/tmp` or stdout. Do not create a fake public receipt during this work order.

Add focused tests with a local fixture HTTP server that prove pass behavior and fail-closed behavior for missing headers, blocking tools policy, non-HTTPS public origin, bad asset content type, provider error page, and immutable HTML.

## 3. Add public browser QA without a local web server

Create `playwright.public.config.ts` and a narrow public test project invoked as `npm run test:public`. It must:

- require `PROOFROOM_BASE_URL`
- never start the local Vite server
- use installed Google Chrome through Playwright's `chrome` channel when available
- begin every test with a clean context and empty site storage
- exercise Product, Evaluation, and Decision at 390 and 1600 pixel widths
- complete the UI-only canonical context, evidence, ROI, brief, decision, ledger, reset, and reload journey against the public origin
- verify exactly one page heading, no horizontal overflow, no uncaught page errors, no console errors, no failed requests, and no HTTP responses at 400 or above
- verify the fictional-content notice and exact nine-tool UI status
- verify source maps are not required by the UI and no request is made for a missing source map
- never capture or mutate accepted local visual artifacts

Reuse existing journey helpers or production fixtures. Do not copy the entire canonical scenario into another divergent constant set. Keep the public suite bounded enough for post-deploy use.

## 4. Add a native flagged-Chrome WebMCP verifier

Create a Node or Playwright CLI invoked as `npm run verify:webmcp:chrome`. It must require `PROOFROOM_BASE_URL` and launch a fresh, headed Google Chrome profile by default. Allow an explicit executable-path environment override. Use the exact feature flags named above.

This lane must use native browser testing APIs only:

1. Navigate directly to the supplied origin.
2. Prove `document.modelContext` exists.
3. Call `document.modelContext.getTools()`.
4. Verify the exact ordered set of nine unique names.
5. Verify every tool has a non-empty description and strict object input schema.
6. Verify read-only hints for the four reads and the untrusted-content hint for evidence search.
7. Verify no approval, rejection, reset, recovery, ROI apply, or direct status authoring tool exists.
8. Execute `get_room_state` with a bounded input through `document.modelContext.executeTool(...)` and verify a structured success result.
9. Execute `propose_buyer_context` through the native API, verify revision and ledger advance once, and verify the pending proposal becomes visible while authoritative approved context remains absent.
10. Reload, prove persisted staged state remains visible, then reset site storage inside the browser context before exit.
11. Record Chrome product/version, origin, exact tool names, safe result summaries, console and request failures, and pass or fail.

The verifier must never inject or replace `document.modelContext`. It must detect an unavailable or incompatible native testing surface and return a precise nonzero blocker. Use a fresh temporary user-data directory and clean it on success or failure. Do not modify the user's normal Chrome profile.

Allow an explicit `PROOFROOM_NATIVE_HEADLESS=1` diagnostic mode, but label that result diagnostic only. The accepted evidence path is headed because WebMCP is designed for a visible human-in-the-loop tab.

Add unit tests for receipt validation, expected tool names and annotations, browser-unavailable failure, native-API-unavailable failure, and cleanup. Do not fabricate a successful native run in unit tests.

## 5. Create release evidence contracts

Create:

- `artifacts/qa/009-release-prep/README.md`
- `artifacts/release/README.md`
- `artifacts/release/release-receipt.schema.json`
- `docs/release-runbook.md`

The release receipt schema must support `prepared`, `deployed`, `verified`, and `failed` states. A `verified` receipt must require:

- schema version and release ID
- public HTTPS URL
- Git commit SHA and clean-tree proof
- GitHub remote and public repository URL
- Cloudflare account label, Worker name, deployment ID or version ID, deployment UTC timestamp, and Wrangler version
- build and bundle measurements
- deterministic eval report digest
- exact response-header readback
- HTTP verifier receipt path and digest
- public Playwright result and exact count
- native Chrome version, exact nine discovered tool names, native execution result, evidence path, and digest
- UI-only public journey result
- console, request, and response error counts
- visual artifact digest before and after release verification
- known limitations and live natural-language agent-selection status

The `prepared` state must not contain fake deployment IDs, URLs, or verification results. The schema must prevent `verified` without complete proof. Add schema-validation tests for honest prepared state, missing verified proof, and complete synthetic fixture shape. Do not create a synthetic verified receipt in the durable artifacts tree.

The runbook must give Codex exact noninteractive commands for:

1. clean-tree and remote checks
2. `npm run qa`
3. Wrangler authenticated account readback
4. deploy dry run
5. actual `wrangler deploy`
6. capture public URL and deployment/version ID
7. `npm run verify:public`
8. `npm run test:public`
9. `npm run verify:webmcp:chrome`
10. final curl header readback
11. release receipt completion and schema validation
12. checklist acceptance, commit, and push sequencing

The runbook must never claim that a local build, deploy command, URL, or browser test proves another lifecycle state.

## 6. Add release scripts and dry-run gate

Add scripts with clear names:

- `deploy:dry-run`
- `verify:public`
- `test:public`
- `verify:webmcp:chrome`
- `release:receipt:validate`

Keep `npm run deploy` as the only actual deployment command. It must still build before Wrangler deploy.

Run `npm run deploy:dry-run` and prove it uses the redirected Cloudflare Vite output, reads all required static assets, sees the `ASSETS` binding, and exits before mutation.

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

Also run the public HTTP verifier and public Playwright suite against an explicit localhost `wrangler dev` origin using `PROOFROOM_ALLOW_HTTP=1`. Run the native headed-Chrome verifier against that same real local HTTP origin. If native Chrome blocks for a concrete platform reason, preserve diagnostics and report the exact blocker. Do not replace the lane with a shim.

Confirm:

- Wrangler deploy dry run is mutation-free
- current configuration builds the expected Worker and static assets
- every required security header is tested
- `Permissions-Policy` does not disable tools
- local public-verifier fixtures fail closed for every named error
- public Playwright config starts no local server
- native verification uses fresh Chrome 151, the WebMCP feature flags, and no injected shim
- release-receipt schema cannot claim verified without full proof
- accepted visual artifacts are byte-identical
- no secret, credential, account token, real customer data, or em dash character was added

## Required report

Return:

1. Exact files changed.
2. Worker headers, cache rules, and tests.
3. Public HTTP verifier behavior and negative fixtures.
4. Public Playwright scope and local-origin result.
5. Native Chrome launch details, exact WebMCP discovery and execution result, or one concrete blocker.
6. Release receipt schema states and fail-closed evidence.
7. Wrangler dry-run output, asset count, binding, and result.
8. Every command with pass or fail and exact counts.
9. Aggregate QA result and visual artifact hash before and after.
10. Remaining item 11 risk or one concrete blocker.

## Stop condition

Stop when Cloudflare release preparation and every local verification above are complete, or at the first concrete blocker after preserving diagnostics. Return the report to Codex. Do not deploy, commit, push, begin item 12, or claim item 11 acceptance.
