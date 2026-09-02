# Cursor work order 016: align the demo and capture a coherent submission gallery

## Objective

Make the judge-facing demo plan match the current local product exactly, then capture a cohesive
three-image 1600 by 900 submission gallery from the current application.

The current demo script and shot list still use pre-clarity UI labels and start on `/#product`
instead of the new landing page. The current screenshot plan also mixes accepted images captured
before the landing, room-guide, and plain-language design work. The evidence and decision images are
good proof, but the gallery no longer reads as one coherent current release candidate.

Update the script and shot list to use exact current controls, put the working product on screen in
the first 10 to 15 seconds, and capture these three current local states at 1600 by 900:

1. landing hero with definition, primary CTA, EU example, and three-step decision chain
2. untrusted testimonial evidence inspector
3. human-approved decision receipt with activity context

This is a local candidate and submission-preparation milestone. Do not commit, push, deploy,
record a final video, upload, or mutate Devpost.

## Repository and starting state

Work only in:

`/Users/treyharnden/Projects/proofroom-webmcp`

Preserve the full dirty tree, including accepted work orders 011 through 015a and autoresearch run
13. Do not reset, clean, restore, or overwrite unrelated work.

Read completely before editing:

- `AGENTS.md`
- `/Users/treyharnden/Projects/ElevationEngine/TREY_VOICE.md`, read-only
- `handoffs/cursor/013-judge-runway-and-agent-rehearsal.md`
- `handoffs/cursor/014-agent-input-provenance.md`
- `handoffs/cursor/015-submission-state-and-evidence-parity.md`
- `handoffs/cursor/015a-demo-timing-truth-correction.md`
- `src/app/LandingPage.tsx`
- `src/app/RoomGuide.tsx`
- `src/features/context/BuyerContextWorkspace.tsx`
- `src/features/evaluation/EvaluationSurface.tsx`
- `src/features/evaluation/EvidenceInspector.tsx`
- `src/features/decision/BriefWorkspace.tsx`
- `src/features/decision/ProposalDesk.tsx`
- `src/features/decision/DecisionSurface.tsx`
- `tests/e2e/baselineVisual.spec.ts`
- `tests/e2e/evaluationVisual.spec.ts`
- `tests/e2e/decisionVisual.spec.ts`
- `tests/e2e/support/context.ts`
- `docs/submission/demo-script.md`
- `docs/submission/demo-shot-list.md`
- `docs/submission/screenshot-plan.md`
- `docs/submission/project-story.md`
- `docs/submission/launch-checklist.md`
- `artifacts/visual-audit/013-judge-runway/README.md`
- all three currently selected screenshot files

## Non-negotiable truth and design boundaries

- Never use an em dash.
- Never introduce an eyebrow-headline-dek stack.
- The video remains unrecorded and unuploaded.
- Live natural-language browser-agent selection remains `not_run`.
- The blocked blind public attempt remains discovery evidence only.
- The current local candidate remains uncommitted, unpushed, and undeployed.
- Exactly nine tools and two person-only approvals remain unchanged.
- The final-decision approval and buyer-profile approval remain visible UI-only controls.
- The CFO brief may be pre-positioned only when narration says it was not saved during the take.
- Do not imply the current local candidate has public or native-browser proof.
- Do not change application behavior, domain rules, schemas, fixtures, tool registration, release
  receipts, eval artifacts, or existing accepted visual files.

## 1. Align the demo script to the current local UI

Update `docs/submission/demo-script.md` and `docs/submission/demo-shot-list.md` so every named route,
button, heading, and state exists in the current UI.

Required current controls include:

- root landing route `/`
- `Open the fictional review`
- `Review the sample buyer profile`
- `Use this buyer profile`
- `Check evidence`
- `Run the sample evidence check`
- `Review decision`
- `Preview calculation`
- `Fill the honest sample draft`
- `Save CFO brief` only if it is actually shown live; otherwise keep the saved brief explicitly
  pre-positioned
