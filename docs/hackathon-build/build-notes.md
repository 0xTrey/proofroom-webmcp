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
