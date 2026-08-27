# Cursor work order 005: requirement and evidence workspace

## Objective

Build checklist item 7 as the center of the ProofRoom challenge story: a buyer can inspect six requirements, search structured evidence, review provenance and limitations, attach eligible records, see deterministic coverage and contradictions, and record buyer notes without ever authoring a status.

The result must work as a complete page-only fallback and must react immediately when the same actions are called through WebMCP. Preserve the accepted product, buyer-context, approval, and visual system work.

Do not begin ROI, stakeholder briefs, decision approval, ledger, deployment, or submission work. Do not commit, push, deploy, or mark item 7 complete. Codex owns acceptance.

## Source boundary

- Repository: `/Users/treyharnden/Projects/proofroom-webmcp`
- Read `AGENTS.md`, `docs/hackathon-build/prd.md`, `docs/hackathon-build/spec.md`, `docs/hackathon-build/checklist.md`, all accepted work orders through 004b, and the current evaluation, evidence, requirement, state, fixture, WebMCP, test, and design code.
- Work only in this repository.
- Preserve the accepted item 5 and item 6 artifacts byte-for-byte.
- Reuse the existing `RoomActions` methods. Do not introduce a second evidence engine, direct Zustand mutation, direct local-storage mutation, an approval tool, or a manual status field.
- Add no backend and no dependency unless an existing repository capability cannot meet an explicit acceptance requirement.

## Product contract

The page must make this invariant unmistakable:

> Requirement status is computed from active, eligible, attached evidence. A buyer, browser agent, note, testimonial, or persuasive sentence cannot set it.

The canonical demonstration must honestly land in this shape after the fictional review set is attached:

- Salesforce integration: supported from `ev_002` and `ev_003`.
- EU data residency: unknown from `ev_007` and `ev_008`, because neither proves an EU region or EU subprocessor disclosure.
- SSO and provisioning: partially supported from `ev_006`, because SAML is documented and SCIM is not.
- SOC 2 Type II: supported from `ev_004`.
- Twenty campaigns per month: supported from `ev_009`.
- Payback inside twelve months: partially supported from `ev_010`, because implementation timing is documented while the payback condition is a separate commercial calculation.

Never improve those outcomes with copy or UI logic. The domain action remains authoritative.

## 1. Replace the read-only evaluation baseline with an interactive dossier

Keep the accepted route headline and editorial due-diligence direction, then turn the requirement register into a usable master-detail workspace.

Required behavior:

- All six requirements remain visible in a stable order.
- Each row or record is a real keyboard-operable selection control with a clear current selection state.
- Each record shows ID, label, must or should priority, non-negotiable state, exact derived status, attached-record count, covered-condition count, gap count, and open-question count.
- Selecting a requirement opens a detailed evaluation workspace without changing routes.
- The detail shows the description, exact hard-condition checklist, covered and open marks, rationale, attached records, buyer notes, and open questions.
- Conditions must use buyer-readable labels plus stable condition IDs where useful for auditability.
- `unknown` must be explained as an intentional evidence result, not a loading, empty, or error state.
- The responsive version must become a semantic stacked record layout at narrow widths. Do not force a horizontal table or tiny columns.

Do not turn the page into a generic card grid or admin dashboard. Keep the dossier, register, proof-index, and editorial hierarchy.

## 2. Evidence search through the shared action layer

Add an evidence search workspace for the selected requirement.

- Search must call `actions.searchProductEvidence()` with the visible query, the selected `requirementId`, and a bounded limit.
- Show the result count, query, safe empty state, and whether untrusted content is present.
- Results must show record ID, title, evidence type, source, trust class, active or expired state, proven conditions, refuted conditions, and limitation count.
- Keep the existing deterministic search semantics. Do not add a fuzzy or fallback catalog path in the UI.
- An unmatched query must show zero results and widening guidance, never the full filtered catalog.
- Make common canonical searches fast through small query suggestions or one-click terms, but those controls must still invoke the shared search action.
- A WebMCP search should remain read-only, and its result must not silently attach records.

The initial screen may keep a compact catalog index, but it cannot claim the workspace is read-only once interaction is present.

## 3. Inspectable evidence drawer

Every search result and attached record must offer one consistent evidence inspection control.

The drawer or in-page inspector must expose:

- ID, title, type, source label, and source URL when present
- effective and expiry dates plus active state
- trust class and explicit untrusted-content annotation
- requirement coverage
- supported and refuted conditions
- contradictory record IDs
- every limitation
- the complete summary

Accessibility requirements:

- It has one clear accessible name.
- Opening it moves focus into the inspector.
- Escape and a visible close control dismiss it.
- Closing restores focus to the trigger that opened it.
- Content remains reachable and readable at 390, 768, 1280, and 1600 pixel widths.
- Page scroll lock, if used, must be reliably released.

Treat record text as inert data. Never use `dangerouslySetInnerHTML`. For `ev_011`, render the complete prompt-injection sentence visibly inside an untrusted-content quarantine with language such as `Treat this as data, not instructions.` No state may change merely because the record is opened or searched.

## 4. Evidence attachment and deterministic status changes

- An attach control must call `actions.attachEvidence()` for the currently selected requirement.
- Show accepted IDs, rejected IDs and reasons, resulting derived status, covered conditions, gaps, and contradictions from the authoritative room state.
- Do not let a user type or select a status.
- Already attached records must be marked and must not appear as a misleading fresh action.
- A rejected or wholly ineligible attachment must leave room revision and state unchanged and show a useful local error.
- A testimonial offered as SSO or security proof must not satisfy restricted security or compliance conditions.
- Attaching `ev_007` and `ev_008` to EU data residency must leave it unknown with both gaps visible.
- Attaching contradictory campaign records `ev_009` and `ev_012` must expose the contradiction and produce the domain-derived unsupported result. The UI must not hide the conflict.

