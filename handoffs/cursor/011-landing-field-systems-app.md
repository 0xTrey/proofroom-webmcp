# Cursor work order 011: landing page and Field Systems app

## Objective

Rebuild ProofRoom's entry experience so a first-time visitor understands the product in 15 seconds,
then can open a complete, easy-to-use buyer decision room. The landing page and the room must feel
like one intentional product built from the Mission Control concept and Trey's Field Systems design
language.

This is a presentation, navigation, content, and test milestone. Preserve every accepted domain,
state, evidence, WebMCP, and approval invariant. Do not deploy, commit, push, publish, or change any
external system.

The current baseline scores 73/100:

- first-glance comprehension: 16/25
- guided usability and time-to-first-value: 15/25
- trust boundary and evidence honesty: 22/25
- visual coherence and accessibility: 20/25

The target for this pass is at least 90/100, with no dimension below 21 and no regression in any
existing acceptance suite.

## Working directory and required reading

Repository:

`/Users/treyharnden/Projects/proofroom-webmcp`

Read these files before editing:

- `AGENTS.md`
- `docs/hackathon-build/scope.md`
- `docs/hackathon-build/prd.md`
- `docs/hackathon-build/spec.md`
- `docs/hackathon-build/checklist.md`
- `research/landing-app-autoresearch/autoresearch.md`
- `src/app/App.tsx`
- `src/app/AppShell.tsx`
- `src/app/navigation.ts`
- `src/app/routes.ts`
- `src/features/product/ProductSurface.tsx`
- `src/features/context/BuyerContextWorkspace.tsx`
- `src/features/evaluation/EvaluationSurface.tsx`
- `src/features/decision/DecisionSurface.tsx`
- `src/features/decision/ProposalDesk.tsx`
- every file under `src/design/`
- the component, end-to-end, accessibility, WebMCP, state, and QA tests that guard these areas
- `artifacts/brand-lab/index.html`, `artifacts/brand-lab/styles.css`, and
  `artifacts/brand-lab/app.js`, read-only, for the accepted Mission Control concept
- `/Users/treyharnden/Projects/TreyHarndencom-LinkTree/docs/house-of-growth-v2-design-system.md`,
  read-only, for the Field Systems design grammar
- `/Users/treyharnden/Projects/ElevationEngine/TREY_VOICE.md`, read-only, before writing copy

The untracked `artifacts/brand-lab/` directory is a Codex-owned visual reference. Do not edit,
delete, move, rename, format, or add files inside it.

## Product definition to make obvious

Use this as the plain-language source of truth:

> ProofRoom is a buyer-controlled workspace where a browser agent checks a product against the
> buyer's actual requirements, gathers eligible evidence, and prepares a recommendation. The
> person approves shared context and makes the final call.

The visitor must be able to answer these questions without understanding WebMCP:

1. What does ProofRoom do?
2. What work does the browser agent perform?
3. What can only the person approve?
4. What happens when the proof is missing?
5. What should I click first?

Do not describe ProofRoom as an autonomous buyer, a chatbot, a generic AI copilot, a legal
attestation system, or a live multi-user procurement platform.

## Fixed trust and architecture contract

These rules are more important than visual or copy changes:

- Keep exactly nine WebMCP tools.
- Keep buyer-context approval and final-decision approval person-only and UI-only.
- Do not add any WebMCP approval tool.
- Keep `RoomActions` as the only room mutation boundary.
- React presentation code must not write directly to Zustand.
- Landing-page navigation, room entry, room exit, and explanation controls must not change room
  revision, ledger length, proposal state, approvals, evidence attachments, or persistence payload.
- Keep six canonical requirements and twelve evidence records.
- Keep requirement status derived from eligible evidence.
- Keep EU data residency unknown in the canonical state until eligible evidence can prove it.
- Keep testimonial evidence unable to prove security or compliance.
- Keep browser-local persistence, deterministic reset, recovery behavior, and one-event-per-action
  invariants unchanged.
- Keep all named companies, products, evidence, and testimonials explicitly fictional.
- Keep the app completely usable when `document.modelContext` is unavailable.
- Do not add a database, authentication, analytics, remote fonts, a model API, chat, telemetry,
  vendor outreach, data ingestion, multi-user state, or new external requests.
