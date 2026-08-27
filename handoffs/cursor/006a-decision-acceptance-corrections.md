# Cursor work order 006a: decision acceptance corrections

## Objective

Correct the item 8 acceptance defects found by Codex without broadening scope. Keep the current ROI, brief, proposal, approval, persistence, and design implementation. Make the trust contract exact, complete the required visual evidence, rerun the full verification matrix, and return evidence for Codex review.

Do not begin item 9 or later work. Do not redesign accepted surfaces. Do not edit accepted item 5, item 6, or item 7 artifacts. Do not commit, push, deploy, or mark item 8 accepted.

## Source and action boundary

- Repository: `/Users/treyharnden/Projects/proofroom-webmcp`
- Read `AGENTS.md`, work orders 006 and accepted 005a, the current item 8 implementation and tests, and the relevant PRD, spec, and checklist sections.
- Work only in this repository.
- Reuse shared domain actions, fixture data, persisted-state validation, and the existing design system.
- Add no dependency and no backend.
- Preserve exactly nine WebMCP tools. Do not add approval, rejection, or ROI-apply tools.
- Use no em dash characters.

## 1. Make ROI field validation visible and draft-safe

The current page disables `Preview calculation` when a field is invalid, but `fieldErrors` are populated only by clicking that disabled button. A person cannot see why the draft is invalid.

Correct this contract:

- An invalid field must produce a visible, field-associated error through normal keyboard and pointer use.
- Keep the exact invalid draft value visible so the person can correct it. Do not silently coerce an empty or invalid edit into an apparently valid value.
- `aria-invalid` and `aria-describedby` must point to the visible message.
- Preview must not run while any field is invalid.
- A corrected value must clear its field error and permit a new preview.
- Preserve all strict domain input bounds. UI validation is guidance, not a replacement for the action schema.
- Add a component test that enters an invalid value, observes the exact visible error, proves the draft value remains present, corrects it, and successfully previews.
- Extend the canonical browser journey or a focused E2E test to prove the visible error is reachable by a real person.

Prefer a clear validate-on-change, validate-on-blur, or enabled-preview-then-validate interaction. Do not leave a disabled action as the only route to error creation.

## 2. Make ROI apply a real mutation only

The current `applyRoiAssumptionsAction` advances room revision and writes a ledger event even when every input equals the authoritative assumptions. That can make an unrelated decision proposal stale without any real commercial change.

Correct this contract:

- If every submitted assumption equals the authoritative values, fail atomically with a typed `INVALID_INPUT` result and a precise message such as `No ROI assumptions changed.`
- Do not change room revision, assumptions, result, ledger, proposal freshness, or persisted state for a no-op apply.
- In the UI, do not offer an apparently successful apply when the preview equals the authoritative values. Either disable the apply control with visible explanatory text or let the shared action return the precise error. The person must understand that no change is available to apply.
- A real apply still changes revision exactly once and reports the exact changed fields.
- Update domain and component tests. Replace any test that deliberately uses a no-op apply to make an approved decision historical with a real bounded change, then verify the historical notice.
- Add a regression proving a no-op apply cannot stale a pending proposal.

## 3. Make brief proof qualifiers status-aware

The current validator treats `partly`, `partially`, and `only` as generic negations. That can allow false claims such as `EU data residency is only verified` or `EU data residency is partially supported` while EU status is unknown.

Correct this contract:

- Keep true negations only: `not`, `no`, `never`, `cannot`, `without`, `lacks`, `lacking`, and `missing`.
- `only` is not a negation and must never make a proof claim safe by itself.
- Permit `partly` or `partially` as an honest qualifier only when the referenced requirement status is exactly `partially_supported` and the proof term is semantically compatible with partial support, such as `supported` or `covered`.
- Do not allow a partial qualifier to excuse `verified`, `confirmed`, `certified`, `compliant`, `satisfied`, `guaranteed`, `resolved`, `in place`, `meets`, `proven`, or `proves` for a non-supported requirement.
- An unknown or unsupported requirement described as partly or partially supported still conflicts.
- Keep the canonical sentence `SSO and provisioning is only partly covered.` valid because SSO is partially supported.
- Validate each risk string independently instead of joining all risks into one sentence. Keep the issue path as `risks` and avoid cross-risk sentence matching.
- Add focused tests proving:
  - unknown EU `EU data residency is only verified.` fails
  - unknown EU `EU data residency is partially supported.` fails
  - partial SSO `SSO and provisioning is only partly covered.` passes
  - an honest true-negation sentence still passes

