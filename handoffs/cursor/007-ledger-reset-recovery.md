# Cursor work order 007: activity ledger, reset, and recovery

## Objective

Build checklist item 9 as the operational trust layer for ProofRoom. A buyer or judge must be able to inspect the real action ledger, filter it without creating fake events, reset the entire demonstration through one explicit in-app confirmation, understand and resolve persistence recovery states, dismiss action errors without losing work, retry browser persistence and failed WebMCP registration, and recover from a render failure without exposing internal error text.

Keep the application client-first and deterministic. Do not begin item 10 eval execution, item 11 deployment, item 12 README or submission work, or any backend work. Do not commit, push, deploy, or mark item 9 accepted. Codex owns acceptance.

## Source boundary

- Repository: `/Users/treyharnden/Projects/proofroom-webmcp`
- Read `AGENTS.md`, the PRD and spec sections for Epic 7, Epic 8, persistence, accessibility, and testing, accepted work orders through 006b, current action runtime, ledger selectors, reset action, migration layer, persistence adapter, error boundary, app shell, and all existing item 8 surfaces and tests.
- Work only in this repository.
- Reuse the existing activity events, shared actions, persistence port, receipt builder, fixture, selectors, dialog and focus-management patterns, and design system.
- Preserve accepted item 5 through item 8 artifacts byte-for-byte.
- Add no dependency, backend, server state, analytics service, or WebMCP tool.
- Keep exactly nine WebMCP tools and the two existing UI-only approval boundaries.
- Use no em dash characters.

## 1. Build the real activity ledger

Replace the decision route's totals-only activity section with a complete ledger workspace. Keep the existing totals as a summary, but add an inspectable table backed only by `room.activityLedger` and existing read-only selectors.

### Required event fields

Every rendered event must expose:

- sequence and stable event ID
- UTC timestamp
- origin with readable labels: `webmcp` as Agent, `ui` as Person, and `system` as System
- action name
- registered tool name or an explicit `page only` or `system` label when null
- panel
- read or mutation classification
- revision before and after
- safe input summary
- affected IDs
- input digest
- result status
- untrusted-content flag when true

Do not render raw action inputs, raw buyer context, stacks, storage payloads, or the full room JSON. The existing `inputSummary` is the display contract. Keep digests and IDs visually secondary but available for inspection.

### Required filters and behavior

- Origin: all, Agent, Person, System.
- Kind: all, reads, mutations. A system bootstrap event is System, not an Agent read.
- Panel: all plus every current panel enum represented in the room or fixture.
- Default order is newest event first while preserving original sequence values.
- Show exact `showing X of Y` filtered counts and the all-ledger total.
- Filtering and pagination are local read-only presentation operations. They must not append events, change revision, or persist a different room.
- Render no more than 25 filtered events initially. `Show 25 more` reveals the next page without changing room state. Provide an honest empty state.
- Keep the 400-event domain cap. Test a capped ledger with continued monotonic sequence values and usable filtering.
- Use a dense semantic table at desktop widths and readable stacked records below 768 pixels. Preserve real table semantics or an equally strong accessible association between field labels and values.
- Keep text and shape in addition to color for origin, kind, result, and untrusted state.
- Provide keyboard-operable filters, disclosure details, and pagination.
- Route feedback and the activity table must not obscure each other.

Add a focused privacy regression that runs the canonical buyer-context and brief actions with distinctive fictional sensitive strings, then proves none of those raw strings appear in any ledger field, DOM row, tool response, or persisted event.

## 2. Build one global in-app reset flow

Add one easy-to-find `Reset demo` control available from every route. It must open a visible in-app confirmation and never call `window.confirm`.

### Confirmation contract

