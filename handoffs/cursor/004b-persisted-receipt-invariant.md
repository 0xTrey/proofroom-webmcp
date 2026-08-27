# Cursor correction work order 004b: persisted receipt invariant

## Objective

Close the final trust-boundary defect in checklist item 6. A persisted buyer-context receipt is currently validated only by shape, so a locally modified receipt with the wrong kind, proposal linkage, revision, or input digest can be displayed as authoritative. Enforce the relationship between the persisted receipt and the approved buyer context, then rerun the item 6 acceptance matrix.

Do not begin checklist item 7. Do not redesign the accepted item 6 interface. Do not commit, push, deploy, or mark the milestone complete. Codex owns acceptance.

## Source boundary

- Repository: `/Users/treyharnden/Projects/proofroom-webmcp`
- Read `AGENTS.md`, `handoffs/cursor/004-context-approval-personalization.md`, `handoffs/cursor/004a-context-acceptance-corrections.md`, and the current receipt, schema, migration, persistence, and item 6 test code.
- Work only in this repository.
- Preserve every existing item 6 change and all accepted historical artifacts.
- Do not add dependencies, a backend, or a second mutation path.

## Defect

`roomStateSchema` accepts any shape-valid `Receipt` in `approvedBuyerContextReceipt`, and `buyerContextReceipt()` returns it without checking its relationship to the approved context. Local storage is untrusted input. A structurally valid decision receipt, a receipt for a different payload, or a receipt from a future revision can therefore survive hydration and appear in the approval rail.

## Required invariant

When `approvedBuyerContextReceipt` is non-null, strict room validation must prove all of the following:

1. `approvedBuyerContext` is non-null.
2. Receipt `kind` is exactly `buyer_context`.
3. Receipt `proposalId` is non-null.
4. Receipt `revision` is not greater than the room revision.
5. Receipt `inputDigest` exactly equals the stable `inputDigest()` of `approvedBuyerContext`.

The validator must reject inconsistent persisted state and use the existing visible recovery path. Do not silently display, repair, or downgrade a present but inconsistent receipt.

Keep one compatibility rule: an approved context with a missing or null receipt must still parse as the short-lived legacy schema-version-1 state introduced during item 6. After parsing, the existing migration may reconstruct and promote that legacy receipt when its approval event remains available. Do not weaken validation for a receipt that is present.

Prefer one canonical validation path. If a narrower buyer-context receipt schema and a room-level refinement make the contract clearer, use them. Importing the pure digest helper into the schema module is acceptable if it does not introduce a runtime cycle. Do not duplicate the digest algorithm.

## Required tests

Add focused hydration or schema tests proving that each of these shape-valid persisted corruptions falls back to the canonical fixture with `invalid_persisted_state`:

- receipt kind changed to `decision`
- receipt `proposalId` changed to `null`
- receipt revision greater than the room revision
- receipt digest changed to another non-empty valid string
- receipt present while approved context is `null`

Keep and pass the existing legacy missing-field reconstruction, exact reload equality, rejection preservation, and 400-event ledger eviction tests.

Also prove a correctly persisted approval still hydrates from persistence without a recovery notice.

## Required verification

Run all of the following after the correction:

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

Confirm exactly nine WebMCP tools remain registered and no approval tool exists. Confirm no accepted historical artifact changed. Confirm no em dash character exists in changed text.

## Required report

Return:

1. The validation design and why it has no import cycle.
2. Exact files changed.
3. The five corruption tests plus the valid and legacy hydration evidence.
4. Every verification command with pass or fail and exact counts.
5. Proof that accepted historical artifacts remain clean.
6. Any remaining item 6 risk.

## Stop condition

Stop after the invariant is enforced and every required command passes, or after reporting one concrete blocker with attempted fixes and exact output. Do not broaden scope.
