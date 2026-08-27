# Cursor work order 006: ROI, stakeholder briefs, and human decision approval

## Objective

Build checklist item 8 as the final buyer-decision workflow: a person can challenge and apply a bounded commercial model, the page and WebMCP can save evidence-safe CFO and CISO briefs, a browser agent or page fallback can stage a decision proposal, and only a person can approve or reject that exact proposal through visible page controls.

The complete canonical path must remain honest. After the accepted item 7 review set, Northstar is not ready because EU data residency is unknown and SSO provisioning is only partially supported. The approved demonstration decision should be `not_ready`, with a durable receipt and explicit next steps. Do not force a positive outcome.

Do not begin the full activity ledger, reset and recovery UI, final eval runner, deployment, README, demo video, or Devpost work. Do not commit, push, deploy, or mark item 8 complete. Codex owns acceptance.

## Source boundary

- Repository: `/Users/treyharnden/Projects/proofroom-webmcp`
- Read `AGENTS.md`, `docs/hackathon-build/prd.md`, `docs/hackathon-build/spec.md`, `docs/hackathon-build/checklist.md`, all accepted work orders through 005a, the accepted decision baseline, ROI, brief, proposal, receipt, persistence, WebMCP, fixture, selector, and test code.
- Work only in this repository.
- Preserve accepted item 5, item 6, and item 7 artifacts byte-for-byte.
- Reuse the existing `RoomActions` methods and domain calculations. Do not introduce a second ROI formula, brief validator, decision engine, direct Zustand mutation, direct local-storage mutation, or approval tool.
- Add no backend and no dependency unless an existing repository capability cannot meet an explicit acceptance requirement.

## Canonical decision contract

The accepted item 7 fictional review set produces:

- supported: `req_salesforce`, `req_soc2`, `req_campaign_volume`
- partially supported: `req_sso`, `req_payback`
- unknown: `req_eu_residency`

The current hard blockers are `req_eu_residency` and `req_sso` because both are `must` and neither is exactly supported.

The canonical commercial model is:

- 20 campaigns per month
- 6 hours saved per campaign
- 85 USD loaded hourly cost
- 96,000 USD annual subscription
- 18,000 USD implementation cost
- 120,000 USD budget ceiling
- 1,440 annual hours saved
- 122,400 USD annual labor value
- 114,000 USD first-year cost
- 8,400 USD first-year net value
- 11.2 month payback
- annual subscription is within the budget ceiling

The model values operator labor only. It makes no revenue, conversion, or pipeline claim.

## 1. Build a challengeable commercial model

Replace the current read-only commercial summary with an editable ROI workspace that preserves the existing editorial decision-desk design.

Required inputs:

- campaigns per month
- hours saved per campaign
- loaded hourly cost
- annual subscription cost
- one-time implementation cost
- budget ceiling

Required behavior:

- Show units, current authoritative values, allowed bounds, and canonical reset values.
- Keep local draft values separate from authoritative room assumptions.
- `Preview calculation` must call `actions.calculateRoi()` with the complete visible draft. It is read-only and must not change room revision or authoritative assumptions.
- Display the complete preview: annual hours, annual labor value, monthly labor value, first-year cost, first-year net value, payback months or honest null state, budget headroom, within-budget result, buyer payback target when approved context exists, whether the preview meets that target, and every formula explanation.
- `Apply reviewed assumptions` must call the UI-only `actions.applyRoiAssumptions()` with the exact previewed input. Do not apply a draft that changed after preview. Require a new preview when any field changes.
- Applying increments revision once, stores exact assumptions and result, persists after reload, and reports changed fields.
- A WebMCP `calculate_roi` call remains read-only and cannot apply assumptions.
- Show bounded field errors without losing the draft.
- Show the zero-value case honestly: payback is not expressible when monthly labor value is zero.
- Show a clear warning when annual subscription exceeds the budget ceiling or payback exceeds the approved buyer target.
- A budget or cost revision after a pending decision proposal must make that proposal stale under the existing revision contract.