- Do not modify domain behavior to make a presentation test pass.

## 1. Create a real landing page at the default URL

The empty hash at `/` must render a dedicated ProofRoom landing page, not the current Product
surface. Direct links to `/#product`, `/#evaluation`, and `/#decision` must keep opening the
corresponding room surface.

Use a presentation-only landing route such as `home`. Do not add it to the three room surfaces in
a way that weakens the existing three-step room model. Browser Back and Forward must work between
the landing page and room hashes.

The landing page must:

- start with exactly one primary `h1`
- use this primary headline unless a demonstrably clearer version is required:
  `Know what is proven before you buy.`
- place the product definition in a separate body region, not as an eyebrow-headline-dek stack
- provide one unmistakable primary action: `Open the demo room`
- provide a lower-priority in-page route to `See how it works`
- keep the first viewport focused on meaning, role clarity, and entry rather than technical detail
- show that every part still works through visible controls when agent tools are unavailable
- expose current agent-tool availability honestly without making WebMCP knowledge a prerequisite
- include the fictional-demo and browser-local-storage disclosures before the footer
- contain no form, fake chat box, fake prompt input, sign-up, login, pricing gate, or newsletter

The primary CTA must go to `#product` and must not mutate room state. A user should be able to
return to the explanation from the room through a clear ProofRoom or `How it works` control.

## 2. Explain the workflow in four plain-language moves

Create one compact, scannable workflow on the landing page:

1. `Tell it what matters`
   Add priorities, requirements, budget, and payback target.
2. `Agent checks the proof`
   Search records, attach eligible evidence, and calculate product fit.
3. `Review what is still open`
   See what is supported, what is blocked, and what still needs proof.
4. `You make the call`
   Approve buyer context and the final decision in the visible page.

Use one direct section headline. Do not add a small kicker above it and a subtitle directly below
it. Supporting text belongs inside the grid, body, caption, or adjacent data region.

## 3. Make the authority boundary visual

Add a clear agent-and-person authority section that communicates:

Agent can:

- read the room
- search structured evidence
- check requirements against evidence
- calculate ROI from visible assumptions
- prepare buyer context, briefs, and a decision proposal

Only the person can:

- approve what buyer context becomes authoritative
- change visible assumptions and hard requirements
- approve or reject the final decision

The design should make the review gate visible. Do not imply that the agent can complete an
approval, accept legal terms, send data, contact a vendor, or make a purchase.

## 4. Explain evidence states without jargon

Show a compact example that teaches all four requirement states:

- `Supported`: eligible evidence covers every hard condition
- `Partial`: evidence covers part of the requirement and names the gap
- `Unknown`: the room does not have enough evidence, so the question stays open
- `Unsupported`: eligible evidence contains a limitation or contradiction

Use the fictional EU data residency example to demonstrate honest `Unknown`, but do not imply a
real company or product claim. Color must never carry status meaning by itself.

Include one concise explanation of WebMCP near the workflow or footer:

> WebMCP lets a compatible browser agent use nine structured actions inside the page. If those
> actions are unavailable, the same room remains usable through visible controls.

If copy needs to change for accuracy or flow, keep the same meaning and plain-language standard.

## 5. Turn the existing room into an easy, guided app

The current feature set is already complete. Improve orientation and labels instead of inventing
features.

Required room changes:

- Change the visible room navigation labels:
  - `Product` to `Understand`
  - `Evaluation` to `Check proof`
  - `Decision` to `Decide`
- Preserve the underlying hashes `#product`, `#evaluation`, and `#decision`.
- Add a compact room guide or progress model that shows the four human-readable moves and the
  current recommended next step.
- Derive guide state from existing room data without adding presentation state to `RoomState`.
- The guide may display progress, but it must not claim a step is complete unless existing state
  proves it.
- Keep the guide secondary to the active workspace and make it usable at 390 pixels.
- Give users a clear path back to the landing-page explanation without resetting or losing work.
- Keep one `h1` on every route.
- Keep existing recovery, reset, persistence, tool status, context, evaluation, ROI, brief,
  decision, and activity controls fully usable.