- The first click opens a dialog and does not mutate state.
- The dialog states exactly what will be removed: approved buyer context and receipt, requirement attachments and buyer notes, ROI changes, briefs, decision proposal and approved decision, and prior ledger history.
- It also states what remains: six fictional requirements, twelve fictional evidence records, canonical commercial assumptions, schema version 1, and one new canonical system event.
- `Cancel` and Escape close without mutation and return focus to the trigger.
- `Reset to canonical fixture` is the single confirmation action. It calls `actions.resetRoom()` exactly once.
- Approval, rejection, or WebMCP tools must never be used for reset.
- On success, close the dialog, clear presentation-level action errors, navigate to Product, and show the returned reset receipt in a visible non-authoritative confirmation panel. Include receipt ID, kind, digest, timestamp, six requirements, twelve evidence records, and revision 0.
- The room after reset must match `createCanonicalRoom(resetAt)` exactly except for the stable existing room ID rule. The ledger contains only the canonical `room_ready` System event at sequence 1 with the reset timestamp.
- Reload after reset must preserve exact fixture parity. The transient reset-result panel may disappear after reload, but it must never pretend the prior ledger was preserved.
- If browser persistence fails after the in-memory reset, state clearly that the current tab reset succeeded but reload may restore old or empty state. Offer the persistence retry path.
- Reset stays absent from WebMCP.

Implement the dialog outside the route error boundary so a failed surface can still request it. Use the existing body-portal, focus-trap, scroll-lock, Escape cleanup, and focus-return quality bar from the evidence inspector and approval review patterns. Avoid duplicate reset controls.

## 3. Make recovery and persistence states actionable

Replace the passive recovery notice with a clear recovery panel that handles every current case and one explicit legacy migration case.

### Recovery states

1. `invalid_persisted_state`
   - State that untrusted saved data failed strict validation and the canonical fixture is active.
   - Offer `Continue with recovered fixture`, which uses the shared dismiss-recovery action and persists the safe current room when storage is available.

2. `unsupported_schema_version`
   - State the unsupported version and that the canonical fixture is active.
   - Offer the same explicit continue action.

3. `storage_unavailable`
   - State that current-tab work remains usable in memory but may not survive reload.
   - Offer `Try saving again` through `roomStoreHandle.retryPersist()`.
   - A successful retry clears the infrastructure warning without changing room revision or adding a fake ledger event.
   - A failed retry shows a bounded, safe field-level message and keeps work intact.

4. `persisted_state_migrated`
   - Extend the strict recovery-notice code contract with this exact code or an equally explicit typed migration code.
   - Detect a valid schema-version-1 legacy room in which approved buyer context exists and the authoritative buyer-context receipt is absent but can be reconstructed from its still-present approval event.
   - Preserve the room and reconstruct the exact receipt using the accepted migration rule.
   - Show a migration notice explaining that an older saved room was upgraded in place. Do not call this corruption or reset.
   - `Continue with upgraded room` dismisses and persists the upgraded state.

### Shared requirements

- Show notice code, safe message, UTC detection time, and bounded technical detail in a collapsed disclosure only when detail exists.
- Never show raw persisted JSON, stack traces, exception objects, or credential-like content.
- The panel remains visible after navigation until explicitly resolved.
- Dismissing a room recovery notice uses `actions.dismissRecoveryNotice()` and follows its existing revision and ledger semantics.
- Retrying persistence is infrastructure-only and must not alter room revision or activity history.
- If a recovery notice has been dismissed but storage remains unavailable, keep a storage-specific warning visible.
- Successful persistence retry must update the AppShell status readback immediately.
- Corrupted or unsupported saved state must not be trusted, merged, or partially repaired. It falls back to the canonical fixture.

Harden local-storage recovery so dismissing or continuing from a fallback writes the valid current room. A following reload must not repeat the same corruption notice.

## 4. Make action errors dismissible without losing work

Every route-owned domain error and local validation/action error must have a visible `Dismiss error` control.

