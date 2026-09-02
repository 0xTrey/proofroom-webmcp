# Build Notes

## August 26, 2026

### Direction

- Selected ProofRoom, an agent-native B2B buyer evaluation room.
- Kept the buyer-facing concept from the Pro recommendation.
- Merged the evidence, approval, and receipt mechanics from LaunchProof.
- Set the canonical vendor and buyer as fictional to keep the public repository safe.

### Autoresearch

- Baseline score: 82/100.
- Scope-compressed plan: 88/100, kept.
- Demo-first architecture: 91/100, kept.
- Visual expansion: 85/100, rejected.
- Trust contract and evals: 94/100, kept as current best.
- Neon collaboration: 89/100, rejected.
- Embedded AI chat: 84/100, rejected.
- Vendor outreach: 85/100, rejected.
- Category generalization: 90/100, rejected.
- Multi-buyer collaboration: 92/100, rejected.
- Five consecutive rejected mutations triggered the local-maximum stopping condition.

### Architecture decisions

- Use a static client-first React application on Cloudflare.
- Do not use Neon for the challenge MVP.
- Do not call an external model from the application.
- Keep all fixtures deterministic and public-safe.
- Keep approval actions UI-only.
- Use one shared domain action layer for UI and WebMCP.
- Use a test shim for deterministic tool verification.
- Preserve a complete UI-only fallback journey.

### Source verification

- Inspected the official WebMCP repository at `41d12f057167ccf5954dbcf49d99502cb6c84491`.
- Inspected the official Cloudflare WebMCP React example at `2f957bc2a3ffb7aee14792bb3cb658ad3176ed93`.
- Confirmed Cursor, GitHub, Wrangler, and Cloudflare authentication.
- Confirmed local Node 22.22.3, so dependency versions must not require Node 24.

### Build mode

- Cursor CLI performs implementation in bounded milestones.
- Codex owns diff review, independent tests, visual QA, defect ledgers, revised handoffs, deployment verification, and completion claims.
- Cursor must report changed files, commands, results, blockers, and residual risks after each work order.

### Accepted foundation milestone

- Cursor work order 001 built the Node 22-compatible React, TypeScript, Vite, Cloudflare, domain, state, persistence, WebMCP, test-shim, and baseline-shell foundation.
- Codex found three release-blocking gaps: the Playwright host was unreachable, unmatched evidence searches returned the full catalog, and partially supported hard requirements did not block a ready decision.
- Cursor work order 002 corrected those gaps and added decision-proposal consistency guards for duplicate, overlapping, supported-blocker, and omitted-blocker IDs.
- Codex independently reproduced all gates after the corrections: 137 unit and component tests, 3 end-to-end journeys, 12 axe checks across four target widths, lint, typecheck, eval manifest, and production build.
- Checklist items 1 through 4 are accepted.

### Accepted premium baseline milestone

- Cursor work order 003 replaced the foundation shell with three coherent product surfaces: product proof, evaluation workspace, and decision desk.
- The visual direction uses an editorial due-diligence system with warm paper, deep ink, acid green verification, cobalt agent actions, rust gaps, and Newsreader, Manrope, and IBM Plex Mono typography.
- Codex rejected one misleading metric because the activity ledger counted a system bootstrap event as a read. Cursor work order 003a corrected the selector and added a canonical regression test.
- Codex also found transient contrast failures caused by entrance-animation opacity and invalid description-list grouping. Cursor work order 003b removed opacity animation and repaired the semantic markup.
- Codex independently reproduced all acceptance gates: 140 unit and component tests, 16 end-to-end checks, 12 axe scans across 390, 768, 1280, and 1600 pixel widths, lint, typecheck, eval manifest, and production build.
- Twelve final visual artifacts and their audit index live in `artifacts/visual-audit/003-baseline/`.
- Checklist item 5 is accepted. Items 6 through 12 remain open.

### Accepted buyer-context milestone