Replace the highest-friction visible labels where they occur:

- `Stage fictional Meridian Bank draft` becomes `Show a proposed buyer profile`
- `Requirement dossier` becomes `Your checklist and proof`
- `Decision proposal and approval desk` becomes `Review the recommendation`

Audit nearby helper text for `stage`, `dossier`, `authoritative`, `surface`, `artifact`,
`payload`, and `WebMCP`. Keep technical terms where exactness matters, but explain them in human
language before using them. Do not rename tool names, schema fields, event actions, evidence IDs, or
receipt metadata.

## 6. Apply Mission Control through Trey's Field Systems language

This is one brand direction, not a theme selector and not a seven-brand comparison. Do not expose
`Mission Control` as a user-facing product mode. The product remains ProofRoom.

Use the design grammar from Trey's personal site:

- industrial editorial, direct, operational, and slightly retro
- more field manual than SaaS dashboard
- square corners throughout
- one-pixel rules for structure
- full-width bands inside a restrained content rail
- repeated records as rows, ledgers, or columns rather than floating cards
- short display headlines with deliberate line breaks
- dense evidence where needed, but never a conventional dashboard wall
- one coherent system across landing, app shell, product, context, evaluation, decision, recovery,
  dialogs, and footer

Core palette:

- primary ink: `#11110f`
- deep background: `#090a09`
- secondary dark: `#1b1c1a`
- light field: `#e3e3df`
- signal and progress: `#08dfad`
- action and emphasis: `#df4008`

Create contrast-safe variants when raw rust or mint cannot meet WCAG AA for small text. Use paper or
ink for body copy. Mint means live, ready, supported, or progress. Rust means action, active
navigation, gap, or emphasis. Never use either color as the only status signal.

Typography:

- Black Ops One for short display headlines and the compact PR mark
- IBM Plex Mono for body, navigation, controls, evidence metadata, and system labels
- self-host every font
- prefer adding the version-matched `@fontsource/black-ops-one` package over remote font calls
- keep body text at a readable size and line height
- do not use Black Ops One for paragraphs, tables, long labels, form fields, or dense records

Preserve a light band or workspace surface where it improves reading. Do not turn the entire
product into a black-and-green terminal. Do not use gradients as decoration, glass, soft floating
cards, rounded pills, generic icon sets, stock imagery, or a purple SaaS aesthetic. A restrained
scanline or field-paper texture is acceptable only when it does not reduce readability.

Motion:

- use one reveal or transition system
- keep route and state changes legible without motion
- remove nonessential transforms and transitions under `prefers-reduced-motion`
- do not animate evidence confidence, approval authority, or status in a way that implies a false
  change

## 7. Navigation and accessibility contract

Maintain or improve:

- semantic header, nav, main, section, aside, and footer landmarks
- one `h1` per view and a logical heading order
- skip links that target the correct landing or room main content
- visible focus for every link, button, input, dialog control, and disclosure
- keyboard operation for landing CTA, in-page link, room navigation, guide, context approvals,
  evidence controls, ROI inputs, decision approvals, reset, and dialogs
- focus trapping and Escape behavior in existing dialogs
- polite live regions for tool and action status
- text plus shape or icon for every status
- no content available only on hover
- no horizontal overflow at 390, 768, 1280, or 1600 pixels
- no text smaller than a practical readable minimum for interactive or explanatory content
- target WCAG AA contrast and serious axe rules

The mobile design may simplify the guide and system chrome, but it must remain fully navigable and
must not hide the person-only approval boundary.

## 8. Required tests

Update existing tests only where the intentional default route, labels, or design contract changes.
Do not weaken assertions that protect domain behavior.

Add focused component or navigation tests that prove:

1. The empty hash renders the landing page with one `h1`, the definition, the four-step workflow,
   the agent/person authority boundary, evidence-state explanation, and fictional/local disclosure.
2. `Open the demo room` enters `#product`.
3. Entering the room and returning home leave room revision, activity-ledger length, evidence,
   proposals, and approvals unchanged.