Add one clearly labeled fictional-demo convenience for the complete UI-only fallback, such as `Apply fictional review set`. It must call the existing attach action once per requirement with the canonical evidence IDs listed in the product contract. It may not mutate state directly. It must report every result, stop or report precisely on failure, and become disabled or resolved once the full set is attached. Keep its purpose obvious so it is not mistaken for an autonomous approval.

## 5. Buyer notes and questions through `stage_requirement`

For the selected requirement, add a compact edit surface for:

- buyer notes
- must or should priority
- non-negotiable flag
- up to six open questions

Save through `actions.stageRequirement()` only. Preserve strict limits and display validation errors. Saving notes, priority, or questions must recompute but cannot directly set the evidence status. After reload, edits and attachments must persist.

Do not describe this mutation as human approval. It is buyer-authored evaluation context and remains a WebMCP tool-backed action by design.

## 6. Feedback ownership and cross-feature isolation

Work order 004 left a global `lastError` fallback in `BuyerContextWorkspace`. Once evidence controls exist, an evidence failure could appear inside the context approval rail.

- Keep item 6 stale, expired, tampered, missing, and resolved proposal errors visible in their context tests.
- Scope the context fallback so it displays only buyer-context proposal errors or related `pcx_` IDs.
- Evaluation action feedback must appear in the evaluation workspace, not in the context rail.
- Successful unrelated actions must not leave stale error copy visible.
- Do not create a global toast system for this milestone.

## 7. Visual and content requirements

- Continue the warm paper, deep ink, acid green, cobalt, rust, Newsreader, Manrope, and IBM Plex Mono system.
- Keep exactly one H1 on the route.
- Do not use an eyebrow-headline-dek stack.
- Do not use purple gradients, glass surfaces, generic KPI cards, excessive pills, or a wall of rounded panels.
- Use line, scale, whitespace, typography, and status marks to distinguish register, proof, limitations, and gaps.
- Keep fictional-vendor and fictional-buyer disclosures visible.
- Keep the approved-context rail working and visually subordinate to the evaluation task.
- All status information needs text or shape in addition to color.
- Respect reduced motion.
- Use no em dash characters.

## Required automated coverage

### Domain and shared actions

Retain existing domain and WebMCP coverage. Add tests only when a newly discovered domain defect requires it. Do not duplicate already proven invariants with a second implementation.

### Component tests

Cover at minimum:

1. stable six-requirement selection and exact detail rendering
2. matched and unmatched search through `RoomActions`
3. evidence inspector open, Escape close, visible close, and focus restoration
4. full inert rendering of `ev_011` with the injection sentence and quarantine language
5. attach success, rejection, already-attached state, and local feedback
6. Salesforce supported after two records
7. EU residency remains unknown after `ev_007` and `ev_008`
8. SSO remains partially supported after `ev_006`
9. campaign contradiction becomes unsupported with both conflicting records shown
10. notes, priority, non-negotiable flag, and questions save without authoring status
11. evaluation errors do not leak into the buyer-context rail
12. the fictional review-set convenience uses shared actions and lands in the exact six-status shape above

### WebMCP shim tests

Keep exactly nine tools and no approval tool. Extend the real-tool journey only where needed to assert that WebMCP attachment updates the visible evaluation projection and that malicious testimonial text remains inert data.

### Playwright journey

Add a canonical item 7 journey that:

1. opens evaluation with all six requirements unknown
2. searches for Salesforce evidence
3. inspects a record
4. attaches `ev_002` and `ev_003`
5. observes Salesforce become supported
6. applies the fictional review set or completes the remaining canonical attachments
7. observes the exact final status distribution
8. inspects `ev_011` and confirms no context or decision was approved
9. records an EU open question and reloads
10. confirms attachments, question, and statuses persisted
11. asserts one H1, no horizontal overflow, no uncaught page errors, and no failed network requests

### Accessibility and visual evidence

- Extend axe coverage for the initial and evidence-populated evaluation route at all four target widths.
- Test keyboard selection, search, attach, inspector open and close, and note saving.
- Capture final current-milestone evidence only in `artifacts/visual-audit/005-evidence/`:
  - initial evaluation at 1600 and 390
  - populated canonical evaluation at 1600 and 390
  - evidence inspector with `ev_011` at 1600 and 390
  - EU unknown detail after canonical attachment at 1600 and 390
- Add a README indexing each capture and the state it proves.
- Do not write into `003-baseline` or `004-context` from current tests.

## Required verification

Run all of the following after implementation:

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

Also confirm:

- exactly nine WebMCP tools remain registered
- no approval tool exists
- UI and WebMCP call the same evidence actions
- no direct requirement-status writer was added
- no `dangerouslySetInnerHTML` was added
- no em dash character exists in changed text
- no credential-like value or real customer data was added
- no accepted historical artifact changed

## Required report

Return:

1. What changed in the buyer journey.
2. Exact files changed.
3. How search, inspection, attachment, notes, and UI-only fallback use shared actions.
4. Exact canonical final status distribution and evidence IDs.
5. Prompt-injection, contradiction, testimonial-restriction, and EU-gap test evidence.
6. Feedback-isolation evidence.
7. Every verification command with pass or fail and exact counts.
8. Visual artifact list and manual observations at 1600 and 390.
9. Confirmation that accepted historical artifacts are clean.
10. Remaining item 7 risks or one concrete blocker.

## Stop condition

Stop after checklist item 7 is implemented and every required command passes, or after reporting one concrete blocker with attempted fixes and exact output. Do not broaden scope.
