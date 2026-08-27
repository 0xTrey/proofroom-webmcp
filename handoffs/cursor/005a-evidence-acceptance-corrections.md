# Cursor correction work order 005a: evidence acceptance defects

## Objective

Correct the four defects found in Codex acceptance review of work order 005, regenerate only the affected current visual evidence, and rerun the complete item 7 matrix.

Keep the accepted buyer journey, status distribution, editorial design, shared-action architecture, and current item 7 functionality. Do not begin checklist item 8. Do not commit, push, deploy, or mark item 7 complete. Codex owns acceptance.

## Source boundary

- Repository: `/Users/treyharnden/Projects/proofroom-webmcp`
- Read `AGENTS.md`, work orders 005 and 005a, the current item 7 implementation, the accepted item 6 visual tests, WebMCP tool definitions and registration tests, and the relevant Playwright configuration.
- Work only in this repository.
- Preserve accepted item 5 and item 6 artifacts byte-for-byte.
- Preserve all correct item 7 changes.
- Add no dependency, backend, approval tool, direct state mutation, or second evidence engine.

## Defect 1: the modal inspector is bound to the full route document

`EvidenceInspector` renders inside `.surface.motion-rise`. That animated ancestor establishes a containing block, so `.evidence-inspector-layer { position: fixed; inset: 0; }` resolves against the 6,000 to 11,000 pixel route rather than the viewport. The current inspector screenshots prove the bug:

- `evidence-inspector-ev-011-1600.png` is 1598 by 6242 pixels.
- `evidence-inspector-ev-011-390.png` is 390 by 10693 pixels.
- Both contain a large blank region after the inspector content.

Make the inspector a true viewport modal.

- Render the inspector layer through a React portal owned by `EvidenceInspector`, targeting `document.body`, so it escapes the animated route container.
- Keep the existing accessible name, focus entry, Escape handling, visible close control, focus trap, and focus restoration.
- Lock background page scrolling while the inspector is open and restore the exact prior inline overflow values on cleanup. Do not leave global style residue after close or unmount.
- The layer bounding box must equal the current viewport at 390 and 1600 pixels.
- The inspector panel itself must scroll internally when its content exceeds the viewport.
- Opening the inspector from the catalog near the bottom of the page must not make the modal start at the top of the route document. Closing must restore focus to the catalog trigger and preserve the underlying page scroll position within a small browser tolerance.
- Do not use a transformed wrapper workaround. The portal should make the ownership explicit.
- Keep record text inert. Do not add HTML interpretation.

Add component and Playwright assertions for the portal target, scroll lock and cleanup, viewport-sized layer, internal scrollability, Escape, visible close, focus restoration, and underlying scroll preservation.

Regenerate the two current `ev_011` inspector captures after this fix. They should be viewport-sized panel views, not full-route-height blank canvases. Update `artifacts/visual-audit/005-evidence/README.md` with exact dimensions and what the captures prove.

## Defect 2: normal tests rewrite accepted visual evidence

`tests/e2e/contextVisual.spec.ts` still writes into accepted `artifacts/visual-audit/004-context/` during every `npm run test:e2e`. Cursor restored the files manually after its final run, but a passing suite must not mutate accepted evidence and then depend on cleanup.

`tests/e2e/evaluationVisual.spec.ts` would create the same problem for item 7 immediately after acceptance.

- Preserve every behavioral, layout, one-H1, overflow, reduced-motion, populated-state, inspector, and EU-gap assertion in those tests.
- Gate screenshot directory creation and screenshot writes behind one explicit opt-in environment variable such as `UPDATE_VISUAL_AUDIT=1`.
- Normal `npm run test:e2e` must run the visual-state assertions but write no screenshot file in `003-baseline`, `004-context`, or `005-evidence`.
- Add one documented package script or precise README command for an intentional item 7 capture run. It may target only `evaluationVisual.spec.ts` and must not touch item 5 or item 6 artifacts.
- Use the opt-in path once to regenerate the corrected item 7 inspector captures and any item 7 capture whose pixels legitimately change because of this correction.
- Restore any accepted item 5 or item 6 file from current `HEAD` if a test or failed attempt changes it.
- After the final normal E2E and accessibility runs, prove all three artifact directories are clean except for the intended uncommitted item 7 artifacts.

