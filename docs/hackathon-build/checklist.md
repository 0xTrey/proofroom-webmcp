# Build Checklist

## Build Preferences

- **Build mode:** Autonomous Cursor implementation with Codex audit loops
- **Comprehension checks:** Not applicable
- **Git:** Commit after each accepted milestone; push only after Codex verifies the milestone
- **Verification:** Enabled at every milestone
- **Check-in cadence:** Cursor returns a structured report after each work order; Codex updates the defect ledger and next handoff
- **Stop behavior:** Cursor stops on named blockers, failing acceptance gates it cannot resolve, or completion of the assigned milestone

## Checklist

- [x] **1. Establish repository and implementation skeleton**
  Spec ref: `spec.md > Stack`, `spec.md > File Structure`, `spec.md > Cloudflare Deployment`
  What to build: Scaffold the React, TypeScript, Vite, testing, linting, Cloudflare, fonts, and design-token foundation. Add MIT license, AGENTS.md, package scripts, local app shell, and WebMCP declaration placeholder.
  Acceptance: The project installs on Node 22, starts locally, builds, lints, typechecks, and runs one smoke test. The initial page is not a generic starter screen.
  Verify: `npm install`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.

- [x] **2. Build canonical fixtures and domain model**
  Spec ref: `spec.md > Domain Model`, `spec.md > Invariants`, `spec.md > ROI Formula`
  What to build: Implement vendor, buyer, six requirements, twelve evidence records, state types, strict Zod schemas, typed errors, evidence rules, proposal rules, ROI formula, receipts, and canonical reset fixture.
  Acceptance: Domain tests prove all invariants, including EU residency unknown, testimonial evidence ineligible for compliance, stale approval rejection, atomic failure, and deterministic reset.
  Verify: `npm run test -- domain` and `npm run typecheck`.

- [x] **3. Build shared state and action layer**
  Spec ref: `spec.md > Architecture`, `spec.md > Data Flow`, `spec.md > Persistence`
  What to build: Implement Zustand store, `RoomActions`, selectors, local persistence adapter, in-memory test adapter, migration/recovery behavior, revisioning, and real activity events.
  Acceptance: UI and future tools can use the same actions; every successful mutation increments once; failed actions do not mutate; reload and reset tests pass.
  Verify: `npm run test -- state domain` and `npm run typecheck`.

- [x] **4. Implement and test all WebMCP tools**
  Spec ref: `spec.md > WebMCP Tool Contracts`, `spec.md > Tool Registration Lifecycle`
  What to build: Implement nine tool schemas and definitions, native registration with abort cleanup, supported/unavailable/error state, partial registration handling, and a test shim.
  Acceptance: Nine tools register with correct annotations; strict inputs reject invalid calls; UI-only approvals are absent; real actions and events run through the shim.
  Verify: `npm run test -- webmcp`, `npm run typecheck`, and a local shim inspection.

- [x] **5. Build the premium baseline product experience**
  Spec ref: `spec.md > Visual System`, `prd.md > Epic 1`
  What to build: Create the Northstar product page, navigation, WebMCP status, fictional-content notice, responsive shell, and visual system. Implement the editorial due-diligence aesthetic without generic dashboard patterns.
  Acceptance: Baseline page is coherent at four target widths, works without WebMCP, starts with one primary headline, and meets keyboard and contrast basics.
  Verify: Component tests, Playwright screenshots at 390/768/1280/1600, axe smoke test, manual visual audit.

- [x] **6. Build context proposal, approval, and personalization**
  Spec ref: `prd.md > Epic 2`, `spec.md > Human approval`
  What to build: Create context proposal UI, exact payload review, approval and rejection, stale-state errors, approved-context rail, and meaningful product reordering and emphasis.
  Acceptance: Agent stages but cannot approve; user approval transforms at least three product regions; EU gap remains visible; reduced-motion path works.
  Verify: Component tests, shim tool test, Playwright transformation test, visual before/after comparison.

- [x] **7. Build the requirement and evidence workspace**
  Spec ref: `prd.md > Epic 3`, `spec.md > EvidenceRecord`, `spec.md > Requirement`
  What to build: Create the six-row matrix, status marks, evidence search and drawers, limitations, contradictions, open questions, notes, and mobile record layout.
  Acceptance: Evidence invariant is visible and enforced; unknown is intentional; search and attachment work through UI and WebMCP; malicious testimonial instructions render only as untrusted text.
  Verify: Domain, component, WebMCP, Playwright, mobile, keyboard, and axe tests.

- [x] **8. Build ROI, stakeholder briefs, and decision approval**
  Spec ref: `prd.md > Epic 4`, `prd.md > Epic 5`, `prd.md > Epic 6`
  What to build: Implement bounded ROI inputs and results, calculation review, CFO/CISO briefs, decision proposal, human approval/rejection, blocker visibility, and receipt.
  Acceptance: Budget changes cause deterministic re-evaluation; every hard requirement must be fully supported for ready; briefs cannot contradict requirement state; stale decision approval fails.
  Verify: Unit, component, shim tool, and canonical Playwright journey tests.

- [x] **9. Build the activity ledger, reset, and recovery states**
  Spec ref: `prd.md > Epic 7`, `prd.md > Epic 8`
  What to build: Implement ledger filters, safe summaries, revision display, reset confirmation, canonical fixture recovery, persisted-state migration notice, and error boundary behavior.
  Acceptance: Ledger uses real domain events only; reset restores fixture; corrupted state recovers safely; no raw sensitive context is stored in events.
  Verify: Unit, component, reload, reset, persistence-corruption, and Playwright tests.

- [x] **10. Implement the eval suite and full QA matrix**
  Spec ref: `spec.md > Evals`, `spec.md > Testing`
  What to build: Create twelve eval cases, expected sequences, deterministic runner, all target-width tests, accessibility suite, console-error gate, and reduced-motion checks.
  Acceptance: All automated commands pass; forbidden outcomes are tested; agent-selection results have a separate evidence slot for live browser execution.
  Verify: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run test:a11y`, `npm run evals`, `npm run build`.

- [ ] **11. Deploy and verify the public release candidate**
  Spec ref: `spec.md > Cloudflare Deployment`, `spec.md > Demo And Submission Flow`
  What to build: Deploy to Cloudflare, configure headers, verify public assets and SPA routes, run public browser QA, verify WebMCP discovery in a supported browser, and write a release receipt.
  Acceptance: Public 200, correct security headers, no console errors, canonical agent journey passes, UI-only journey passes, commit and deployment hashes are recorded.
  Verify: Wrangler output, HTTP header readback, browser QA, WebMCP tool discovery, release receipt readback.

- [ ] **12. Prepare the open-source and Devpost handoff**
  Spec ref: `prd.md > Submission Proof Points`
  What to build: Finish README, architecture explanation, exact tool table, test instructions, limitations, screenshots, demo script, video shot list, project description, and submission checklist.
  Acceptance: A judge can understand and test ProofRoom without private context; all claims match verified behavior; public repo shows MIT license; demo script fits under three minutes.
  Verify: Fresh-clone setup, link check, claim/source review, timed demo rehearsal, public repo and live URL readback.