Do not describe calculation preview as agent approval or buyer approval. It is a read-only model. Applying assumptions is a visible buyer-owned page action and remains absent from WebMCP.

## 2. Build evidence-safe CFO and CISO brief workspaces

Add two stakeholder brief workspaces on the decision route.

Each editor must expose:

- role, fixed to CFO or CISO
- summary
- evidence citations from the fictional catalog
- risks
- open questions
- recommended next step
- strict character and count limits

Required behavior:

- Save through `actions.saveStakeholderBrief()` only. Both UI and WebMCP use the same action.
- A saved brief renders its exact summary, citations, risks, open questions, next step, saved origin, saved revision, timestamp, and warnings.
- Citation controls must expose stable evidence IDs and readable titles. Reuse the accepted evidence inspector if it improves review, but preserve its body portal and artifact tests.
- Unknown evidence IDs fail atomically.
- A summary, risk statement, or next step that affirmatively describes an unknown, partial, or unsupported requirement as proven must fail atomically with `EVIDENCE_INSUFFICIENT`.
- Open questions may ask whether an unproven requirement can be supported. Do not reject an honest question merely because it contains a proof term.
- Warnings remain warnings, not silent rejection, for expired citations, untrusted citations, and omitted hard blockers.
- Untrusted evidence text must never be interpreted as instructions or copied into a brief automatically.
- Saving one role must preserve the other role.
- Saving a later revision of one role replaces only that role.
- UI saves record `savedBy: ui`; real tool saves record `savedBy: webmcp`.
- Both roles and every field persist after reload.

Add one clearly labeled fictional-demo convenience that fills or saves the canonical honest briefs through the shared action layer. It must not bypass validation. Suggested canonical content can follow the existing full-shim journey, but it must match current room state. If the item 7 review set is incomplete, the convenience must either stop with precise guidance or produce briefs that do not overstate evidence.

The canonical briefs must state:

- CFO: the modelled 11.2 month payback and current costs are based on explicit buyer assumptions, while EU data residency remains a purchase risk.
- CISO: current SOC 2 and SAML evidence are present, SCIM is open, and EU regional processing is unproven.

## 3. Build the staged decision proposal workspace

Turn the baseline decision file into an exact proposal and approval desk.

Proposal editor fields:

- status: `ready`, `ready_with_conditions`, or `not_ready`
- rationale
- supporting requirement IDs
- blocking requirement IDs
- risks
- next step

Required behavior:

- Stage through `actions.proposeDecisionStatus()` only.
- The UI may offer an honest canonical `not_ready` draft based on current room state. It must still call the shared proposal action.
- Derive suggested supporting and blocking IDs from authoritative requirement state. Do not hard-code a ready outcome.
- Preserve strict limits, unique and disjoint ID rules, current-blocker completeness, supported-blocker rejection, and ready blocking.
- A page or browser agent proposal changes only `decisionProposal`; it must not change `approvedDecision`.
- A proposal created through WebMCP must appear immediately in the same visible review desk.
- Show the exact proposal envelope and payload before the person acts: ID, creator origin, base revision, current revision, expiry, digest, status, rationale, supporting and blocking requirements with current statuses, risks, and next step.
- Explain why a pending proposal is approvable or stale without pretending a stale proposal can still be accepted.
- Stage controls are shared-action controls, not human approval controls.

## 4. Preserve the human decision boundary

For a pending proposal, show visible page-only `Approve decision` and `Reject proposal` controls.

- There must be no WebMCP approval or rejection tool.
- Approval calls `actions.approveDecision()` with the exact visible proposal ID.
- Rejection calls `actions.rejectDecision()` with the exact visible proposal ID and a safe page-origin reason if needed.
- Stale, expired, missing, resolved, tampered, or semantically inconsistent proposals fail without mutating room state.
- Approval rechecks blocker consistency and payload digest against current authoritative state.
- Successful approval stores the exact decision payload, approval revision, timestamp, proposal ID, and durable receipt.
- Show receipt ID, kind, proposal ID, payload digest, approved revision, issued timestamp, and safe summary.
- Rejection must preserve any previously approved decision. If no decision was ever approved, say so. If a prior decision exists, say that it remains authoritative.
- A later proposal may coexist with the prior approved decision. Clearly distinguish pending proposal from previously approved authority.
- If room revision advances after a decision was approved, keep the historical approved decision but label it as approved at an earlier revision and requiring re-evaluation. Do not silently present it as current.
- Reset behavior remains the existing domain action and must clear decision proposal and approved decision state.

