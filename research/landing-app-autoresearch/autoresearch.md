# Autoresearch: ProofRoom landing-to-app experience

Started: 2026-08-27
Runs: 3 | Best score: 95/100 | Status: kept

## Experiment target

Turn the released ProofRoom experience into one coherent Field Systems product with two clear
states: an explanatory landing page and a fully usable buyer decision room. A new visitor should
understand the product, the agent's role, the person's authority, and the first action within 15
seconds. Entering or leaving the landing page must not mutate room state or change the nine-tool
WebMCP contract.

## Fixed product constraints

- Preserve the current domain model, `RoomActions` boundary, six requirements, twelve evidence
  records, nine WebMCP tools, two person-only approvals, and browser-local persistence.
- Keep Northstar, Meridian Bank, and every evidence record explicitly fictional.
- Keep EU data residency unknown until eligible evidence proves it.
- Keep direct links to `#product`, `#evaluation`, and `#decision` working.
- Do not add a database, authentication, application-side model, chat interface, or external call.
- Do not commit, push, deploy, or publish during this research loop.
- Never use an em dash or an eyebrow-headline-dek stack.

## Custom rubric

### First-glance comprehension (0-25)

- 0-10: The visitor must infer the product from internal labels or WebMCP jargon.
- 11-17: The audience and workflow are present, but roles or value remain abstract.
- 18-22: The page directly explains what ProofRoom does, who it is for, and the four-step flow.
- 23-25: A first-time visitor can accurately explain the product, agent role, person-only role,
  and decision outcome within 15 seconds.

### Guided usability and time-to-first-value (0-25)

- 0-10: The user lands inside a dense workspace without a next step.
- 11-17: Navigation exists, but labels and workflow require product knowledge.
- 18-22: Landing-to-room entry, action-led navigation, first-run guidance, and recovery are clear.
- 23-25: A keyboard or pointer user can enter, identify the next action, complete the UI-only
  journey, return to the explanation, and resume without confusion or accidental state changes.

### Trust boundary and evidence honesty (0-25)

- 0-10: The interface blurs agent authority, human approval, or evidence confidence.
- 11-17: Boundaries are documented but not obvious at decision points.
- 18-22: Agent actions, person-only approvals, fictional content, local storage, and unknown status
  are visible in plain language.
- 23-25: Every important action makes authority and consequence obvious, and automated tests prove
  that landing navigation cannot mutate the room, add tools, or bypass person-only approvals.

### Visual coherence and accessibility (0-25)

- 0-10: Generic SaaS styling, inconsistent branding, inaccessible states, or broken mobile layout.
- 11-17: A recognizable direction exists but the landing page and workspace feel separate.
- 18-22: One Field Systems system spans landing and app, with readable type, square geometry,
  semantic mint and rust, visible focus, reduced motion, and target-width support.
- 23-25: The identity is distinctive and disciplined across every surface, while automated and
  visual QA pass at 390, 768, 1280, and 1600 pixels without color-only meaning or overflow.

## Mutation strategies

- `baseline-current-release`
- `landing-information-architecture`
- `landing-to-room-transition`
- `action-led-navigation-language`
- `first-run-room-guidance`
- `agent-person-authority-map`
- `field-systems-visual-unification`
- `evidence-status-translation`
- `mobile-keyboard-task-flow`
- `empty-error-recovery-clarity`

## Current best
Strategy: mobile-keyboard-task-flow
Score: 95/100
Summary: Compressed mobile room chrome, added an accessible four-step disclosure and a task-targeting next action, corrected guide semantics so proposals and briefs cannot prove human review, repaired dark-panel contrast, and passed the full independent QA matrix. Brand gate: pass. Evidence gate: ready.


## History

| Run | Score | Status | Strategy |
|-----|-------|--------|----------|
| 1   | 73    | baseline   | baseline-current-release |
| 2   | 90    | kept   | landing-information-architecture |
| 3   | 95    | kept   | mobile-keyboard-task-flow |
