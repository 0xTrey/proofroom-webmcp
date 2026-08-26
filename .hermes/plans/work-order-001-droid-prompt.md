# Droid implementation prompt: ProofRoom work order 001

You are the bounded first-pass build engine. Cursor is the architecture, integration, and final review owner.

## Objective

Implement checklist items 1 through 4 exactly as defined in `handoffs/cursor/001-foundation-domain-webmcp.md`. Read that work order and every source-of-truth document it names before editing.

## Active authorization

Implementation is authorized inside `/Users/treyharnden/Projects/proofroom-webmcp`. You may create and edit repository-local application, configuration, test, fixture, and documentation files; install npm packages; and run local commands. Keep all changes uncommitted.

## Scope

- React 19, strict TypeScript, Vite, Cloudflare Workers static assets, ESLint, Vitest, React Testing Library, Playwright, Fontsource, preliminary tokens, and an intentional shell.
- MIT license, README, and repo-local `AGENTS.md` with the requested architecture, writing constraints, commands, and reporting contract.
- Canonical fictional Northstar and Meridian fixtures with exactly six requirements and twelve evidence records; EU data residency remains unproven.
- Strict Zod schemas, typed errors, evidence eligibility and contradictions, proposals and digests, decision blockers, ROI, receipts, and canonical reset.
- Zustand room store, stable `RoomActions`, revisioning, immutable events, persistence adapters, migration and recovery, selectors, atomic failure.
- All nine WebMCP tool contracts, imperative registration with abort cleanup, strict inputs, annotations, executable test shim, and visible registration states.
- Deterministic domain, state, and WebMCP tests.

## Out of scope

- Checklist items 5 through 12 beyond the minimal shell and status surface required here.
- Feature-complete product, context, evaluation, ROI, brief, decision, or ledger UI.
- Deployment, cloud resources, commits, pushes, external messages, authentication, databases, external model APIs, CRM, email, or analytics.
- Changes outside the repository or destructive changes to existing handoff and research files.

## Constraints

- Compatible with Node 22.22.3.
- No em dash character anywhere in authored code, comments, UI copy, docs, or fixtures.
- No eyebrow-headline-dek composition and no generic purple-gradient SaaS screen.
- No real-company or unsupported claims. All demo data must be clearly fictional.
- Do not weaken strict schemas, fake tool calls, or fake events.
- React and WebMCP must call the same action interface and never own product logic.
- Preserve user-owned untracked files.

## Acceptance

Run and report:

1. `npm install`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test`
5. `npm run build`

Return summary, complete changed-path inventory including untracked files, decisions, assumptions, risks, and exact command results. If one blocker remains after one focused repair attempt, stop and name it.