## 5. Harden decision persistence invariants

Persisted browser state is untrusted. Close the final decision trust gaps while preserving valid schema-version-1 rooms.

### Narrow proposal types

- A buyer-context proposal schema must require `type: buyer_context`.
- A decision proposal schema must require `type: decision`.
- Shape-valid persisted state with a swapped proposal type must fail strict hydration and use the existing visible recovery path.

### Validate approved decision receipts

When `approvedDecision` is present, strict room validation must prove:

- `approvedDecision.receipt.kind` is exactly `decision`.
- Receipt proposal ID is non-null and exactly equals `approvedDecision.proposalId`.
- Receipt input digest equals the stable digest of the approved decision payload fields: status, rationale, supporting IDs, blocking IDs, risks, and next step.
- Receipt revision equals `approvedAtRevision`.
- Receipt revision and `approvedAtRevision` are not greater than room revision.
- Receipt issued timestamp equals the approved timestamp.

Do not require the approved decision payload to remain consistent with the latest requirements after later room mutations. It is a historical approved record. The UI handles staleness by comparing revisions.

Reject present but inconsistent approved-decision persistence. Do not silently repair it. Add focused corruption tests for wrong kind, mismatched proposal ID, future revision, mismatched digest, mismatched timestamp, and swapped proposal type. A valid approved decision must survive reload exactly.

## 6. Decision-route feedback ownership

- ROI, brief, and decision action feedback belongs on the decision route.
- Buyer-context and evaluation errors must not leak into decision controls.
- Decision errors must not appear in buyer-context or evaluation feedback.
- Local decision errors should clear after a successful unrelated room mutation advances revision, without erasing the message produced by the successful local action at that same revision.
- Do not build a global toast system.

## 7. Visual and content requirements

- Continue the accepted warm paper, deep ink, acid green, cobalt, rust, Newsreader, Manrope, and IBM Plex Mono system.
- Keep exactly one H1 on the decision route.
- Do not use an eyebrow-headline-dek stack.
- Do not use purple gradients, glass surfaces, generic KPI cards, excessive pills, or a wall of rounded panels.
- Keep the decision page as an editorial diligence desk: model, briefs, proposal, authority, and receipts should feel like one file, not separate SaaS widgets.
- Preserve the visible fictional-vendor and fictional-buyer disclosures.
- Keep the approved-context rail working and subordinate to the decision task.
- Keep formulas and receipt metadata readable but visually secondary to the decision rationale and blockers.
- All statuses need text or shape in addition to color.
- Respect reduced motion.
- Use no em dash characters.

## Required automated coverage

### Domain and persistence

Cover at minimum:

1. ROI canonical math, bounds, rounding, zero-value null payback, preview read-only behavior, exact apply, changed fields, and reload
2. budget or cost revision makes a pending decision proposal stale
3. brief false-proof rejection across summary, risks, and next step, while an honest open question remains allowed
4. unknown citation rejection, untrusted and expired citation warnings, missing-blocker warnings, role replacement isolation, origin, revision, and reload
5. proposal type narrowing and all approved-decision receipt corruption cases
6. exact approved decision and receipt reload
7. later room changes preserve but mark the approved decision historical in the UI

### Component tests

Cover at minimum:

1. ROI draft, preview, changed-after-preview invalidation, apply, field errors, target and budget warnings, and zero-value state
2. CFO and CISO editor save, replacement, warnings, false claim rejection, citations, and UI origin
3. honest canonical brief convenience through shared actions
4. exact decision proposal review
5. ready proposal refusal with current hard blockers
6. WebMCP-staged proposal appears in the visible page
7. approval, rejection, prior-approved preservation, stale, expired, tampered, missing, and resolved failures
8. exact receipt rendering and historical-revision notice
9. route feedback isolation
10. no approval or rejection tool

### WebMCP shim tests

- Keep exactly nine tools.
- `calculate_roi` remains read-only and returns full explanation.
- `save_stakeholder_brief` saves both roles without overstating evidence.
- `propose_decision_status` stages the canonical not-ready proposal with the exact current hard blockers.
- A ready attempt still fails while blockers exist.
- The tool surface cannot approve, reject, or apply ROI assumptions.
- Real tool mutations must update the visible briefs and proposal projection.

### Canonical Playwright journey

Add one item 8 journey that:

1. starts from reset and applies the item 7 fictional review set through visible controls
2. approves the fictional Meridian context so the buyer payback target is visible
3. edits an ROI input, previews without revision change, applies it, reloads, and verifies exact persistence
4. restores or applies canonical assumptions and confirms 11.2 month payback
5. saves honest CFO and CISO briefs through the page fallback
6. stages the canonical not-ready proposal
7. changes budget after staging and proves approval fails stale without mutation
8. stages a fresh proposal
9. inspects exact proposal, current blockers, and human boundary
10. approves through the visible page control
11. verifies exact approved status, receipt, origin split, persistence after reload, and absence of approval tools
12. records no uncaught page errors, console errors, failed requests, or failed responses
13. asserts one H1 and no horizontal overflow

Add focused rejection and prior-approved preservation journeys if one canonical journey would become too brittle.

### Accessibility and visual evidence

- Extend axe coverage for initial and completed decision states at 390, 768, 1280, and 1600 pixels.
- Test keyboard operation for every ROI field, preview, apply, brief editor, proposal editor, approval, rejection, and receipt inspection control.
- Respect reduced motion.
- Gate screenshot writes behind `UPDATE_VISUAL_AUDIT=1` from the start.
- Add `npm run capture:visual:decision` targeting only the item 8 visual test.
- Capture final current-milestone evidence only in `artifacts/visual-audit/006-decision/`:
  - initial decision desk at 1600 and 390
  - edited ROI preview at 1600 and 390
  - canonical not-ready proposal before approval at 1600 and 390
  - approved not-ready decision and receipt at 1600 and 390
- Add a README with exact dimensions and the state each capture proves.
- Normal `npm run test:e2e` must never write into item 5, item 6, item 7, or item 8 artifact directories.

## Required verification

Run all of the following after implementation and the intentional item 8 capture run:

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

Also confirm:

- exactly nine WebMCP tools remain registered
- no decision approval, rejection, or ROI-apply tool exists
- UI and WebMCP use the same ROI calculation, brief save, and decision proposal actions
- normal E2E produces identical hashes for every artifact file before and after
- no direct decision or ROI persistence writer was added outside shared actions
- no `dangerouslySetInnerHTML` or manual requirement-status writer was added
- no em dash character exists in changed text
- no credential-like value or real customer data was added
- no accepted historical artifact changed

## Required report

Return:

1. What changed in the buyer journey.
2. Exact files changed.
3. How ROI preview and apply preserve the human boundary.
4. Brief validation, citation, origin, replacement, and warning evidence.
5. Exact proposal and approval behavior, including all blocker and stale cases.
6. Persistence hardening and corruption-test evidence.
7. Exact canonical commercial values, brief state, proposal blockers, approved status, and receipt.
8. Feedback-isolation evidence.
9. Every verification command with pass or fail and exact counts.
10. Visual artifact list, dimensions, and manual observations at 1600 and 390.
11. Artifact hash proof across final normal E2E.
12. Remaining item 8 risks or one concrete blocker.

## Stop condition

Stop after checklist item 8 is implemented and every required command passes, or after reporting one concrete blocker with attempted fixes and exact output. Do not broaden scope.
