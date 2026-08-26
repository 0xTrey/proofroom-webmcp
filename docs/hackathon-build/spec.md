# Technical Spec

## Overview

ProofRoom is a client-first React application deployed to Cloudflare Workers static assets. All product data and challenge fixtures live in the repository. The browser agent provides intelligence through WebMCP. The application provides deterministic state, evidence rules, tools, UI, persistence, and receipts.

This architecture intentionally excludes Neon, authentication, and external model calls. The design keeps storage behind a small adapter so server-backed rooms can be added later without changing domain behavior.

## Stack

- React 19
- TypeScript with strict mode
- Vite, using package versions compatible with Node 22
- Cloudflare Vite plugin and Wrangler
- Zustand with persist middleware
- Zod
- Vitest
- React Testing Library
- Playwright
- axe-core or `@axe-core/playwright`
- ESLint
- Fontsource packages for Newsreader, Manrope, and IBM Plex Mono
- CSS modules or a single structured CSS layer with design tokens; do not use a generic component kit

## Architecture

### Layers

1. `fixtures`: canonical vendor, buyer, evidence, requirements, and demo state
2. `domain`: types, schemas, invariants, calculations, errors, receipts, and actions
3. `state`: Zustand store, persistence adapter, schema migration, and selectors
4. `webmcp`: experimental DOM declarations, tool definitions, registration lifecycle, and test shim
5. `features`: product, evaluation, ROI, briefs, decision, context approval, and ledger
6. `app`: navigation, global status, error boundaries, reset, and layout

UI components never write to the store directly. They call domain actions exposed through a stable `RoomActions` interface. WebMCP tools call the same interface.

## File Structure

```text
.
├── AGENTS.md
├── LICENSE
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── wrangler.jsonc
├── public/
│   ├── favicon.svg
│   ├── og-image.svg
│   └── _headers
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── App.tsx
│   │   ├── AppShell.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── navigation.ts
│   │   └── routes.ts
│   ├── design/
│   │   ├── tokens.css
│   │   ├── global.css
│   │   └── motion.css
│   ├── fixtures/
│   │   ├── buyer.ts
│   │   ├── demoScenario.ts
│   │   ├── evidence.ts
│   │   ├── requirements.ts
│   │   └── vendor.ts
│   ├── domain/
│   │   ├── types.ts
│   │   ├── schemas.ts
│   │   ├── errors.ts
│   │   ├── invariants.ts
│   │   ├── evidence.ts
│   │   ├── roi.ts
│   │   ├── receipts.ts
│   │   ├── hash.ts
│   │   └── actions/
│   │       ├── context.ts
│   │       ├── requirements.ts
│   │       ├── briefs.ts
│   │       ├── decision.ts
│   │       ├── ledger.ts
│   │       └── reset.ts
│   ├── state/
│   │   ├── createRoomStore.ts
│   │   ├── roomStore.ts
│   │   ├── persistence.ts
│   │   ├── migrations.ts
│   │   └── selectors.ts
│   ├── webmcp/
│   │   ├── types.d.ts
│   │   ├── toolSchemas.ts
│   │   ├── toolDefinitions.ts
│   │   ├── registerTools.ts
│   │   ├── useWebMCPTools.ts
│   │   └── testShim.ts
│   ├── features/
│   │   ├── product/
│   │   ├── context/
│   │   ├── evaluation/
│   │   ├── roi/
│   │   ├── briefs/
│   │   ├── decision/
│   │   └── ledger/
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── Dialog.tsx
│   │   ├── StatusMark.tsx
│   │   ├── EvidenceStamp.tsx
│   │   └── RevisionTag.tsx
│   └── test/
│       └── setup.ts
├── tests/
│   ├── domain/
│   ├── components/
│   ├── webmcp/
│   ├── e2e/
│   ├── accessibility/
│   └── evals/
├── evals/
│   ├── manifest.json
│   ├── expected-sequences.json
│   └── README.md
├── docs/
│   ├── hackathon-build/
│   ├── research/
│   ├── release/
│   └── submission/
└── handoffs/
    └── cursor/
```