- Dismissal clears only the presentation error through the existing store `clearError()` and local feature feedback setters.
- It must not change room revision, activity history, persisted room, form drafts, proposals, attached evidence, briefs, or approved state.
- Keep the accepted route ownership contract: buyer-context, evaluation, and decision errors appear only in their relevant feedback area.
- A successful action still clears a stale domain error as today.
- Do not create a global toast system.
- Add tests for a draft-preserving dismissal on all three feedback owners.

## 5. Harden render-failure recovery

The current `ErrorBoundary` renders an arbitrary `error.message` and directly resets the room without confirmation. Correct both defects.

- Never render an arbitrary thrown message, stack, component stack, or serialized error to the person.
- Log only through the existing development console path. Public UI uses stable safe copy.
- Provide `Try this surface again`, which clears only the boundary state and does not mutate the room.
- Provide `Open reset confirmation`, which invokes the same global reset dialog and does not reset immediately.
- A successful confirmed reset clears the boundary and returns to Product.
- The reset dialog remains available even while the route child is failed.
- Component tests must use a deliberately thrown distinctive secret-like sentence and prove that sentence never appears in rendered UI.
- Do not add a production debug or crash trigger.

## 6. Retry failed or partial WebMCP registration

The page already represents unavailable, partial, and error states. Add an explicit safe retry for `partial` and `error` only.

- A visible `Retry agent tools` control re-runs the existing registration lifecycle after unregistering or aborting the prior attempt.
- It must not duplicate tool registrations or exceed the exact nine names.
- It must not change room revision or activity history.
- Unavailable browsers keep the honest UI-only fallback message and do not show a false retry that can never work.
- A successful retry announces nine registered tools.
- A repeated partial or failed retry remains honest and keeps the page fallback usable.
- Add lifecycle tests for fail-then-success and repeated partial failure, including cleanup and no duplicates.

## 7. Visual and content requirements

- Continue the accepted editorial due-diligence system: warm paper, deep ink, acid green, cobalt, rust, Newsreader, Manrope, and IBM Plex Mono.
- The ledger should feel like an audit register, not a generic admin data grid.
- Keep one primary H1 per route. Do not use an eyebrow-headline-dek stack.
- Do not use glass, purple gradients, excessive pills, generic KPI cards, or a wall of rounded panels.
- Keep reset destructive styling clear but calm. Do not use alarmist copy.
- Keep the fictional-vendor and fictional-buyer disclosures visible.
- Use no em dash characters.

## Required automated coverage

### Domain, selectors, persistence, and store

Cover at minimum:

1. Ledger filter combinations, newest-first projection, totals, System not counted as read, pagination slicing, empty state, 400-event cap, and monotonic sequence after cap.
2. Raw buyer and brief input never appears in ledger summaries or persistence.
3. Reset cancel is presentation-only; confirmed reset replaces all mutable state, returns exact reset receipt, keeps room ID, produces revision 0 and one canonical event, persists, and reloads with fixture parity.
4. Invalid and unsupported state fall back without partial trust and stop repeating after explicit continue plus reload.
5. Storage unavailable keeps in-memory actions working; retry success and failure do not mutate room or ledger.
6. Legacy schema-version-1 buyer-context receipt reconstruction preserves the full room and emits the typed migration notice.
7. Migration notice dismissal persists the upgraded receipt and does not repeat after reload.
8. Recovery detail limits and strict persisted-state schemas remain enforced.

### Components

Cover at minimum:

1. Ledger rows render every required safe field and exact labels.
2. Origin, kind, and panel filters combine correctly without room mutation.
3. Twenty-five row pagination, `Show 25 more`, and empty state.
4. Mobile record layout and desktop table semantics.
5. Reset dialog open, cancel, Escape, focus trap, focus return, exact consequences, confirm, reset receipt, and storage-failure copy.
6. Invalid, unsupported, unavailable, and migrated recovery panels and their actions.
7. Dismissible route errors preserve all draft and authoritative work.
8. Error boundary hides thrown message, retries rendering without mutation, and requests the shared reset dialog.
9. WebMCP registration fail-then-success, repeated partial, cleanup, exact names, and no state mutation.

