# Cursor correction order 012a: finish the plain-language path

## Objective

Keep the accepted work-order-012 landing page, EU example, route names, and Field Systems visual
direction. Correct the remaining visible technical language and reduce mobile app chrome so the
active task begins sooner.

Independent copy audit: 94/100. Independent visual audit: no P0 defects, with two P1 usability
findings. This is a bounded correction pass, not a redesign.

Do not commit, push, deploy, publish, change external state, add dependencies, or modify domain,
state, fixtures, WebMCP, evals, scripts, release, deployment, submission, or brand-lab files.

## Required reading

- `handoffs/cursor/012-plain-language-eu-example.md`
- current work-order-012 diff
- current screenshots under `artifacts/visual-audit/012-plain-language/`
- current `src/app/AppShell.tsx`, `RoomGuide.tsx`, and relevant mobile CSS
- current visible copy in the files named below
- current component, e2e, accessibility, and public tests

Preserve the uncommitted working tree. Do not reset or clean it.

## P1: remove avoidable technical language from visible instructions

The plain-language rewrite is strong, but the following terms still appear in instructional copy:

- stage or staged
- canonical
- deterministic
- authoritative
- buyer context
- proposal envelope
- diligence file

Keep internal identifiers, function names, domain values, schemas, tool names, error codes, receipt
metadata, and stored events unchanged. Change only what the person reads.

### Product

In `src/features/product/ProductSurface.tsx`:

- replace the remaining `diligence file` reference with `proof check` or equally clear buyer language
- keep the distinction between a vendor claim and a source record

### Buyer profile

In `src/features/context/BuyerContextWorkspace.tsx`:

- use `buyer profile` or `buying priorities`, not `buyer context`, in all normal instructions,
  success messages, rejection explanations, headings, buttons, and helper copy
- replace `stage details` with `prepare details for review`
- replace `authoritative` with `approved` or `currently in use`
- keep exact proposal and receipt metadata available as technical details
- do not rename the underlying BuyerContext types, action, schema, proposal status, IDs, or receipt
  fields

### Evidence review

In `src/features/evaluation/EvaluationSurface.tsx`:

- replace `deterministic evaluation rules` with `the same evidence rules every time`
- replace any visible `fictional review set` instruction with `sample evidence check`

In `src/features/evaluation/RequirementDetail.tsx`:

- do not expose `stage_requirement` in ordinary helper copy
- use: `Saving these notes can recalculate the answer, but only eligible source records can change what is proven.`
- keep the exact tool name in developer-facing tool lists and technical audit records

In `src/features/evaluation/EvidenceInspector.tsx`:

- use `demo source record` rather than `canonical demo document` in the visible trust label

### Business case and summaries

In `src/features/decision/RoiWorkspace.tsx`:

- replace visible `authoritative` with `currently approved` or `currently used in this review`
- replace visible `canonical values` with `sample values`
- keep internal variable names and validation logic unchanged

In `src/features/decision/BriefWorkspace.tsx`:

- replace visible `canonical` and `fictional review set` with `honest sample` and `sample evidence check`
- keep the rule that summaries cannot overstate evidence

### Recommendation review

In `src/features/decision/ProposalDesk.tsx`:

- replace every normal instruction, heading, status message, and action label that says `stage` or
  `staged` with `prepare`, `prepared`, or `ready for review`
- `Stage a proposal` becomes `Edit a recommendation`
- `Stage proposal` becomes `Prepare recommendation`
- `staged at revision` becomes `prepared at revision`
- `previously approved decision remains authoritative` becomes `previously approved decision remains in place`
- the main explanation should say that the agent can prepare a recommendation and only a person
  can approve or reject it
- keep underlying proposal status, action names, IDs, digest, revision, and expiry behavior unchanged

If the proposal ID, digest, base revision, current revision, timestamps, or creator origin remain
always visible, place them inside a native collapsed `details` region labeled
`Technical recommendation details`. The recommendation, reasons, blockers, risks, next step, and
human controls must remain visible. Do not hide information required to make the decision.

### Decision and activity history

In `src/features/decision/DecisionSurface.tsx`:

- change the lower technical heading to `How the browser agent connects`
- explain that nine built-in actions let the agent read, calculate, and prepare work
- name WebMCP only in a secondary sentence or the technical list
- replace visible `stage work` with `prepare work`

In `src/features/ledger/ActivityLedger.tsx`:

- use `official activity history` rather than `authoritative activity register`
- explain that it shows who changed what, when it changed, and whether the action came from a
  person, agent, or system
- keep exact event values and audit data unchanged

### Reset and recovery

In `src/app/ResetDialog.tsx`, `ResetResultPanel.tsx`, `RecoveryPanel.tsx`, and `ErrorBoundary.tsx`:

- use `demo starting point` instead of `canonical fixture` in visible headings, instructions, and buttons
- use `approved` or `official room state` instead of `authoritative`
- keep the exact deterministic reset behavior, one new System event, receipts, recovery codes, and
  state schema unchanged
- `Reset to canonical fixture` becomes `Reset to the demo starting point`
- `The canonical fixture is active.` becomes `The demo starting point is active.`