- `Prepare the sample not-ready recommendation`
- `Prepare recommendation`
- `Approve recommendation`

Start at `/`, show the live landing page immediately, and click into the product by 0:12. The
working product must be visible within the first 10 to 15 seconds. Do not spend the opening on a
logo, title card, README, terminal, or static slide.

Keep one direct opening headline and put context in the spoken body. The opening should explain in
plain language that ProofRoom lets a browser agent check vendor claims against source records while
the buyer controls priorities and the final decision.

Preserve these proof beats:

- fictional demo disclosure
- agent-readable structured state instead of page scraping
- staged buyer profile and first visible person-only approval
- supported Salesforce and unknown EU residency
- testimonial instruction text quarantined as data
- visible ROI assumptions and honest CFO/CISO synthesis
- `not ready` recommendation with EU residency and SSO blockers
- second visible person-only approval and receipt
- real public-baseline native `document.modelContext` evidence with exactly nine tools and no shim,
  clearly labeled as baseline evidence
- shared `RoomActions` layer and activity history
- public baseline QA counts 423/38/48/12
- current local candidate remains not deployed
- live natural-language selection remains `not_run`

Do not claim that the current staging-template provenance change has been exercised by a public
agent. Do not claim a live model chose tools naturally.

Target a final cut of 2:35 to 2:45, never over 2:45. Aim for 250 to 270 spoken words and at least 30
seconds of measured allowance for clicks, transitions, and proof holds.

After the final text is complete, run the exact word-count and timing gates:

```text
awk '/^## 0:00/{started=1} started && /^> /{sub(/^> /, ""); print}' docs/submission/demo-script.md | wc -w
say -r 135 -o /tmp/proofroom-demo-cursor-audit-016.aiff "$(awk '/^## 0:00/{started=1} started && /^> /{sub(/^> /, ""); print}' docs/submission/demo-script.md)"
afinfo /tmp/proofroom-demo-cursor-audit-016.aiff
rm /tmp/proofroom-demo-cursor-audit-016.aiff
```

Update all current timing claims only after measuring the final text. Report the raw duration,
one-decimal rounded duration, arithmetic duration, and remaining allowance to 165 seconds.

## 2. Add a reusable submission-gallery capture hook without adding tests

Do not add a new Playwright test or change the normal E2E count.

Add one small support module under `tests/e2e/support/` that:

- uses `UPDATE_SUBMISSION_GALLERY=1` as the only write gate
- targets `artifacts/visual-audit/016-submission-gallery`
- creates the directory only when the gate is enabled
- captures the current 1600 by 900 viewport with animations disabled
- never captures a full page
- performs no writes during ordinary `npm run test:e2e`

Reuse that helper from the existing visual tests:

- `baselineVisual.spec.ts`: capture `01-landing-hero-1600.png` during the existing 1600 landing test
- `evaluationVisual.spec.ts`: capture `02-untrusted-evidence-1600.png` when the `ev_011` inspector is
  open during the existing 1600 test
- `decisionVisual.spec.ts`: capture `03-approved-decision-1600.png` after the existing 1600 approval
  receipt assertions

Normal test counts must remain unchanged. Existing `UPDATE_VISUAL_AUDIT` behavior and existing
artifact bytes must remain unchanged.

## 3. Add judge-visible capture assertions

In the existing 1600 landing visual test, assert before capture that all of these are fully visible
inside the viewport:

- the single level-one heading
- the primary `Open the fictional review` CTA
- the complete fictional EU example card
- the complete three-step decision chain

Assert there is no horizontal overflow. If the current 1600 layout cannot show those four elements
at once, make only the smallest desktop-only spacing adjustment needed. Preserve mobile and tablet
behavior, the current visual language, and the no-eyebrow rule. Any CSS change requires full visual
and accessibility regression tests.

For the evidence image, keep the full inspector, quarantine copy, instruction-styled testimonial,
close control, and enough dimmed app context to show it is in-product.

