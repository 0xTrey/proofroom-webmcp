# Cursor Work Order 001: Foundation, Domain, State, and WebMCP

## Objective

Implement checklist items 1 through 4 from `docs/hackathon-build/checklist.md`: a working Cloudflare-ready React foundation, the canonical fixtures and domain model, the shared state/action layer, and all nine WebMCP tools with deterministic tests.

## Source of truth

Read these files completely before editing:

- `AGENTS.md` if present
- `docs/hackathon-build/scope.md`
- `docs/hackathon-build/prd.md`
- `docs/hackathon-build/spec.md`
- `docs/hackathon-build/checklist.md`
- `docs/hackathon-build/build-notes.md`
- `docs/research/source-notes.md`

The spec and PRD control product behavior. Do not broaden the product.

## Allowed boundary

You may create or edit application, configuration, test, fixture, and documentation files inside this repository. You may install npm dependencies and run local commands. Do not edit files outside the repository. Do not create cloud resources, deploy, commit, push, submit, or send external messages.

## Required implementation

### 1. Repository foundation

- Add MIT license.
- Add a repo-local `AGENTS.md` that preserves the agreed architecture, no-em-dash rule, no eyebrow-headline-dek rule, test commands, and Cursor reporting contract.
- Scaffold React, TypeScript, Vite, Cloudflare Workers static assets, linting, Vitest, React Testing Library, and Playwright configuration.
- Use package versions compatible with Node 22.22.3.
- Add all expected scripts from the spec, even if later suites begin as empty controlled runners.
- Add Fontsource dependencies and preliminary design tokens.
- Add an intentional application shell, not a default starter page.

### 2. Canonical fixtures and domain

- Implement the fictional Northstar vendor, Meridian Bank buyer, exactly six requirements, and exactly twelve evidence records.
- The evidence catalog must intentionally leave EU data residency unproven.
- Implement strict Zod schemas, types, typed errors, evidence eligibility, contradiction handling, proposal envelopes, input digests, decision blockers, ROI formula, receipts, and canonical reset.
- Test every invariant named in the spec.

### 3. Shared state and actions

- Implement the Zustand room store and `RoomActions` interface.
- UI and WebMCP must use the same action interface.
- Implement revisioning, immutable activity events, local persistence, in-memory test storage, migration/recovery, selectors, and atomic failure.
- Do not put product logic in React components or WebMCP callbacks.

### 4. WebMCP

- Implement all nine tool contracts from the spec.
- Use imperative `document.modelContext.registerTool` registration.
- Use an abort signal for cleanup.
- Validate strict inputs with Zod.
- Apply `readOnlyHint` and `untrustedContentHint` correctly.
- Implement a test shim that captures and executes the real tool definitions.
- Do not expose approval tools.
- Make supported, registered, unavailable, partial-failure, and error states available to the UI.

## Quality constraints

- No em dash characters in code comments, UI copy, docs, or fixtures.
- No unsupported claims about real companies or products.
- All demo entities and evidence must be clearly fictional.
- Do not use a generic purple-gradient SaaS design.
- Do not add Neon, authentication, an external model API, CRM, email, or analytics integrations.
- Do not weaken strict schemas to make tests pass.
- Do not fake tool calls or activity events.

## Acceptance commands

Run and report exact results for:

```text
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

If Playwright browser installation is required, configure tests but do not let downloading browsers become an unbounded blocker in this milestone.

## Expected final report

Return a concise structured report with:

1. Checklist items completed or partial
2. Files created and materially changed
3. Architecture decisions made within the spec
4. Exact commands run and pass/fail counts
5. Known defects or residual risks
6. Any blocker requiring Codex judgment
7. Recommended next bounded milestone

## Stopping condition

Stop when checklist items 1 through 4 meet their acceptance criteria and the acceptance commands pass, or when one named blocker remains after one focused repair attempt. Do not continue into visual product, context, evaluation, ROI, brief, decision, or deployment work.
