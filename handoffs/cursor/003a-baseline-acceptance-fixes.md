# Cursor work order 003a: baseline acceptance fixes

## Objective

Close the final checklist-item-5 gates from work order 003 without starting checklist item 6.

## Allowed boundary

- Repository: `/Users/treyharnden/Projects/proofroom-webmcp`
- Read work order 003 and its current artifacts before editing.
- Edit only the stale browser assertion, ledger-total semantics and tests, affected visual copy if needed, screenshot artifacts, and acceptance documentation.
- Do not deploy, commit, push, or add workflow controls from items 6 through 9.

## Required fixes

### 1. Fix the stale disclosure assertion

`tests/e2e/uiJourney.spec.ts` still expects `This is fictional demo content`, while the accepted visual uses `Fictional demonstration`.

Update the test to assert the current visible disclosure in a resilient, accessible way. Do not revert the visual copy just to satisfy the test.

### 2. Correct ledger read totals

The reset Decision screenshot shows:

- events: 1
- system: 1
- reads: 1

The only event is `room_ready`, a system lifecycle event, not a read action. `ledgerTotals` currently treats every nonmutating event as a read.

Correct the aggregation so system lifecycle events are not counted as reads. Preserve:

- `total` as every event
- `mutations` as mutating actions
- `reads` as actual nonmutating UI or WebMCP actions
- `byOrigin.system` as the system-event count

Add a direct regression test proving the canonical reset ledger reports total 1, system 1, reads 0, and mutations 0. Check existing tests and copy for any assumptions that need alignment.

### 3. Complete browser acceptance

Run and pass:

```text
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:a11y
```

Regenerate all twelve screenshots under `artifacts/visual-audit/003-baseline/` so the Decision captures show the corrected totals. Confirm no horizontal overflow at 390, 768, 1280, or 1600 pixels and that reduced-motion smoke still passes.

## Required report

Return exact files changed, test counts, browser counts, screenshot paths regenerated, and remaining risk. Recommend the next work order but do not begin it.

## Stop condition

Stop only when every command passes and the screenshots are regenerated, or report one concrete blocker with attempted fixes and exact output.
