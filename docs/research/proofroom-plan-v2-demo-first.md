# ProofRoom Plan V2: Demo-First Architecture

## Success signal

A judge opens a public URL, resets the room, runs the canonical prompt with an agent, sees the page change through real WebMCP tools, inspects the evidence and activity trail, and reaches a defensible `not ready` recommendation in less than three minutes.

## Architecture decision

Use a static React and TypeScript application deployed to Cloudflare. Keep all challenge data local and deterministic. Do not use Neon, authentication, a server database, or an application-side language model.

Why:

- The browser agent supplies the intelligence.
- Deterministic product data makes evidence and expected tool sequences testable.
- Local state eliminates network and account failures during judging.
- Cloudflare provides a public HTTPS origin and configurable headers.
- A no-WebMCP fallback remains a complete interactive product.

## Stack

- Vite
- React
- TypeScript in strict mode
- Zustand for shared room state
- Zod for tool input and evidence validation
- Vitest and React Testing Library
- Playwright for end-to-end and responsive testing
- axe-core for automated accessibility checks
- Cloudflare Pages for hosting

## State model

### RoomState

- `schemaVersion`
- `roomId`
- `revision`
- `buyerContextProposal`
- `approvedBuyerContext`
- `requirements`
- `evidenceCatalog`
- `roiAssumptions`
- `roiResult`
- `stakeholderBriefs`
- `decisionProposal`
- `approvedDecision`
- `activityLedger`
- `webMcpStatus`

Every mutation increments `revision` and appends a ledger event. Reset restores the canonical fixture exactly.

### Requirement invariant

`status = supported` is valid only when:

- at least one attached evidence record is active;
- the evidence record explicitly covers the requirement;
- the evidence is not expired or disallowed;
- no hard contradiction exists.

If any condition fails, the domain action returns a structured error and leaves state unchanged.

## Shared domain actions

Both UI controls and WebMCP tools call functions under `src/domain/actions/`. Components never mutate the store directly.

Examples:

- `proposeBuyerContext(input)`
- `approveBuyerContext(proposalId)`
- `stageRequirement(input)`
- `attachEvidence(input)`
- `evaluateRequirement(requirementId)`
- `calculateRoi(assumptions)`
- `saveStakeholderBrief(input)`
- `proposeDecisionStatus(input)`
- `approveDecision(proposalId)`
- `resetRoom()`

## WebMCP adapter

`src/webmcp/registerTools.ts` performs feature detection and registers the nine tools. It contains no product logic. Each tool:

1. validates input with Zod;
2. calls one domain action;
3. returns structured state identifiers and suggested next actions;
4. appends one real ledger event through the domain layer;
5. reports whether the operation was read-only or mutating.

Read-only tools use `readOnlyHint`. Evidence search results use `untrustedContentHint` when they include testimonial or externally sourced text.

## UI composition

### Product view

A premium fictional software page with a persistent approved-context summary. Personalization changes order, emphasis, proof selection, and navigation state rather than replacing isolated nouns.

### Evaluation workspace

Six requirement rows with evidence drawers, confidence states, rationale, and open questions. Unknown and unsupported states must look deliberate, not broken.

### Decision room

ROI assumptions, CFO and CISO briefs, proposed decision, approval control, and activity ledger. The ledger shows the actual domain events created by UI and WebMCP actions.

## Demo fixtures

- `src/fixtures/vendor.ts`
- `src/fixtures/buyer.ts`
- `src/fixtures/evidence.ts`
- `src/fixtures/demoScenario.ts`

The fixture intentionally contains no evidence proving EU data residency. This creates the demo's critical gap and prevents a uniformly positive, untrustworthy result.

## Verification layers

### Domain tests

- Supported status cannot exist without eligible evidence.
- Contradictory evidence prevents supported status.
- ROI calculation is deterministic and rounded consistently.
- Approval fails when the proposal is stale.
- Reset reproduces the canonical fixture.

### Tool tests

- All nine tools register when WebMCP exists.
- The fallback renders when it does not.
- Zod rejects invalid inputs without mutation.
- Tool responses include IDs, revision, visible panel, and next action.

### End-to-end tests

- Complete the canonical evaluation through UI actions.
- Replay the expected tool sequence through a test shim.
- Change budget and re-evaluate the decision.
- Reload and restore persisted state.
- Reset and verify fixture parity.
- Verify desktop and mobile layouts.
- Run axe checks on all three surfaces.

### Live verification

- HTTPS returns 200.
- Origin isolation and Permissions Policy headers are present.
- Static assets return 200 without console errors.
- WebMCP tools are discoverable in ChatGPT's in-app browser.
- The same journey works through normal UI controls without WebMCP.

## Release sequence

1. Commit planning baseline.
2. Cursor builds the application skeleton and shared state.
3. Codex audits architecture and tests.
4. Cursor builds the three surfaces and tool adapter.
5. Codex performs visual and behavior QA.
6. Cursor fixes the defect ledger.
7. Codex deploys to Cloudflare and verifies public behavior.
8. Cursor or Codex applies only verified release fixes.
9. Freeze the release candidate, record hashes, and prepare submission materials.
