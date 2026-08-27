# Cursor work order 004: context approval and meaningful personalization

## Objective

Complete checklist item 6. Build the first full human-agent collaboration loop: a browser agent or person stages exact Meridian Bank buyer context, the page keeps it nonauthoritative until a visible human approval, and approval meaningfully transforms the Northstar product story while preserving every evidence gap.

This milestone is limited to buyer context, proposal review, approval and rejection, approved-context visibility, and product personalization. Do not begin requirement editing, evidence search or attachment controls, ROI editing, stakeholder brief creation, decision approval, ledger controls, reset controls, deployment, or submission packaging.

## Source boundary

- Repository: `/Users/treyharnden/Projects/proofroom-webmcp`
- Read `AGENTS.md`, the accepted `docs/hackathon-build/{prd,spec,checklist,build-notes}.md`, `docs/research/proofroom-plan-v4-trust-contract.md`, and work orders 003 through 003b before editing.
- Work only in this repository.
- Reuse the existing Zod schemas, fixtures, `RoomActions`, Zustand store, persistence adapter, receipts, activity events, WebMCP tool, and test shim.
- Do not weaken an invariant or create a second mutation path inside a React component.
- Do not add a backend, Neon, app-side model call, external data, tracking service, or new dependency unless the accepted stack cannot satisfy an explicit requirement.
- Do not commit, push, or deploy. Codex owns milestone acceptance and release actions.

## Trust contract

The staged proposal is a claim awaiting the person, not approved buyer truth.

- `propose_buyer_context` may stage exact fields but cannot approve them.
- Page controls may stage the canonical demo draft as the complete UI-only fallback.
- Only visible page controls may approve or reject a pending context proposal.
- Staging alone must not alter personalized headline copy, content ordering, emphasis, recommended packaging, approved-context rail, or ROI target.
- Approval must call the shared `roomActions.approveBuyerContext` action and display its real receipt.
- Rejection must call the shared rejection action and leave the previously authoritative context unchanged.
- Stale, expired, tampered, missing, and already-resolved proposals must fail without mutation and surface a safe, actionable message in the page.
- No approval function, hidden shortcut, query parameter, or debug control may be registered as a WebMCP tool.

## Required interaction

### Entry and UI-only fallback

Add a prominent context control that remains accessible from Product, Evaluation, and Decision.

- In reset state, it explains that buyer details are not yet shared.
- It offers a clearly labeled UI control to stage the canonical fictional Meridian Bank draft through `roomActions.proposeBuyerContext` with UI origin.
- It also reflects a proposal staged through the WebMCP shim without requiring a refresh.
- Do not make a user retype the fixture. The point is approval authority, not form-entry labor.

### Exact proposal review

Render every proposed field before approval:

- company name
- industry
- employee band
- all personas
- all priorities
- all hard requirements
- budget ceiling
- payback target
- proposal ID
- base revision
- current room revision
- expiry
- digest
- creator origin
- pending status

Use the existing editorial dossier language and visual system. The proposal review can be an in-flow panel, drawer, or dialog, but it must be semantic, keyboard operable, mobile legible, and impossible to confuse with approved context. Focus behavior must be correct if an overlay is used.

### Human decision and feedback

- Provide distinct `Approve buyer context` and `Reject proposal` controls only when the proposal is pending.
- On approval, render the actual receipt ID, proposal ID, digest, applied revision, timestamp, and safe summary.
- On rejection, show the resolved rejected state and explain that no authoritative buyer context was changed.
- Show action success or failure through a polite live region. Do not rely on a toast that disappears.
- Disable or remove controls after resolution. Double approval and double rejection must not silently succeed.

### Approved-context rail

After approval, add a compact, persistent buyer-context rail on all three routes. It must show Meridian Bank, industry, personas, budget ceiling, payback target, and a link or control to inspect the full approved context and receipt. Before approval, the rail must clearly say no buyer context is approved.

## Meaningful product transformation