## Domain Model

### RoomState

```ts
type RoomState = {
  schemaVersion: 1;
  roomId: string;
  revision: number;
  vendor: VendorProfile;
  canonicalBuyer: BuyerProfile;
  buyerContextProposal: Proposal<BuyerContext> | null;
  approvedBuyerContext: BuyerContext | null;
  requirements: Requirement[];
  evidenceCatalog: EvidenceRecord[];
  roiAssumptions: RoiAssumptions;
  roiResult: RoiResult;
  stakeholderBriefs: Partial<Record<"cfo" | "ciso", StakeholderBrief>>;
  decisionProposal: Proposal<DecisionPayload> | null;
  approvedDecision: ApprovedDecision | null;
  activityLedger: ActivityEvent[];
  recoveryNotice: RecoveryNotice | null;
};
```

### Proposal

```ts
type Proposal<T> = {
  id: string;
  type: "buyer_context" | "decision";
  baseRevision: number;
  inputDigest: string;
  createdBy: "webmcp" | "ui";
  createdAt: string;
  expiresAt: string;
  status: "pending" | "approved" | "rejected" | "expired";
  payload: T;
};
```

Do not use cryptographic language for a browser-local digest. The digest protects demo-state integrity and stale approvals, not identity or legal non-repudiation.

### EvidenceRecord

```ts
type EvidenceRecord = {
  id: string;
  title: string;
  type: "product_doc" | "security_doc" | "integration_doc" | "implementation_doc" | "testimonial";
  sourceLabel: string;
  sourceUrl?: string;
  effectiveAt: string;
  expiresAt?: string;
  trustClass: "canonical" | "external" | "testimonial";
  untrustedContent: boolean;
  coverage: string[];
  supportedClaims: string[];
  limitations: string[];
  contradicts: string[];
  summary: string;
};
```

### Requirement

```ts
type Requirement = {
  id: string;
  label: string;
  description: string;
  priority: "must" | "should";
  hardConditions: string[];
  status: "supported" | "partially_supported" | "unsupported" | "unknown";
  attachedEvidenceIds: string[];
  coveredConditions: string[];
  gaps: string[];
  rationale: string;
  buyerNotes: string;
  openQuestions: string[];
};
```

## Invariants

- A failed action returns a typed `DomainError` and does not mutate state.
- Every successful mutation increments revision exactly once.
- Every action appends exactly one ledger event, including read-only WebMCP actions.
- `supported` requires active eligible evidence for every hard condition.
- Testimonial evidence alone cannot satisfy security or compliance requirements.
- A hard unknown or unsupported requirement prevents a `ready` decision.
- Approval requires a pending, unexpired proposal with a valid base revision and digest.
- Agent tools cannot approve buyer context or decision state.
- Reset reproduces the canonical fixture except for a new reset event timestamp.

## Domain Error Contract

```ts
type DomainErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "EVIDENCE_INELIGIBLE"
  | "EVIDENCE_INSUFFICIENT"
  | "PROPOSAL_STALE"
  | "PROPOSAL_EXPIRED"
  | "PROPOSAL_RESOLVED"
  | "DECISION_BLOCKED"
  | "PERSISTENCE_UNAVAILABLE";
```

Tool responses return safe structured errors. The UI converts the same errors into accessible notices.

## WebMCP Tool Contracts

Tool names use snake case. Descriptions state exactly what the tool reads or stages and what it cannot approve.

### `get_room_state`

- Type: read-only
- Input: optional `detail` enum `summary | requirements | decision`
- Output: current revision, approved-context summary, requirement summary, ROI summary, brief presence, proposal states, and recommended next actions
- Never return the full activity ledger by default

### `search_product_evidence`

- Type: read-only, untrusted content possible
- Input: `query`, optional `types`, optional `requirementIds`, optional `trustClasses`, `limit` 1 to 12
- Output: candidate evidence records with limitations and annotations
- Must cap query length and reject unknown keys

### `evaluate_requirement`