For the decision image, keep the full receipt metadata required by the existing layout assertions
and enough activity context to connect the approval to the shared history.

## 4. Generate and document the gallery

Add:

`artifacts/visual-audit/016-submission-gallery/README.md`

Record:

- exact capture command
- local candidate status and explicit not-deployed boundary
- 1600 by 900 dimensions for all three files
- SHA-256 for each file
- page state and visible proof in each frame
- no personal or real customer data
- live-agent status `not_run`

Run the capture through the existing Playwright configuration with the new gate enabled. You may
run the three visual spec files together or separately. Do not use manual browser screenshots,
image editing, resizing, overlays, annotation, or post-processing.

Use `sips` and `shasum -a 256` to verify dimensions and hashes. The generated PNG bytes are durable
local candidate artifacts and belong in the repository.

## 5. Update the screenshot plan and story

Update `docs/submission/screenshot-plan.md` to select the three new current-candidate images in this
order:

1. landing and value explanation
2. untrusted evidence quarantine
3. human-approved decision receipt

For each, provide one plain-language caption, judge purpose, and crop guidance. Prefer the complete
1600 by 900 image. Do not imply these images are deployed or already uploaded to Devpost.

Update the smallest relevant sentence in `docs/submission/project-story.md` and
`docs/submission/launch-checklist.md` so they point to the coherent current-candidate gallery while
keeping external upload and Devpost steps unchecked.

## Expected files

- `docs/submission/demo-script.md`
- `docs/submission/demo-shot-list.md`
- `docs/submission/screenshot-plan.md`
- `docs/submission/project-story.md`
- `docs/submission/launch-checklist.md`
- `docs/hackathon-build/checklist.md` only if the final measured timing claim changes
- `tests/e2e/support/submissionGallery.ts`
- `tests/e2e/baselineVisual.spec.ts`
- `tests/e2e/evaluationVisual.spec.ts`
- `tests/e2e/decisionVisual.spec.ts`
- `artifacts/visual-audit/016-submission-gallery/README.md`
- three generated PNG files in that directory

Touch no runtime code unless the 1600 first-viewport assertion requires a minimal desktop-only CSS
spacing correction. Do not change package dependencies, test counts, domain code, tools, schemas,
fixtures, persistence, evals, release receipts, deployment, or external state.

## Acceptance gates

Run and report exact results for:

```text
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run test:a11y
npm run evals
npm run evals:live:validate
npm run build
npm run check:bundle
git diff --check
```

Capture and verify:

```text
UPDATE_SUBMISSION_GALLERY=1 npx playwright test tests/e2e/baselineVisual.spec.ts tests/e2e/evaluationVisual.spec.ts tests/e2e/decisionVisual.spec.ts --project=e2e
sips -g pixelWidth -g pixelHeight artifacts/visual-audit/016-submission-gallery/*.png
shasum -a 256 artifacts/visual-audit/016-submission-gallery/*.png
```

Additional checks:

- exact spoken word count and final narration timing are measured from final text
- every quoted UI label exists in current source or test selectors
- the three new PNGs are exactly 1600 by 900
- the three files are generated by Playwright and unedited
- ordinary `npm run test:e2e` writes no new gallery bytes and remains at 45 tests
- existing visual artifacts remain byte-identical
- exactly nine tools and two UI-only approvals remain unchanged
- live-agent record remains `not_run`
- no current-local-candidate claim is labeled deployed or public
- no commit, push, deploy, upload, final video, or Devpost mutation

## Return format

Return:

1. summary
2. exact demo flow and current UI label corrections
3. spoken word count and raw/rounded timing evidence
4. files changed
5. gallery table with paths, dimensions, hashes, and judge purpose
6. visual assertions and any CSS decision
7. exact QA commands and counts
8. artifact-byte integrity result
9. known external steps and `not_run` items
10. git status summary
11. recommendation for Codex acceptance

Stop when the demo plan is current, the three images are generated and verified, and every gate
passes, or at the first concrete blocker after preserving diagnostics. Do not start another work
order.