Approval must change the product surface in at least three substantive regions. Use deterministic derivation from `approvedBuyerContext`; do not copy a second personalized fixture into component state.

1. **Opening story:** change the primary story to the approved buyer and its highest priorities. Keep Northstar claims grounded in existing vendor copy and clearly label the context as buyer-approved. Do not invent a security, compliance, residency, or ROI claim.
2. **Capability ledger:** reorder and visibly emphasize capabilities that map to the buyer's hard requirements and priorities. Salesforce and SAML-relevant capabilities should rise ahead of generic capabilities. Explain why an item was prioritized.
3. **Proof desk:** reorder evidence around the buyer's hard requirements and expose the exact requirement relationship. The EU hosting note must remain visible as a gap, with explicit language that the catalog does not prove EU residency.
4. **Commercial sheet:** order or emphasize the package that fits the approved buyer's requirements and budget. Enterprise may be presented as the evaluation candidate because it contains SAML and is under the fictional $120,000 ceiling, but it must not be called approved, purchased, or recommended by evidence.

At least three of the four regions above must have clear before and after differences that a judge can identify in screenshots and DOM assertions. Prefer all four if the resulting page remains concise.

Do not hide, collapse, dim beyond readability, or remove contradictory or unknown evidence during personalization. The EU residency requirement must still be `unknown`, and the product page must say why.

## Motion, responsive behavior, and accessibility

- Use one restrained transition to explain that approved context has been applied. Avoid celebratory or distracting effects.
- Under `prefers-reduced-motion: reduce`, state changes must be immediate with no transforms or opacity animation.
- Support 390, 768, 1280, and 1600 pixel widths without horizontal page overflow.
- Keep one `h1` per route and a logical heading outline.
- Maintain visible focus, 44 pixel practical targets, text alternatives, and status signals beyond color.
- Serious and critical axe violations must remain zero on all three routes at all four target widths, both before and after approval where practical.

## Automated verification

Add focused unit and component coverage for:

- reset state displays no approved context
- UI fallback stages the exact canonical draft without personalizing
- WebMCP shim stages the proposal and exposes no approval tool
- proposal review renders every field and envelope value
- UI approval applies authoritative context and shows the real receipt
- UI rejection leaves approved context unchanged
- stale, resolved, and invalid approval failures are visible and atomic
- approved-context rail appears on Product, Evaluation, and Decision
- personalization is derived from approved state and not pending state
- capability, evidence, and packaging ordering is deterministic
- EU residency remains unknown and visibly unresolved after approval
- persisted approved context survives reload

Add or extend Playwright coverage for two journeys:

1. UI-only staging, exact review, approval, three-region transformation, route-to-route context rail, reload persistence, and EU gap visibility.
2. Stage and reject, proving that authoritative context and baseline ordering do not change.

Use the WebMCP test shim in a test that stages the proposal, then approve only through the rendered UI. Assert that the registry has no `approve_buyer_context` tool.

Run:

```text
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:a11y
npm run evals
```

## Visual evidence

Capture deterministic before and after Product screenshots at 390 and 1600 pixels and approved-context rail screenshots for Evaluation and Decision at 390 and 1600 pixels. Store them under:

`artifacts/visual-audit/004-context/`

Add an audit `README.md` mapping state, route, and viewport. Include concise notes naming the three or four transformations and the still-visible EU gap.

## Required report

Return:

1. What changed and how the trust boundary is visible.
2. Exact files changed.
3. The before and after behavior for every personalized region.
4. Every verification command with pass or fail and exact counts.
5. Screenshot paths.
6. Confirmation that no approval tool exists in the WebMCP registry.
7. Any residual usability, accessibility, state, or copy risk.
8. Recommended next work order, without beginning item 7.

## Stop condition

Stop when checklist item 6 and the full verification and artifact matrix pass, or after reporting one concrete blocker with attempted fixes and exact output. Do not broaden the milestone.
