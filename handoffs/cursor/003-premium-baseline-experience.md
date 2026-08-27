# Cursor work order 003: premium baseline experience

## Objective

Complete checklist item 5. Turn the verified foundation into a distinctive, production-quality Northstar product experience and ProofRoom shell that a challenge judge understands within ten seconds, before any agent interaction occurs.

This milestone is visual composition, responsive behavior, navigation, and baseline information architecture. Do not build context approval, requirement editing, evidence attachment UI, ROI editing, stakeholder brief forms, decision approval, ledger controls, or reset controls yet.

## Source boundary

- Repository: `/Users/treyharnden/Projects/proofroom-webmcp`
- Read `AGENTS.md`, `docs/hackathon-build/{prd,spec,checklist}.md`, `docs/research/proofroom-plan-v4-trust-contract.md`, and the accepted build notes before editing.
- Work only in this repository.
- You may add and refactor baseline React components, styles, icons made from CSS or inline SVG, tests, and visual-audit scripts.
- Do not deploy, commit, push, add a backend, add Neon, add a model call, or begin checklist items 6 through 9.

## Product comprehension target

Within ten seconds, a first-time judge should understand:

1. Northstar is a fictional campaign operations platform.
2. ProofRoom is a buyer-controlled evaluation layer on the same page.
3. The page exposes nine WebMCP tools when the browser supports them.
4. The agent may research, calculate, and stage work, but the person approves context and the final decision.
5. Evidence gaps are visible and intentional, not errors.

## Visual direction

Build an editorial due-diligence desk, not a SaaS dashboard.

- Warm paper background, deep ink typography, acid green for verified proof, cobalt for agent activity, rust for gaps and risk.
- Use the installed Newsreader, Manrope, and IBM Plex Mono families with a disciplined type scale.
- Start with one primary headline. Never use an eyebrow, headline, and explanatory dek stack.
- Use asymmetric editorial composition, rules, marginal notes, numbered records, and data tables where appropriate.
- Let the product surface feel like a credible vendor page. Let evaluation and decision feel like the buyer has opened the diligence file on that product.
- Use one memorable visual device that can carry through the experience, such as a proof rail, evidence spine, or indexed dossier. Keep it functional and legible.
- Motion should explain navigation or state, remain restrained, and honor `prefers-reduced-motion`.

Do not use:

- Purple gradients
- Glassmorphism
- A generic hero with floating cards
- A grid of interchangeable rounded cards
- Decorative dashboard charts
- An eyebrow-headline-dek composition
- Giant title text that pushes all useful information below the fold
- Stock photography or external image dependencies

## Required baseline surfaces

### Shared shell

- Strong ProofRoom identity and fictional disclosure without wasting the first screen.
- Three clearly differentiated surfaces: Product, Evaluation, Decision.
- Visible room revision and browser persistence state.
- Honest WebMCP status for registered, partial, unavailable, and error states.
- Plain-language fallback that says the whole evaluation works through page controls without agent tools.
- Keyboard-operable navigation with clear focus states and correct current-state semantics.

### Product

- One primary headline and an immediate explanation of Northstar’s value.
- Vendor identity, category, buyer-demo context, and implementation timing.
- Capabilities, packaging, and implementation presented as a persuasive but fictional product narrative, not a list of cards.
- An early bridge into ProofRoom that explains why a buyer would open the evaluation.
- Source-aware language. Do not turn fictional fixtures into customer proof.

### Evaluation

- A baseline read-only view of the six requirements and twelve evidence records.
- Status, priority, attached-evidence count, limitations, and open conditions are scannable.
- Unknown and partial states must look intentional and readable.
- The page should hint at evidence provenance and the future interactive workspace without adding item 7 controls.

### Decision

- A baseline read-only view of the commercial model, current blockers, agent/person/system activity totals, and the nine tool names.
- The human-only approval boundary must be visually obvious.
- Avoid pretending a decision has been made in the reset state.

## Responsive and accessibility requirements

- Target widths: 390, 768, 1280, and 1600 pixels.
- No horizontal page overflow at any target width.
- No clipped focus ring, truncated critical label, or overlapping fixed UI.
- Maintain readable line lengths and tap targets.
- One `h1` on each rendered route, with a logical heading outline.
- Use semantic lists, tables, definitions, and landmarks.
- All status differences require text or shape, not color alone.
- Serious and critical axe violations remain zero.
- Reduced-motion mode removes nonessential transitions and transforms.

## Verification and visual evidence

Add or update automated coverage for the baseline shell and surfaces. Run:

```text
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:a11y
```

Capture screenshots of all three surfaces at 390, 768, 1280, and 1600 pixels. Store them under:

`artifacts/visual-audit/003-baseline/`

Use deterministic filenames. Add a short `README.md` in that folder mapping screenshots to viewport and route. Include a Playwright overflow check at all target widths and a reduced-motion smoke check.

## Required report

Return:

1. What changed and why the composition is distinctive.
2. Exact files changed.
3. Every verification command with pass/fail and counts.
4. Screenshot paths for all twelve captures.
5. Any visual, accessibility, responsive, or WebMCP status risk that remains.
6. Recommended next work order, without beginning it.

## Stop condition

Stop when checklist item 5 is complete and the full verification plus screenshot matrix passes, or after reporting one concrete blocker with attempted fixes and exact output.