Update focused tests for intentional label changes. Do not weaken reset or recovery assertions.

## P1: bring the active mobile task higher in the first viewport

Independent screenshots at 390 by 844 show the masthead, route navigation, agent status, reset,
room guide, and guide disclosure consuming roughly 420 to 470 pixels before the active surface.
The active `h1` is visible, but the user reaches the task too late.

At widths below 680 pixels:

1. Keep the ProofRoom identity and all three route controls visible.
2. Keep current agent availability visible in one short line.
3. Use a short mobile status message:
   - unavailable: `No agent connection. Page buttons still work.`
   - registered: `Browser agent connected.`
   - partial/error: a short honest status plus the retry control
4. Keep `Reset demo` reachable. It may share the compact status row.
5. Move action count, revision, and saved state into a native collapsed disclosure labeled
   `Room details`, or otherwise compress them without removing accessible information.
6. Keep the next recommended action visible.
7. Remove duplicate mobile guide wording. Show one compact `Next step` summary, progress, and action.
8. Keep the complete four-step list reachable through the existing collapsed `All four steps`
   disclosure.
9. Keep keyboard order, focus, reduced motion, screen-reader labels, and direct hashes intact.

Required measurable outcome at 390 by 844:

- active room `h1` top is at or above 390 CSS pixels on Product, Evaluation, and Decision
- no horizontal overflow or clipped interactive control
- next-step button is visible before the active `h1`
- agent availability and reset remain visible or reachable without opening the four-step guide
- navigating or opening disclosures does not mutate state

Do not solve this by shrinking body or control text below a readable size, visually hiding agent
availability, removing reset, or clipping overflowing content. Remove the current
`overflow-x: clip` safety-net rule if the underlying layout can be corrected. A no-overflow test
must pass because content fits, not because it is cut off.

## P2: provide another clear entry after the explanation

The mobile landing page is intentionally complete but long. Add one repeated CTA after the
evidence-status section and before the browser-agent technical section:

`Open the fictional review`

It must go to `#product`, use the existing button style, and cause no room mutation or storage
write. Do not make it sticky and do not add a third CTA in the hero.

## Screenshot correction

The existing landing screenshot files named `390x844` and `1440x1000` are full-page captures with
actual heights of 6420 and 4460. Their names currently overclaim their dimensions.

Replace the eight named viewport files with true viewport-only captures:

- `landing-390x844.png`, `product-390x844.png`, `evaluation-390x844.png`, `decision-390x844.png`
- `landing-1440x1000.png`, `product-1440x1000.png`, `evaluation-1440x1000.png`, `decision-1440x1000.png`

Each file must have exactly the dimensions in its name. If full-page captures are useful, save them
with `-full` in the filename so the evidence is honest.

## Required tests

Add or strengthen assertions that prove:

1. Primary and secondary instructional headings, buttons, and helper paragraphs no longer use
   unexplained `stage`, `staged`, `canonical`, `deterministic`, `authoritative`, `buyer context`,
   `proposal envelope`, or `diligence file`.
2. Exact domain/tool/event/receipt identifiers remain unchanged.
3. At 390 by 844, each active app `h1` begins at or above 390 CSS pixels.
4. No page horizontally overflows at 390, 768, 1280, or 1440 pixels without using clipping as the fix.
5. Mobile agent status, reset, next action, room details, and full guide remain keyboard reachable.
6. Repeated landing CTA causes no state or storage mutation.
7. Reset and recovery behavior remain unchanged under the new labels.
8. All prior landing, EU example, approval, evidence, direct-link, Back/Forward, persistence,
   recovery, and WebMCP tests still pass.

## Required verification

Run:

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

Inspect the eight corrected viewport screenshots. Report actual pixel dimensions.

Prove no changes under:

- `src/domain/**`
- `src/state/**`
- `src/webmcp/**`
- `src/fixtures/**`
- `evals/**`
- `scripts/**`
- deployment, release, or submission files
- `artifacts/brand-lab/**`

## Allowed edit boundary

You may edit only:

- the presentation files explicitly named above
- `src/app/AppShell.tsx`, `RoomGuide.tsx`, and related presentation CSS
- focused tests under `tests/components/**`, `tests/e2e/**`, `tests/accessibility/**`,
  `tests/public/**`, and `tests/webmcp/visibleProjection.test.tsx`
- `artifacts/visual-audit/012-plain-language/**`

No dependency changes.

## Required report

Return:

1. Exact language corrections.
2. New mobile chrome structure and measured `h1` top for all three app routes.
3. Repeated CTA behavior and no-mutation evidence.
4. Screenshot paths with actual dimensions.
5. Exact files changed in this correction pass.
6. Exact tests added or strengthened.
7. Exact command results with pass and fail counts.
8. Proof that protected paths and trust contracts are unchanged.
9. Residual risk or one named blocker.
10. Confirmation that no commit, push, deployment, publication, or external mutation occurred.

## Stop condition

Stop when the remaining technical language is secondary or removed, mobile app content begins high
enough to orient the user, screenshot dimensions are honest, and every required local gate passes.
If one blocker remains after one focused repair attempt, preserve the diagnostics and report it.
Do not broaden scope or change external state.