4. Direct `#product`, `#evaluation`, and `#decision` hashes still resolve.
5. The room navigation uses `Understand`, `Check proof`, and `Decide`.
6. Unsupported WebMCP state explains that visible controls still work.
7. The room guide derives its state without a direct store write.
8. The app still renders exactly one `h1` on landing and each room surface.

Add or update Playwright coverage that proves:

- a first-time keyboard user can open `/`, understand the role split, enter the room, navigate all
  three app surfaces, return to the explanation, and re-enter without losing room state
- direct surface hashes remain stable across reload
- landing-to-room navigation creates no ledger event and no revision change
- landing and every room surface have no uncaught console, page, request, or response errors
- the landing page and app do not overflow at 390, 768, 1280, or 1600 pixels
- reduced-motion mode removes nonessential landing and guide motion

Extend the accessibility suite to include the landing view at all four target widths. Keep
serious-or-worse axe checks on every room surface.

Keep these contracts explicitly tested:

- exactly nine unique WebMCP tools
- no approval tool
- EU residency remains unknown
- testimonial evidence cannot prove security or compliance
- room persistence survives reload
- reset restores canonical state

If a deterministic visual evidence spec is needed, create one for the landing page and app entry at
390 and 1600 pixels. Follow the repository's existing update-only artifact pattern. Do not overwrite
accepted release images during ordinary test runs.

## 9. Verification sequence

Start with targeted tests while editing. Before reporting completion, run:

```text
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run test:a11y
npm run evals
npm run build
npm run check:bundle
git diff --check
git status --short
```

Also run exact source checks that prove:

- the registry still has exactly nine tools
- approval methods are still absent from agent actions and tool definitions
- no em dash character exists in changed files
- no remote font, analytics, model, database, or authentication dependency was added
- no file under `artifacts/brand-lab/`, `src/domain/`, `src/state/`, `src/webmcp/`,
  `src/fixtures/`, `evals/`, `artifacts/release/`, or deployment configuration changed
- every changed file is inside the allowed boundary below

Do not run deploy, public verification, release-receipt mutation, Git commit, or Git push.

## Allowed edit boundary

You may edit:

- `package.json` and `package-lock.json`, only for a self-hosted Black Ops One package
- `index.html`, only for accurate product metadata
- `public/favicon.svg` or `public/og-image.svg`, only if the current assets visibly conflict with
  the accepted PR Field Systems identity
- `src/app/**`
- `src/design/**`
- presentation copy in `src/features/**`, without changing action wiring or domain behavior
- `src/main.tsx`, only for local font imports and design-style imports
- `tests/components/**`
- `tests/e2e/**`
- `tests/accessibility/**`
- focused navigation tests under `tests/**`
- this work order only if you need to append a short progress note

Do not edit:

- `artifacts/brand-lab/**`
- `src/domain/**`
- `src/state/**`
- `src/webmcp/**`
- `src/fixtures/**`
- `evals/**`
- `scripts/**`
- `wrangler.jsonc`
- `worker/**`
- `public/_headers`
- `artifacts/release/**`
- existing visual-audit evidence
- release or submission documentation
- Git configuration or remotes

If the requested experience appears to require a forbidden edit, stop and report the exact blocker.
Do not broaden the boundary.

## Required Cursor report

Return one structured report to Codex with:

1. Checklist items completed, partial, or blocked.
2. Every file created or materially changed, including untracked files.
3. The landing-page information architecture and exact primary copy.
4. The navigation model, direct-link behavior, browser Back and Forward behavior, and proof that
   entry or exit does not mutate room state.
5. How the room guide derives current and next steps from existing state.
6. Every user-facing label changed and why.
7. The Field Systems token, typography, geometry, and motion decisions.
8. Accessibility and responsive decisions at 390, 768, 1280, and 1600 pixels.
9. Exact commands run with pass and fail counts.
10. Any test not run, with the precise reason.
11. Known defects, residual risks, and one recommended bounded correction pass.
12. Confirmation that no commit, push, deployment, publication, or external mutation occurred.

## Stop condition

Stop when the landing page, room entry, action-led room navigation, first-run guide, Field Systems
visual system, focused tests, and full local verification are complete. If one named blocker remains
after one focused repair attempt, preserve diagnostics and return the structured report. Do not
commit, push, deploy, publish, or modify external state.