- Cursor work order 004 added exact buyer-context proposal review, UI-only approval and rejection, a durable approval rail and receipt, and immediate personalization across the product narrative, capability order, evidence emphasis, and packaging recommendation.
- Codex rejected three acceptance defects: the first receipt implementation depended on a capped activity ledger, rejection copy became false after a prior approval, and a current browser test rewrote accepted item 5 screenshots. Cursor work order 004a persisted the exact receipt atomically, made the rejection language state-aware, and made the item 5 visual evidence immutable.
- Codex found one final trust-boundary defect: a shape-valid but inconsistent receipt in untrusted persistence could appear authoritative. Cursor work order 004b added cross-state validation for receipt kind, proposal linkage, revision, approved context, and payload digest, with five corruption recovery tests.
- Codex independently reproduced all acceptance gates after the corrections: 158 unit and component tests, 25 end-to-end checks, 24 axe scans, 12 eval cases with nine known tools, lint across 112 files, typecheck, production build, secret scan, writing guard, and historical-artifact diff.
- Eight final visual artifacts and their audit index live in `artifacts/visual-audit/004-context/`.
- No WebMCP approval tool exists. A browser agent can stage context, but only the person can approve or reject it in the page.
- The buyer-approved context changes four product regions while the unproven EU data residency requirement remains explicitly unknown.
- Checklist item 6 is accepted. Items 7 through 12 remain open.

### Accepted requirement and evidence milestone

- Cursor work order 005 turned the evaluation route into an interactive six-requirement dossier with shared-action evidence search, source inspection, evidence attachment, buyer notes, open questions, and a complete UI-only fictional review path.
- The canonical review set lands honestly at three supported requirements, two partially supported requirements, and one unknown requirement. EU data residency remains unknown after two relevant records because neither proves an EU region or EU subprocessor disclosure.
- The untrusted testimonial record renders its complete prompt-injection sentence inside an inert quarantine. The record may remain attached for audit context, but it cannot prove restricted SSO or compliance conditions.
- Codex rejected four acceptance defects: the inspector was fixed to the full transformed route instead of the viewport, normal browser tests rewrote accepted visual evidence, local evaluation errors survived unrelated success, and the testimonial behavior description contradicted the domain rule.
- Cursor work order 005a moved the inspector into a body portal, added exact scroll-lock cleanup and viewport geometry tests, made visual capture explicitly opt-in, added revision-aware feedback ownership, and corrected the public tool contract.
- Codex independently reproduced all acceptance gates: 175 unit and component tests, 28 end-to-end checks, 28 axe scans, 12 eval cases with nine known tools, lint across 124 files, typecheck, production build, secret scan, writing guard, and historical-artifact diff.
- Codex also proved identical SHA-256 hashes for all 31 files across item 5, item 6, and item 7 visual evidence before and after the final normal E2E run.
- Eight final visual artifacts and their audit index live in `artifacts/visual-audit/005-evidence/`. The inspector captures are true 1600 by 900 and 390 by 900 viewport panels.
- Checklist item 7 is accepted. Items 8 through 12 remain open.

### Accepted ROI, briefs, and decision milestone

- Cursor work order 006 built the editable buyer-owned ROI model, evidence-safe CFO and CISO briefs, exact staged decision review, visible page-only approval and rejection, durable decision receipts, and strict decision-persistence validation.
- The canonical model remains bounded and explicit: 20 campaigns per month, 6 hours saved per campaign, 85 USD loaded hourly cost, 96,000 USD annual subscription, 18,000 USD implementation, 120,000 USD budget ceiling, 1,440 annual hours saved, 122,400 USD annual labor value, 114,000 USD first-year cost, 8,400 USD first-year net value, and 11.2 month payback.
- The canonical decision is honestly `not_ready`. EU data residency is unknown, SSO and provisioning is partially supported, and both remain hard blockers. Salesforce, SOC 2, and campaign volume are fully supported.
- Codex rejected four trust-contract defects in the first pass: unreachable ROI field errors, no-op ROI applies that advanced revision, status-insensitive proof qualifiers, and incomplete visual evidence. Cursor work order 006a made errors visible without losing the draft, made no-op apply atomic, added status-aware brief guards, required the exact canonical review set, and generated all eight required images.
- Codex then rejected two mobile evidence defects: the proposal capture did not visibly contain its claimed blockers, and receipt fields lacked clear mobile separation. Cursor work order 006b added viewport-level blocker assertions, corrected narrow receipt layout, and regenerated the evidence.
- Codex independently reproduced all acceptance gates: 253 unit and component tests, 31 end-to-end checks, 32 axe scans, 12 eval cases with nine known tools, lint across 138 files, typecheck, production build, diff checks, and historical-artifact verification.
- The complete visual artifact tree remained byte-identical across normal E2E, with SHA-256 digest `36b31997c1907f4c097064c3f448c5e57bbb0109f0d3a42b510bf01909e19b19` before and after the run.
- Eight final visual artifacts and their audit index live in `artifacts/visual-audit/006-decision/`. The 390-pixel proposal frame visibly includes both hard blockers, and the receipt fields remain distinct and readable at 390 and 1600 pixels.
- Exactly nine WebMCP tools remain. `calculate_roi` is read-only, decision proposals are staged only, and no tool can apply ROI assumptions, approve, or reject.
- Checklist item 8 is accepted. Items 9 through 12 remain open.