- Type: read-only calculation
- Input: `requirementId`, optional candidate evidence IDs
- Output: deterministic proposed status, covered conditions, gaps, contradictions, eligible evidence IDs
- Does not mutate the requirement

### `calculate_roi`

- Type: read-only calculation
- Input: complete bounded assumption set
- Output: normalized assumptions, annual hours saved, annual labor value, first-year net value, payback months, budget comparison, formula explanation
- Does not apply assumptions to room state

### `propose_buyer_context`

- Type: staged mutation
- Input: bounded buyer context
- Output: proposal ID, base revision, digest, expiry, visible panel, approval instruction
- Cannot approve or personalize authoritative state

### `stage_requirement`

- Type: mutation
- Input: requirement ID plus buyer notes, priority, hard-condition flag, or open questions
- Output: requirement ID, new revision, safe state summary
- Cannot set status directly

### `attach_evidence`

- Type: mutation
- Input: requirement ID and one to six evidence IDs
- Output: accepted and rejected evidence IDs, new revision, next recommended evaluation action
- Cannot set status directly

### `save_stakeholder_brief`

- Type: mutation
- Input: role, bounded summary, evidence IDs, risks, open questions, next step
- Output: role, saved revision, validation warnings
- Must reject claims that contradict requirement state

### `propose_decision_status`

- Type: staged mutation
- Input: status, rationale, supporting requirement IDs, blocking requirement IDs, risks, next step
- Output: proposal ID, base revision, digest, expiry, blockers, approval instruction
- Cannot approve the decision

## Tool Registration Lifecycle

- Implement `Document.modelContext` declarations locally until TypeScript DOM types include them.
- Register tools in a React effect after the store action interface is stable.
- Pass one `AbortSignal` to all registrations and abort on cleanup.
- Register tools through `Promise.allSettled` so the UI can expose partial failure details without crashing.
- Never register duplicate names.
- Provide a test shim that captures definitions and executes tools against the real action interface.

## Data Flow

### Agent mutation

```text
browser agent
  -> WebMCP input schema
  -> Zod parse with strict object handling
  -> tool definition
  -> shared RoomActions method
  -> invariant validation
  -> atomic Zustand state update
  -> revision and activity event
  -> structured tool result
  -> visible React update
```

### Human approval

```text
proposal panel
  -> visible approval click
  -> shared RoomActions approval method
  -> proposal revision, expiry, digest, and domain validation
  -> atomic authoritative state update
  -> activity event and receipt
  -> visible page transformation
```

## Persistence

- Use a `RoomStorage` interface with `load`, `save`, and `clear`.
- Default adapter uses local storage under a versioned key.
- Parse persisted data through a Zod schema before hydration.
- Unknown schema versions fall back to fixture and show a recovery notice.
- Tests use an in-memory adapter.
- Do not add Neon in this release.

## ROI Formula

Inputs:

- campaigns per month
- hours saved per campaign
- loaded hourly cost
- annual subscription cost
- one-time implementation cost
- budget ceiling

Calculations:

```text
annual_hours_saved = campaigns_per_month * 12 * hours_saved_per_campaign
annual_labor_value = annual_hours_saved * loaded_hourly_cost
first_year_cost = annual_subscription_cost + implementation_cost
first_year_net_value = annual_labor_value - first_year_cost
monthly_labor_value = annual_labor_value / 12
payback_months = first_year_cost / monthly_labor_value
within_budget = annual_subscription_cost <= budget_ceiling
```

Return `null` payback when monthly labor value is zero. Do not claim revenue or conversion improvement.

## Visual System

### Typography

- Newsreader for the main product headline and major editorial moments
- Manrope for navigation, controls, and body UI
- IBM Plex Mono for evidence IDs, revisions, timestamps, and activity metadata
- Self-host through Fontsource packages

### Tokens

- `--paper: #f1ecdf`
- `--paper-light: #faf7ef`
- `--ink: #111820`
- `--ink-soft: #29333c`
- `--verified: #b8f229`
- `--agent: #2667ff`
- `--gap: #c7532f`
- `--line: rgba(17, 24, 32, 0.16)`

