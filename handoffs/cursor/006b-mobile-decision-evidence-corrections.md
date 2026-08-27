# Cursor work order 006b: mobile decision evidence corrections

## Objective

Correct two visual acceptance defects found by Codex in the generated item 8 mobile evidence. Keep the accepted item 8 behavior and test contracts unchanged. Regenerate only item 8 evidence, rerun the relevant focused and full gates, and return a precise report.

Do not begin item 9. Do not commit, push, deploy, add dependencies, or change any WebMCP tool or domain behavior.

## Boundary

- Repository: `/Users/treyharnden/Projects/proofroom-webmcp`
- Read `AGENTS.md`, work orders 006, 006a, this work order, the current decision visual test, item 8 README, decision receipt markup and CSS, and related accessibility and E2E tests.
- Work only in this repository.
- Preserve item 5, item 6, and item 7 artifacts byte-for-byte.
- Keep exactly eight item 8 PNG files with the current required filenames and dimensions.
- Use no em dash characters.

## Defect 1: mobile proposal evidence does not show its claimed blockers

`proposal-review-390.png` currently shows the proposal envelope and only the start of `Proposed decision`. The required EU data residency and SSO blockers are below the viewport. The README says the image proves both blockers, which is not visually true.

Correct the capture state:

- At 390 by 900, position the page so the screenshot visibly includes the canonical `not ready` status and both blocking requirements: `req_eu_residency` with `unknown`, and `req_sso` with `partial` or the equivalent current readable label.
- Prefer a viewport position within the proposal payload. Do not hide, remove, or compact away proposal content solely for the screenshot.
- Keep the screenshot a real current page viewport, not a stitched image or synthetic mock.
- At 1600 by 900, continue to show the exact staged proposal with both blockers.
- Update the E2E visual assertions so the specific captured viewport content is proven before writing the screenshot. An assertion that the offscreen article contains text is insufficient. Check bounding rectangles or equivalent visibility within the viewport for the required blocker rows.
- If the image cannot reasonably include the approval controls as well, do not claim those controls are visible in the README. The canonical journey already proves the human action boundary separately.

## Defect 2: mobile receipt metadata has collapsed labels

`approved-receipt-390.png` currently renders the issued timestamp ending in `UTC` immediately adjacent to the next `SAFE SUMMARY` label, visually reading `UTCSAFE SUMMARY`.

Correct the current decision receipt layout at narrow widths:

- Give each metadata field a clear row or block boundary with enough vertical separation.
- `Issued timestamp` and its UTC value must be visually distinct from `Safe summary` and its value.
- Keep the exact receipt fields and values. Do not omit metadata to make it fit.
- Preserve readable text hierarchy, keyboard behavior, and no-horizontal-overflow behavior.
- At 390 by 900, the approved receipt screenshot must visibly show receipt kind, proposal ID, payload digest, approved revision, issued timestamp, and safe summary without overlap or collapsed labels.
- At 1600 by 900, preserve the current readable receipt.
- Add or strengthen a focused browser or component assertion for the narrow receipt layout so adjacent receipt fields do not overlap or collapse.

## Evidence and README

- Run `npm run capture:visual:decision` once after the fixes and regenerate all eight item 8 PNGs.
- Manually inspect all eight current images. Focus especially on the proposal blockers and receipt metadata at 390.
- Keep the README claims literal. Each sentence must describe only content visible in its named image.
- Confirm every PNG remains exactly 390 by 900 or 1600 by 900 as named.
- Record SHA-256 values for all eight images.
- Run normal `npm run test:e2e` after capture and prove it leaves the full artifact tree byte-identical.

## Required verification

Run:

```text
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:a11y
npm run evals
git diff --check
git diff --exit-code -- artifacts/visual-audit/003-baseline artifacts/visual-audit/004-context artifacts/visual-audit/005-evidence
```

Also prove:

- exactly eight item 8 PNGs exist
- mobile proposal screenshot visibly contains both blocker rows within the viewport
- mobile receipt fields have non-overlapping bounding boxes and visible vertical separation
- no normal test command writes screenshots
- full artifact-tree hashes stay unchanged across normal E2E
- no domain, persistence, WebMCP registration, approval-boundary, or fixture behavior changed
- no accepted historical artifact changed

## Required report

Return:

1. Exact files changed.
2. The mobile proposal capture position and viewport-visibility assertion.
3. The narrow receipt layout correction and non-overlap assertion.
4. All eight artifact dimensions and SHA-256 values.
5. Manual observations for all eight images.
6. Every verification command with exact pass counts.
7. Full artifact hash before and after normal E2E.
8. Remaining risks, or `none` with a concrete reason.

## Stop condition

Stop when both visual defects and every required verification are complete, or at the first concrete blocker after preserving diagnostics. Return the report to Codex. Do not start any other work, commit, push, deploy, or claim acceptance.