Do not delete accepted item 6 tests or reduce their assertions merely to stop screenshot writes.

## Defect 3: stale local evaluation errors survive unrelated success

`EvaluationSurface` keeps local `feedback` indefinitely. A local attachment failure can remain visible after a successful action elsewhere increments the room revision and clears the store error. This violates the work order rule that successful unrelated actions must not leave stale error copy visible.

- A local evaluation error should remain visible while room revision is unchanged.
- Clear a local evaluation error when an external or unrelated successful mutation advances the authoritative room revision.
- Do not clear the success or error message just produced by the evaluation action that caused the same revision change.
- Search is read-only, so a successful local search must still replace the local error directly.
- Keep global evaluation errors scoped to requirement or evidence failures and keep them out of the buyer-context rail.

Use a small explicit feedback-revision contract or equivalent deterministic approach. Do not add a global toast system. Add component coverage for local failure followed by an unrelated successful buyer-context mutation, plus local failure followed by local evaluation success.

## Defect 4: `attach_evidence` description contradicts behavior

The tool description currently says testimonials offered as security or compliance proof are rejected. The real domain behavior intentionally permits an active, relevant testimonial to be attached for audit context while its restricted claims remain ineligible and cannot cover the hard condition. Item 7 now visibly demonstrates that behavior with `ev_011` on SSO.

Make the public tool contract truthful.

- Update the `attach_evidence` description to say that expired and unrelated records are rejected, while testimonial security or compliance claims may be retained as evaluation context but cannot prove restricted conditions.
- Keep the rule that the tool cannot set status directly.
- Do not change the proven domain behavior unless existing spec evidence explicitly requires rejection.
- Extend registration or tool execution coverage so the description and behavior cannot drift again.
- Confirm attaching `ev_011` to SSO leaves SAML coverage from `ev_006` unchanged, leaves SCIM open, and returns a derived partially supported status.

## Documentation cleanup

Update the stale comment in `src/app/App.tsx` that still calls all product surfaces read-only baseline projections. It should describe the current shared-action UI and WebMCP composition accurately. Do not broaden the documentation beyond this correction.

## Required verification

Run all of the following after corrections and the intentional item 7 capture run:

```text
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:a11y
npm run evals
git diff --check
git diff --exit-code -- artifacts/visual-audit/003-baseline artifacts/visual-audit/004-context
```

Additionally:

1. Record SHA-256 hashes of every file in `003-baseline`, `004-context`, and `005-evidence` immediately before the final normal `npm run test:e2e`.
2. Run normal `npm run test:e2e` with the visual-update environment variable unset.
3. Record the hashes again and prove all three hash lists are identical.
4. Confirm both corrected item 7 inspector PNGs are viewport-sized and contain no trailing blank route canvas.
5. Confirm exactly nine WebMCP tools remain registered and no approval tool exists.
6. Confirm no direct requirement-status writer, `dangerouslySetInnerHTML`, em dash character, credential-like value, or real customer data was added.

## Required report

Return:

1. Root cause and exact fix for each defect.
2. Exact files changed.
3. Portal, scroll lock, viewport geometry, internal scroll, and focus test evidence.
4. Before and after inspector image dimensions.
5. Artifact hash proof across the final normal E2E run.
6. Stale-feedback tests for unrelated and local success.
7. Corrected tool description and matching testimonial behavior test.
8. Every required command with pass or fail and exact counts.
9. Any remaining item 7 risk or one concrete blocker.

## Stop condition

Stop after all four defects are corrected and every required command passes, or after reporting one concrete blocker with attempted fixes and exact output. Do not broaden scope.