Verify exact contrast and adjust tokens as needed. Do not treat these preliminary values as immutable.

### Composition

- Desktop product view uses asymmetric editorial sections and one sticky context rail.
- Evaluation uses a dense but readable ledger table that becomes stacked records below 768 pixels.
- Decision view pairs the ROI model with evidence-backed briefs and activity.
- Context approval triggers one controlled fold or reveal animation.
- Respect `prefers-reduced-motion`.

## Accessibility

- WCAG AA contrast target
- Semantic landmarks and heading order
- Visible focus on every control
- Dialog focus trap and Escape close
- Status text plus shape or icon, never color alone
- `aria-live` for tool registration and action results
- Keyboard operation for navigation, evidence drawers, proposal dialogs, ROI inputs, and reset
- No content hidden exclusively behind hover

## Cloudflare Deployment

- Use the official Cloudflare Vite plugin pattern with a minimal Worker entry and static assets.
- Set a current compatibility date during implementation.
- Configure SPA fallback.
- Add `Origin-Agent-Cluster: ?1`.
- Do not set `Permissions-Policy: tools=()` because that disables WebMCP.
- If an explicit policy header is added, verify it permits same-origin tools in the supported browsers.
- Deploy with Wrangler to the authenticated `0xTrey` account.
- Project name: `proofroom-webmcp` if available.

## Testing

### Unit tests

- Evidence eligibility and contradictions
- Requirement status transitions
- Proposal staleness, expiry, and resolution
- Decision blocking rules
- ROI boundaries and rounding
- Input digest stability
- Recovery from invalid persisted state

### Component tests

- Context proposal and approval
- Requirement row states and evidence drawer
- ROI editing and calculation review
- Brief validation
- Decision proposal and approval
- Activity filters
- WebMCP status states
- Reset confirmation

### WebMCP tests

- Nine unique names register
- An abort signal unregisters on cleanup
- Read-only and untrusted annotations are correct
- Strict schemas reject unknown keys and oversized values
- Tool calls use real actions and update visible state
- Human-only approvals are absent from the registry
- Partial registration failure is visible and recoverable

### End-to-end tests

- UI-only canonical journey
- Test-shim tool journey
- Budget revision and decision re-evaluation
- Reload persistence
- Reset parity
- Unsupported browser fallback
- Desktop and mobile navigation
- No uncaught console errors

### Evals

`evals/manifest.json` stores twelve cases with:

- ID and prompt
- setup fixture
- expected tool names or families
- required invariants
- forbidden outcomes
- terminal state assertion

The local runner validates deterministic tool outputs and state invariants. Agent-selection results can be recorded separately when tested in a real supported browser.

## Verification Commands

Expected scripts:

```text
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run test:a11y
npm run evals
npm run build
npm run deploy
```

Cursor must not mark a milestone complete without running the commands available at that milestone and reporting exact results.

## Risks And Mitigations

### Experimental API drift

Keep the WebMCP adapter isolated, type declarations local, and tool behavior testable through a shim.

### Demo state drift

Use a canonical fixture, schema version, deterministic reset, and fixture-parity test.

### Superficial personalization

Test content order, selected evidence, navigation state, and context rail, not only string replacement.

### Unsupported AI claims

Enforce status invariants in the domain layer. Rationale cannot write status.

### Visual density

Prioritize one transformation and three surfaces. Test 390, 768, 1280, and 1600 pixel widths.

### Cloudflare or browser failure

Keep local build and UI-only journey complete. Record deployment and supported-browser verification separately.

## Demo And Submission Flow

- Landing view communicates the product in 15 seconds.
- Agent prompt runs the evaluation.
- Context proposal and approval demonstrate human authority.
- Evidence matrix demonstrates non-trivial WebMCP use.
- Unknown EU residency demonstrates honesty.
- ROI edit demonstrates shared state.
- CFO and CISO briefs demonstrate audience-specific synthesis.
- Decision proposal and activity ledger close the trust story.
- README provides a 60-second judge path, exact tool list, architecture, tests, and limitations.
