# Cursor work order 003b: baseline accessibility repair

## Objective

Close the serious axe defects blocking checklist item 5. Preserve the accepted editorial composition and do not begin checklist item 6.

## Allowed boundary

- Repository: `/Users/treyharnden/Projects/proofroom-webmcp`
- You may edit baseline feature markup, design tokens, baseline CSS and motion, accessibility tests only if the test itself is wrong, component tests, screenshot artifacts, and acceptance notes.
- Do not add an arbitrary wait to hide a real transient contrast defect.
- Do not deploy, commit, push, or add future workflow controls.

## Observed defects

### 1. Invalid definition-list structure

Axe reports `definition-list` on `.commercial-numbers` because grouped `div` elements contain direct `span` children. A `dl` group may contain properly ordered `dt` and `dd` elements, not direct `span` elements.

Repair the commercial metrics markup with valid semantic grouping. Supporting notes should be `dd` content or live outside the `dl` in an equally semantic structure. Preserve the visual hierarchy.

### 2. Transient opacity breaks contrast

Axe captured critical product text at ratios around 1.5:1 and 1.6:1 because the entrance motion lowers the opacity of essential text. Do not paper over this with test timing.

- Essential content must meet contrast throughout its rendered state.
- Remove opacity animation from critical text and data surfaces. Motion may use small transforms or nonessential decorative elements.
- Keep the reduced-motion path.

### 3. Small cobalt and rust labels miss 4.5:1

Axe reports small cobalt index text around 3.69:1 on the paper background, and other small labels around 4.05:1 to 4.12:1 where 4.5:1 is required.

Adjust the relevant semantic color tokens or scoped styles so every small text use meets WCAG AA against its actual background. Preserve the intended palette:

- cobalt still reads as agent or index activity
- rust still reads as gaps and risk
- acid green still reads as verified proof

Do not solve this by increasing all labels into oversized display text. Use compliant colors.

## Verification

Run and pass:

```text
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:a11y
```

Requirements:

- 0 serious or critical axe violations on Product, Evaluation, and Decision at 390, 768, 1280, and 1600 pixels.
- All 16 current E2E cases pass, including overflow and reduced-motion.
- Regenerate all twelve screenshots under `artifacts/visual-audit/003-baseline/`.
- Confirm the corrected palette still looks intentional in the captures.
- Run `git diff --check` and the no-em-dash guard through lint.

## Required report

Return exact markup and token changes, every command and count, regenerated screenshot paths, and any remaining accessibility or visual risk.

## Stop condition

Stop only when the full matrix passes and screenshots are regenerated, or report one concrete blocker with attempted fixes and exact output.
