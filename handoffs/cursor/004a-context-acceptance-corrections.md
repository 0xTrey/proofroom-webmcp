# Cursor correction work order 004a: context acceptance defects

## Objective

Correct the three defects found in Codex acceptance review of work order 004, then rerun the full item 6 verification matrix. Keep the current visual design and interaction model intact.

Do not begin checklist item 7. Do not commit, push, deploy, or mark item 6 complete. Codex owns acceptance.

## Source boundary

- Repository: `/Users/treyharnden/Projects/proofroom-webmcp`
- Read `AGENTS.md`, `handoffs/cursor/004-context-approval-personalization.md`, the current item 6 implementation, and the accepted spec sections that define `RoomState`, receipts, persistence, and the activity ledger.
- Work only in this repository.
- Preserve all unrelated changes from work order 004.
- Do not add dependencies, a backend, or a second mutation path.

## Defect 1: approval receipt is not durable

`buyerContextReceipt()` currently reconstructs the approval receipt from the activity ledger. The ledger is capped at 400 events, so an approved context can remain authoritative after the event that supplies its receipt has been evicted. The rail would then promise a receipt it cannot display.

Make the real buyer-context approval receipt part of authoritative persisted room state.

- Add a nullable persisted buyer-context receipt field to the strict room schema, inferred types, canonical fixture, accepted state documentation, and approval action.
- The same transaction that applies `approvedBuyerContext` must store the exact receipt returned by `approveBuyerContext`.
- Rejection of a later proposal must preserve both the prior approved context and its prior receipt.
- Keep hydration compatible with already saved schema-version-1 rooms that do not contain the new field. Prefer a field default or a precise migration that does not discard an otherwise valid room.
- `buyerContextReceipt()` may become a direct accessor. If it retains a compatibility reconstruction path for already persisted item 6 state, document and test that path.
- Add tests that prove exact receipt equality after reload, after a later proposal is rejected, and after more than 400 subsequent ledger events.
- Do not treat this digest as an authentication or legal artifact. Preserve the existing safe framing.

## Defect 2: rejection language becomes false

The resolved proposal currently says baseline ordering remains after any rejection. That is false when the user previously approved context and rejects a later proposal. In that state, the prior approved context and its personalized ordering remain authoritative.

- When no context has ever been approved, rejection may say baseline ordering remains.
- When prior approved context exists, state explicitly that the previously approved context remains authoritative and its personalization remains in place.
- Make the feedback live region and resolved proposal copy agree.
- Extend component coverage for both rejection branches. Assert the exact intended language and unchanged authoritative state.

## Defect 3: current tests rewrite historical evidence

`tests/e2e/baselineVisual.spec.ts` writes into `artifacts/visual-audit/003-baseline/` on every current E2E run. Item 003 is accepted historical evidence and must be immutable.

- Restore all twelve modified `artifacts/visual-audit/003-baseline/*.png` files byte-for-byte from the current `HEAD` commit.
- Keep the four-width, three-route baseline overflow and one-H1 assertions, but stop that test from writing to the 003 directory.
- Rename test descriptions if necessary so they no longer claim a current capture.
- Do not delete the accepted 003 artifacts or README.
- `tests/e2e/contextVisual.spec.ts` should continue writing only the current 004 artifacts.
- After all E2E and accessibility commands finish, prove `git diff --exit-code -- artifacts/visual-audit/003-baseline` passes.

## Required verification

Run all of the following after corrections:

```text
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:a11y
npm run evals
git diff --check
git diff --exit-code -- artifacts/visual-audit/003-baseline
```

Also confirm:

- exactly nine WebMCP tools remain registered
- no buyer-context or decision approval tool exists
- the four item 6 product transformations still occur
- the EU residency gap remains `unknown` and visible
- no em dash character exists in changed text
- no historical accepted artifact outside item 004 changed

## Required report

Return:

1. Root cause and exact fix for each defect.
2. Exact files changed.
3. Receipt persistence and ledger-cap test evidence.
4. Rejection-copy tests for both baseline and prior-approved states.
5. Every verification command with pass or fail and exact counts.
6. Proof that `artifacts/visual-audit/003-baseline` is clean after the final test run.
7. Any remaining item 6 risk.

## Stop condition

Stop after all three defects are corrected and every required command passes, or after reporting one concrete blocker with attempted fixes and exact output. Do not broaden scope.