Do not build a general natural-language classifier. Keep this a small deterministic guard with explicit tests.

## 4. Require the exact canonical review set for demo conveniences

The CFO brief, CISO brief, and canonical decision draft currently check only the six status values. An alternate evidence attachment set that happens to produce the same statuses can be mislabeled as the complete fictional review set.

Correct this contract:

- Export one shared helper beside `CANONICAL_REVIEW_SET` that returns true only when every required canonical evidence ID is attached to its specified requirement and the six resulting statuses exactly match the accepted canonical distribution.
- Use that helper in the evaluation surface, brief workspace, and proposal desk. Remove duplicate local status maps and duplicate readiness functions.
- Extra attached evidence may remain allowed only if it does not alter the exact accepted statuses. If it changes a status, the helper must return false.
- Add a focused test proving the convenience refuses a status-matching room that is missing one canonical evidence ID, and succeeds for the exact canonical set.

## 5. Complete and harden item 8 visual evidence

Work order 006 required eight images. The current test and README produce only four. Complete the exact set at 390 by 900 and 1600 by 900:

- `initial-decision-390.png`
- `initial-decision-1600.png`
- `roi-preview-390.png`
- `roi-preview-1600.png`
- `proposal-review-390.png`
- `proposal-review-1600.png`
- `approved-receipt-390.png`
- `approved-receipt-1600.png`

Required behavior:

- Add `npm run capture:visual:decision` targeting only `tests/e2e/decisionVisual.spec.ts` with `UPDATE_VISUAL_AUDIT=1` and the E2E Playwright project.
- The initial capture must show the current decision desk before canonical workflow actions.
- The ROI capture must show an edited, valid, unapplied preview with its calculation and warning or target context clearly inspectable.
- Proposal and receipt captures keep the existing exact canonical not-ready path.
- Gate every screenshot write behind `UPDATE_VISUAL_AUDIT=1`.
- Normal E2E must perform assertions but write no image or README file.
- Update `artifacts/visual-audit/006-decision/README.md` with the exact command, eight filenames, exact dimensions, and a short statement of what each state proves.
- State truthfully that these eight images are tracked milestone evidence. Do not say they are ignored or uncommitted.
- Run the intentional capture command once to generate all eight final files.
- Manually inspect every generated image for clipping, overlap, focus artifacts, broken hierarchy, accidental empty areas, and horizontal overflow. Correct only current item 8 visual defects.
- Record SHA-256 hashes for all artifact files before and after normal `npm run test:e2e`; the entire artifact tree must remain byte-identical.

## 6. Small correctness cleanup

- Remove the redundant identity comparison `authoritative === room.roiAssumptions` from the ROI status tone. The status must derive from meaningful room state.
- Make all new test names describe what they actually assert. A test named for visible field errors must assert the visible error text.
- Keep accepted item 5, item 6, and item 7 artifact bytes unchanged.

## Required verification

Run all commands after corrections and after the one intentional capture:

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

- `npm run capture:visual:decision` creates exactly the eight expected PNG files
- every PNG has the expected viewport width and is non-empty
- normal E2E leaves SHA-256 hashes of the full `artifacts/visual-audit` tree unchanged
- exactly nine WebMCP tools remain
- no approval, rejection, or ROI-apply tool exists
- no-op ROI apply is atomic and cannot stale a proposal
- brief qualifier tests cover all four required sentences
- all three canonical conveniences use the one exact shared review-set helper
- no direct state or local-storage writer was added
- no `dangerouslySetInnerHTML`, secret, credential-like value, real customer data, or em dash character was added

## Required report

Return:

1. Exact files changed.
2. How visible ROI validation works for empty, invalid, corrected, previewed, unchanged, and applied drafts.
3. Domain and UI evidence that no-op apply cannot mutate or stale a proposal.
4. The exact brief qualifier algorithm and all four regression results.
5. The shared canonical-review helper and every consumer.
6. The eight artifact names, dimensions, SHA-256 values, and manual observations.
7. Every verification command with pass or fail and exact counts.
8. Full-tree artifact hash comparison before and after normal E2E.
9. Remaining item 8 risks, or `none` with a concrete reason.

## Stop condition

Stop when every correction and required verification above is complete, or at the first concrete blocker after preserving diagnostics. Return the report to Codex. Do not begin a new milestone, commit, push, deploy, or claim acceptance.
