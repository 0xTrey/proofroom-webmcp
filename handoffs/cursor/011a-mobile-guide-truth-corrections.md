# Cursor correction order 011a: mobile entry and truthful guide state

## Objective

Keep the accepted landing page and Field Systems visual direction from work order 011. Correct the
specific usability and truthfulness issues found by independent Codex review.

The current mutation scores 90/100 and is retained. This pass should raise guided usability and
visual accessibility without broadening the product or redesigning the landing page.

Do not commit, push, deploy, publish, change external state, or touch the accepted domain, state,
fixtures, WebMCP, eval, deployment, release, submission, or brand-lab boundaries.

## Required reading

- `handoffs/cursor/011-landing-field-systems-app.md`
- `research/landing-app-autoresearch/autoresearch.md`
- current `src/app/RoomGuide.tsx`
- current `src/app/roomGuideState.ts`
- current `src/app/App.tsx`
- current `src/app/AppShell.tsx`
- current `src/design/room-guide.css`
- mobile rules in `src/design/global.css`
- current focused component, e2e, visual, and accessibility tests

Read the current files, not only the prior report. The current uncommitted work is the starting
point. Preserve it.

## Independent findings to correct

### P1: mobile entry hides the actual workspace

At 390 by 844 pixels, the app header, three-route navigation, tool-status band, and four stacked
guide rows consume the entire first viewport. The user enters the room but sees no active workspace
content until scrolling past roughly one full screen.

Temporary independent screenshot evidence:

- `/tmp/proofroom-audit-product-390.png`
- `/tmp/proofroom-product-below-guide-390.png`

The temporary paths may not exist in your process. The measurable behavior matters:

- on direct load of `/#product`, `/#evaluation`, or `/#decision` at 390 by 844, the active
  surface `h1` must be at least partially visible in the initial viewport
- the tool status and next recommended action must remain visible
- reset, route navigation, agent fallback, and the complete four-step guide must remain reachable
- the solution must not hide essential authority or status information from assistive technology

Preferred interaction:

- keep the guide summary, progress, and one recommended-next control visible on mobile
- place the full four-step list in a native, keyboard-operable disclosure that is collapsed by
  default below 680 pixels
- keep the full four-step grid visible on wider screens
- compress the mobile status band enough that it communicates state without reading like a second
  landing page

Do not solve this by shrinking body text below a readable size, removing the fallback explanation,
hiding the reset control, or making the app chrome horizontally scroll.

### P1: one guide completion state overclaims review

Current `deriveRoomGuideState` marks `Review what is still open` complete when either two
stakeholder briefs exist or any decision proposal exists. Those artifacts prove preparation, not
that a person reviewed open requirements.

Correct the state model so:

- `Done` is shown only when canonical state proves the step
- an agent-created proposal never proves human review
- both briefs never prove human review
- the guide can use a truthful intermediate word such as `Ready`, `Review`, or `Open`
- final approved decision may prove that the review and decision steps are complete
- the recommended next step should route to the decision view when a decision proposal is ready
  for human review, without falsely marking the review step done

Keep guide derivation presentation-only. Do not add guide state to `RoomState`, the persistence
payload, revision, ledger, receipts, or WebMCP tools.

### P1: the recommended next control does not reach the task

The visible step controls currently select only a top-level route. On the long Product surface,
`Tell it what matters` returns the user to the top of the vendor story while the buyer-context
task is much farther down.

Add one visible recommended-next action that:

- selects the correct existing route
- then scrolls and, where appropriate, moves focus to the existing task section
- uses stable semantic targets for buyer context, requirements and proof, and decision review
- does not use another route hash, because hashes are reserved for `home`, `product`,
  `evaluation`, and `decision`
- does not mutate room state or create a ledger event
- works with keyboard, pointer, reduced motion, direct route loads, and Back or Forward navigation

It is acceptable to add stable `id` values and `tabIndex={-1}` to the existing presentation
containers. Do not change their action wiring or domain behavior.

### P2: two labels remain unnecessarily technical

Use these clearer labels:

- landing explanation: `nine actions your browser agent can use` rather than
  `nine structured actions`
- room guide progress: `0 of 4 steps complete` rather than
  `0 / 4 proven complete`

Keep exact tool names and technical terms in the tool manifest, receipts, and developer-facing
metadata.

### P2: focused reset coverage is missing

Add a focused component or e2e assertion that:

- reset is intentionally absent from the public landing page
- reset is visible and enabled after entering any room route

Do not change reset behavior.

## Preserve these accepted outcomes

- Default `/` landing information architecture and copy.
- `Know what is proven before you buy.`
- `Open the demo room`.
- Four-step landing workflow.
- Agent and person authority map.
- Evidence-state explanation and EU-residency unknown example.
- Fictional and browser-local disclosures.
- Field Systems palette, Black Ops One display use, IBM Plex Mono UI, square rules, and no generic
  SaaS styling.
- `Understand`, `Check proof`, and `Decide` visible room navigation.
- Direct `#product`, `#evaluation`, and `#decision` links.
- Browser Back and Forward behavior.
- No-mutation landing-to-room transition.
- Exactly nine tools and two person-only approvals.
- Existing accessibility, persistence, recovery, reset, evaluation, and decision contracts.

## Required tests

Add or update focused tests that prove:

1. At 390 by 844, the active `h1` is in the initial viewport for Product, Evaluation, and
   Decision.
2. At 390 pixels, the recommended next action is visible and the full four-step list is reachable
   through a native disclosure.
3. Activating the recommended next action scrolls or focuses the correct task target and does not
   change room revision, ledger length, local persistence, evidence, proposals, or approvals.
4. A decision proposal can make the final review action ready without marking human review done.
5. Two briefs do not mark human review done.
6. Final approval can truthfully complete the review and decision steps.
7. Reset is absent on landing and present in the room.
8. The landing, room routes, direct hashes, one-`h1` rule, Back and Forward, and no-overflow
   assertions still pass.

Prefer behavior assertions over class-name snapshots. Do not weaken existing tests.

## Verification

Run targeted tests while repairing. Before reporting, run:

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

Also capture or inspect local-only screenshots at 390 by 844 for:

- `/`
- `/#product`
- `/#evaluation`
- `/#decision`

If your browser environment blocks manual capture, rely on the explicit Playwright viewport
assertions and report the blocker. Do not weaken the gate.

Prove no change occurred under:

- `artifacts/brand-lab/**`
- `src/domain/**`
- `src/state/**`
- `src/webmcp/**`
- `src/fixtures/**`
- `evals/**`
- `scripts/**`
- deployment, release, or submission files

## Allowed edit boundary

You may edit only:

- current work-order-011 presentation files under `src/app/**` and `src/design/**`
- presentation markup only in the three existing feature containers needed for stable task IDs
- focused tests under `tests/components/**`, `tests/e2e/**`, and `tests/accessibility/**`

Do not change dependencies in this correction pass.

## Required report

Return:

1. Exact defects corrected.
2. Exact files changed in this pass.
3. The new mobile app-shell and guide behavior.
4. The corrected guide-state truth table.
5. Stable next-task targets and focus or scroll behavior.
6. Exact tests added or strengthened.
7. Exact commands with pass and fail counts.
8. Screenshot status at 390 pixels.
9. Residual risks or one named blocker.
10. Confirmation that no commit, push, deployment, publication, or external mutation occurred.

## Stop condition

Stop when the four findings are corrected and every required local gate passes. If one blocker
remains after one focused repair attempt, preserve the diagnostics and return the report. Do not
broaden scope or modify external state.