### Canonical Playwright journey

Add one item 9 journey that:

1. starts from reset
2. creates a meaningful mix of Person, System, read, and mutation events through visible controls and the existing safe test-shim path where needed
3. opens the decision ledger and verifies exact event IDs, actions, revisions, origins, safe summaries, and absence of raw context text
4. exercises origin, kind, and panel filters plus empty state without changing revision or event count
5. proves the mobile and desktop ledger have no horizontal overflow
6. opens reset, cancels, verifies no mutation, reopens, confirms once, and verifies the exact reset receipt
7. verifies revision 0, six requirements, twelve evidence records, cleared context, evidence attachments, briefs, proposal, approved decision, and one canonical event
8. reloads and proves fixture parity plus no reappearance of prior events
9. records no uncaught page errors, console errors, failed requests, or failed responses
10. asserts one H1 and keyboard operation

Add focused browser recovery journeys for invalid persisted state and unsupported version. After explicit continue and reload, the same notice must not repeat.

### Accessibility and visual evidence

- Extend axe coverage for populated ledger, reset dialog, recovery notice, and reset receipt at 390, 768, 1280, and 1600 pixels where the state is meaningful.
- Verify focus trap, Escape, focus return, live announcements, semantic filter labels, table headers, stacked mobile labels, and reduced motion.
- Gate screenshot writes behind `UPDATE_VISUAL_AUDIT=1` from the start.
- Add `npm run capture:visual:recovery` targeting only the item 9 visual test.
- Capture exactly eight current milestone images in `artifacts/visual-audit/007-recovery/`:
  - populated ledger at 1600 and 390
  - reset confirmation at 1600 and 390
  - invalid-state recovery notice at 1600 and 390
  - successful reset receipt at 1600 and 390
- Add a README with exact command, dimensions, and literal visible state for each image.
- Normal test commands must never write any artifact.
- Manually inspect all eight images for cropping, false claims, overlap, focus residue, dialog positioning, table readability, and horizontal overflow.

## Required verification

After implementation and one intentional visual capture, run:

```text
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:a11y
npm run evals
git diff --check
git diff --exit-code -- artifacts/visual-audit/003-baseline artifacts/visual-audit/004-context artifacts/visual-audit/005-evidence artifacts/visual-audit/006-decision
```

Also confirm:

- exactly nine WebMCP tools remain
- no reset, recovery, approval, rejection, or ROI-apply tool exists
- every displayed event came from the authoritative ledger
- filters, pagination, persistence retry, boundary retry, and WebMCP retry create no ledger event
- reset and dismiss-recovery use only their existing shared actions
- no direct room or local-storage writer exists in feature code
- normal E2E leaves SHA-256 hashes of the full artifact tree unchanged
- no `dangerouslySetInnerHTML`, raw JSON recovery output, manual ledger event, manual requirement status, secret, real customer data, or em dash character was added
- accepted historical artifacts remain byte-identical

## Required report

Return:

1. What changed in the judge and buyer recovery journey.
2. Exact files changed.
3. Ledger field, filter, pagination, ordering, privacy, cap, and responsive evidence.
4. Reset dialog, action, receipt, fixture parity, persistence, and reload evidence.
5. Every recovery and migration state with exact actions and persistence result.
6. Route-error dismissal and render-boundary privacy evidence.
7. WebMCP retry lifecycle and exact-nine proof.
8. Every verification command with pass or fail and exact counts.
9. The eight artifact names, dimensions, SHA-256 values, and manual observations.
10. Full artifact-tree hash before and after normal E2E.
11. Remaining item 9 risks or one concrete blocker.

## Stop condition

Stop when checklist item 9 and every verification above are complete, or at the first concrete blocker after preserving diagnostics. Return the report to Codex. Do not begin item 10, commit, push, deploy, or claim acceptance.