### Accepted activity ledger, reset, and recovery milestone

- Cursor work order 007 replaced the totals-only activity section with a real authoritative ledger register. It exposes stable event IDs and sequence values, UTC time, origin, action and tool, panel, read or mutation kind, revision transition, safe summary, result, affected IDs, digest, and untrusted-content state.
- Ledger filtering combines origin, kind, and panel without changing room state. It defaults to newest first, renders 25 records at a time, preserves the 400-event cap, and keeps System lifecycle events out of the Agent-read total.
- A global in-app reset dialog now states exactly what is removed and restored. Cancel and Escape are mutation-free, confirmation calls the existing UI-only reset action once, and the result returns revision 0, six requirements, twelve evidence records, one canonical System event, and a non-authoritative reset receipt.
- Invalid saved state and unsupported versions fall back without partial trust. Legacy schema-version-1 buyer-context receipts are reconstructed only from a still-present approval event and surfaced as a typed migration notice. Explicit continue actions persist the recovered or upgraded room so the notice does not repeat after reload.
- Browser persistence retry stays outside the room action ledger and changes no revision or event. Render failures hide arbitrary thrown text, allow a presentation-only retry, and route reset through the same confirmation dialog.
- Partial or failed WebMCP registration now has a cleanup-first retry path that never duplicates the exact nine registered names or changes room state.
- Codex independently reproduced every acceptance gate: 278 unit and component tests, 36 end-to-end checks, 48 axe scans, 12 eval definitions with four safety cases and nine known tools, lint across 151 files, typecheck, production build, diff checks, and historical-artifact verification.
- The full visual artifact tree remained byte-identical across normal E2E, with SHA-256 digest `4548b3889caff22fdde72ad8efdd340c1d42fc97c8ee2c906b6ba52cfe1f4d42` before and after the run.
- Eight final visual artifacts and their audit index live in `artifacts/visual-audit/007-recovery/`: populated ledger, reset confirmation, invalid-state recovery, and successful reset receipt at 390 and 1600 pixels.
- Checklist item 9 is accepted. Items 10 through 12 remain open.

### Executable eval and release-candidate QA implementation

- Cursor work order 008 reconciled all twelve manifest cases with exact repeated calls and added a
  strict Zod-backed manifest, expected-sequence, executor, and assertion contract.
- Every case creates a fresh fixed-clock room, applies only its named setup, registers the nine
  production WebMCP definitions through the model-context shim, invokes the real shared actions,
  checks every required invariant and forbidden outcome, and proves complete registry cleanup.
- Work order 008a added explicit read-before-mutation dependencies, exact read and mutation revision
  discipline, complete negative contract coverage, and the required machine-report fields.
- The deterministic receipt at `evals/results/deterministic-report.json` passed 12 of 12 cases, 41
  real shim tool calls, and 58 executable assertions. Manifest SHA-256 is
  `04f622a2b5358bd7532df4a72c5d81f3e35bb143f177561399f8e6bd2dfb4f2d`; expected-sequence SHA-256
  is `4be96767aca3f2604570e4a9b9ec3f89c1b77fcce71c2338d6582ab392fb8df2`; receipt SHA-256 is
  `0edab70eaf1a9899bbeb426b0b5dfdc4896e49d207b5a32bff2c53c6ca010b06`.
- The receipt is byte-identical across repeat runs and excludes full room state, raw buyer-context
  payloads, raw brief text, raw untrusted testimonial content, and stack traces.
- Live browser-agent tool selection remains explicitly `not_run`. Its separate schema and validator
  accept the honest unverified record but do not count it as a pass.
- `npm run qa` passed lint and the writing guard, typecheck, 325 Vitest tests, production build,
  exact bundle budgets, 38 Chromium end-to-end tests, 48 axe checks, the deterministic eval suite,
  live-agent record validation, and `git diff --check`.
- Production output is 125,030 bytes gzip for total client JavaScript, 23,219 bytes gzip for total
  CSS, and 441,935 bytes raw for the largest client JavaScript asset. The exact limits are 153,600,
  40,960, and 614,400 bytes respectively.
- Production source maps are enabled. Two maps totaling 1,840,277 raw bytes and 64 self-hosted fonts
  totaling 660,040 raw bytes are reported and excluded from application-code gzip totals.
- All 49 accepted visual-audit files, totaling 13,924,973 bytes, remained byte-identical before and
  after the aggregate QA matrix. The tree SHA-256 was
  `3ae653285619e5977c69f5ad472866da40b1eaa026911946d0b77e1ef00110fe` both times.
- Codex independently reproduced the full aggregate QA matrix, both deterministic report hashes,
  bundle measurements, source-map handling, negative contract coverage, and byte-identical visual
  artifact digest after source review of the runner, schemas, orchestration, and tests.
- Checklist item 10 is accepted. Items 11 and 12 remain open.

### Accepted Cloudflare public release milestone

- Cursor work orders 009 through 009c added the Worker security and cache contract, public HTTP verifier, public Playwright journey, native headed-Chrome WebMCP verifier, release receipt schema, evidence-file validation, and release runbook.
- Codex rejected the first native evidence rule because Chrome 151 reported the strict-CSP testing notice at the loaded module entry. A phase-instrumented reproduction proved one notice during initial registration and one during reload registration, with none during native discovery or execution.
- The accepted native contract requires exact initial and reload phases, the same fingerprinted module URL and location, an identical anchored eval-hash message, strict CSP, a clean served-entry scan, exact nine-tool discovery before and after reload, successful native execution, and zero application console, page, request, and response errors.
- Codex also rejected a receipt validator that did not execute its committed JSON Schema or cross-check referenced evidence bytes. The accepted validator now runs TypeScript and Ajv validation, rejects unknown nested keys and contradictory lifecycle fields, verifies repository-contained evidence files and SHA-256 digests, and cross-checks public and native origins and summaries.
- The audited deployment commit is `82ee322b4e4e8c8658e8eed605431974d084afca`, pushed to the public GitHub repository before deployment.
- Cloudflare Worker `proofroom-webmcp` deployed to `https://proofroom-webmcp.harnden-trey.workers.dev` as version `86b01690-7492-4a37-ae70-3c71d50f43c7` at `2026-08-27T04:22:14.782Z`.
- Public HTTP verification passed nine responses with exact security headers, revalidating HTML, immutable fingerprinted assets, working SPA fallback, and no provider-error or leak signatures.
- Public Playwright completed the full UI-only canonical journey at 390 and 1600 pixels with 2 passed and 0 failed tests, no console or page errors, no failed requests, and no HTTP responses at 400 or above.
- Headed Google Chrome `151.0.7922.174` discovered the exact nine native tools before and after reload. `get_room_state` and `propose_buyer_context` executed through `document.modelContext`; revision advanced `0 -> 1`, ledger count advanced `2 -> 3`, pending state was visible, approved context remained absent, reload persistence passed, and browser storage was cleared.
- The served module was `/assets/index-CitHfJ6b.js`, 441,935 bytes, SHA-256 `9313f8c97d9ddddd3ec29f43d6f3a77ec3a342072b2f05da2817990d7f74415f`, with zero forbidden marker matches. The two disclosed Chrome testing notices occurred at line 8, column 0 during initial and reload registration. Application error counts were all zero.
- The final verified receipt is `artifacts/release/release-receipt.json`, SHA-256 `a8f419f12ed299994e7fc90e0d2251e77e3b39a7653c7b5aedb3d9abfa9e8560`. Its combined validator independently read and validated both public evidence files.
- The final local acceptance matrix passed 423 unit and component tests, 38 end-to-end checks, 48 accessibility checks, 12 deterministic evals, bundle budgets, a 71-asset Wrangler dry run, and byte-identical accepted visual evidence with SHA-256 `3ae653285619e5977c69f5ad472866da40b1eaa026911946d0b77e1ef00110fe`.
- Live natural-language browser-agent selection remains explicitly `not_run` and is not counted as a pass.
- Checklist item 11 is accepted. Item 12 remains open.

### Current documentation state (August 29, 2026)

- Verified public baseline: deployment commit `82ee322b4e4e8c8658e8eed605431974d084afca`, Cloudflare
  version `86b01690-7492-4a37-ae70-3c71d50f43c7`, 423 unit and component tests, 38 end-to-end
  tests, 48 accessibility checks, 12 deterministic evals passed.
- Current local candidate after work orders 011 through 014a and autoresearch run 12: 483 unit and
  component tests, 45 end-to-end tests, 52 accessibility checks, 12 deterministic eval cases with 60
  assertions; not committed, pushed, deployed, or reflected in Devpost.
- External Devpost shell: authenticated project `1402028`, Untitled, empty, `submission_pre_draft`,
  no video, not submitted. No local Devpost journey-state file exists in the repository.
- Live natural-language browser-agent selection remains `not_run`.
