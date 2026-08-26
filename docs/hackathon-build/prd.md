# Product Requirements Document

## Product Summary

ProofRoom is a fictional B2B vendor site and buyer evaluation room. It turns product research into a visible human-agent collaboration. The browser agent can read structured state, search evidence, stage evaluation work, calculate ROI, and draft stakeholder briefs. The person approves shared buyer context and final decision state through visible controls that are not exposed as agent tools.

## Target User

### Primary user

A B2B software buyer using an AI browser agent to evaluate whether a vendor meets commercial, technical, security, and operational requirements.

### Canonical scenario

Meridian Bank is a 1,000-person fintech evaluating Northstar, a fictional campaign operations platform. The buyer requires Salesforce integration, EU data residency, SSO, SOC 2 Type II, support for 20 campaigns per month, and payback within 12 months.

## Core User Journey

1. The user lands on a polished Northstar product site.
2. The page shows that WebMCP tools are available or explains the fallback state.
3. The browser agent reads the room state.
4. The agent proposes a buyer context using only the fields in the prompt.
5. The page shows a visible proposal with exact shared fields.
6. The user approves the context.
7. The product page transforms to emphasize the relevant capabilities, evidence, and open security gap.
8. The agent creates or updates the six requirements.
9. The agent searches evidence and attaches eligible records.
10. Deterministic evaluation rules assign supported, partial, unsupported, or unknown status.
11. The agent calculates ROI from visible assumptions.
12. The agent saves CFO and CISO briefs.
13. The user changes the budget ceiling and hard requirement state.
14. The agent proposes a revised decision.
15. The user inspects the decision, evidence, assumptions, and activity ledger.
16. The user approves or rejects the decision proposal.

## Epics And User Stories

### Epic 1: Understand the product without an agent

#### Story 1.1: Read the baseline product experience

As a buyer, I want a credible product page before I use an agent so that ProofRoom is a real web product rather than an agent-only control panel.

Acceptance criteria:

- The first view starts with one primary headline and no eyebrow-headline-dek stack.
- The page identifies the fictional product and its primary value without real-company claims.
- The page includes capability, integration, security, proof, packaging, and implementation sections.
- The page labels all companies and evidence as fictional demo content.
- Primary navigation moves between Product, Evaluation, and Decision surfaces.
- The page remains fully usable when `document.modelContext` is absent.

#### Story 1.2: See WebMCP availability

As a buyer, I want to know whether agent tools are active so that I understand how to interact with the page.

Acceptance criteria:

- The UI shows `available`, `registered`, `unavailable`, or `error` state.
- Unsupported browsers see useful guidance and retain all UI controls.
- Registration errors expose a safe summary without raw stack traces.
- A development-only tool inspector can list registered tool names through the test shim.

### Epic 2: Control buyer context

#### Story 2.1: Stage buyer context

As a browser agent, I want to propose company context so that the page can prepare relevant personalization without silently changing authoritative buyer state.

Acceptance criteria:

- The proposal supports company name, industry, employee band, personas, priorities, hard requirements, budget ceiling, and payback target.
- Inputs are length-limited and reject unknown keys.
- Creating a proposal does not personalize the authoritative product view.
- The page displays the exact proposal, proposal ID, base revision, and expiry.
- The activity ledger records the staged mutation.

#### Story 2.2: Approve or reject context

As a buyer, I want to approve or reject the context in the visible page so that the agent cannot decide what personal information becomes authoritative.

Acceptance criteria:

- Approval and rejection are UI-only actions.
- WebMCP exposes no context-approval tool.
- Approval fails safely if the proposal is stale, expired, invalid, or already resolved.
- Successful approval increments the state revision and records an activity event.
- Rejection leaves authoritative buyer context unchanged.

#### Story 2.3: Personalize the page meaningfully

As a buyer, I want the product page to emphasize what matters to me so that personalization is more than replacing names.

Acceptance criteria:

- Approved context reorders at least three content regions.
- Relevant capability, security, and evidence blocks receive clear emphasis.
- The EU residency gap remains visible.
- The approved context summary remains accessible from every surface.
- Reduced-motion users receive an immediate state change without large animation.

### Epic 3: Evaluate requirements with evidence

#### Story 3.1: View and manage six requirements

As a buyer, I want a requirements matrix so that I can see priority, status, rationale, evidence, and gaps in one place.

Acceptance criteria:

- The canonical reset produces exactly six requirements.
- Each row shows priority, hard or flexible condition, status, evidence count, limitation count, and open question count.
- Status colors are never the only signal.
- The matrix supports keyboard navigation and readable mobile stacking.
- Empty evidence and unknown state look intentional.

#### Story 3.2: Search the evidence catalog

As a browser agent, I want to search structured product evidence so that I can find candidate support without scraping the visible page.

Acceptance criteria:

- Search supports query text, evidence type, requirement tag, and trust class.
- Search returns stable IDs, titles, summaries, coverage tags, limitations, dates, and trust annotations.
- External and testimonial text is returned with untrusted-content annotation.
- Search never mutates room state.
- Results are capped and deterministic.

#### Story 3.3: Attach eligible evidence

As a browser agent, I want to attach evidence to a requirement so that the evaluation can cite exact records.

Acceptance criteria:

- The tool validates requirement and evidence IDs.
- Duplicate relationships do not create duplicate state.
- Expired or disallowed evidence cannot support a requirement.
- Attachment increments revision and records affected IDs.
- The UI shows exact claims, limitations, dates, and trust class.

#### Story 3.4: Enforce evidence-backed status

As a buyer, I want status to follow deterministic evidence rules so that agent rationale cannot turn unknown claims into facts.

Acceptance criteria:

- `supported` requires active evidence covering every hard condition.
- `partially_supported` names covered conditions and gaps.
- `unsupported` requires an explicit limitation or contradiction.
- `unknown` remains the default when evidence is insufficient.
- EU data residency remains unknown in the canonical fixture.
- A request to mark EU residency supported without evidence returns a structured failure and leaves state unchanged.

### Epic 4: Understand commercial value

#### Story 4.1: Edit ROI assumptions

As a buyer, I want visible assumptions so that I can challenge the financial model.

Acceptance criteria:

- Inputs include campaigns per month, hours per campaign, loaded hourly cost, annual subscription, implementation cost, and budget ceiling.
- Each input has units, valid bounds, and a reset value.
- The model calculates annual hours saved, annual labor value, first-year net value, and payback months.
- The formula is deterministic and documented in the UI and repository.
- No conversion-rate or revenue uplift claim is included in the MVP.

#### Story 4.2: Recalculate through WebMCP

As a browser agent, I want to calculate ROI using explicit assumptions so that I can update the decision after the buyer changes inputs.

Acceptance criteria:

- Invalid or out-of-range assumptions return field errors.
- The calculation tool is read-only and does not silently replace UI assumptions.
- A UI control can apply the calculated assumption set after user review.
- Results use consistent currency and rounding.

### Epic 5: Create stakeholder briefs

#### Story 5.1: Save CFO and CISO briefs

As a browser agent, I want to stage stakeholder-specific briefs so that the buyer can review the commercial and security case separately.

Acceptance criteria:

- Only CFO and CISO roles are accepted.
- Each brief contains summary, evidence IDs, risks, open questions, and recommended next step.
- Brief text has strict character limits.
- Unknown requirements cannot be described as supported.
- Saving a brief records the origin, affected role, and revision.
- The user can edit a brief through UI controls.

### Epic 6: Preserve human decision authority

#### Story 6.1: Propose decision status

As a browser agent, I want to propose a decision so that I can synthesize the evaluation without becoming the final authority.

Acceptance criteria:

- Allowed statuses are `ready`, `ready_with_conditions`, and `not_ready`.
- The proposal includes rationale, supporting requirement IDs, blocking requirement IDs, risks, and next step.
- A `must` requirement or any non-negotiable requirement prevents a `ready` proposal unless its status is exactly `supported`.
- Supporting and blocking requirement IDs are unique and disjoint.
- A supported requirement cannot be listed as blocking.
- A conditional or not-ready proposal lists every current hard blocker.
- Creating a proposal does not change approved decision state.
- The proposal records base revision and expiry.

#### Story 6.2: Approve or reject decision

As a buyer, I want to approve or reject the proposal in the page so that the final decision remains mine.

Acceptance criteria:

- Approval and rejection are UI-only actions.
- Stale, expired, or invalid proposals fail without mutation.
- The exact proposal remains visible before approval.
- Successful approval records a receipt and state revision.
- Reset clears all proposal and approval state.

### Epic 7: Inspect agent and human actions

#### Story 7.1: View the activity ledger

As a buyer or judge, I want an honest activity ledger so that I can see what the agent read, staged, and changed.

Acceptance criteria:

- Events are created only by the shared domain action layer.
- Each event shows origin, action, safe input summary, result, revisions, affected IDs, annotations, and timestamp.
- The ledger never stores raw sensitive buyer fields.
- Filters support origin and read versus mutate.
- Reset recreates only the canonical system events.

### Epic 8: Reset and recover

#### Story 8.1: Reset the canonical demo

As a judge, I want one reset action so that I can reproduce the intended evaluation from a known state.

Acceptance criteria:

- Reset requires one confirmation inside the app.
- Reset restores the exact fixture and schema version.
- Reload after reset preserves fixture parity.
- A corrupted or incompatible persisted state falls back to the fixture and records a safe recovery notice.

#### Story 8.2: Recover from errors

As a buyer, I want clear error states so that tool or validation failures do not strand the demo.

Acceptance criteria:

- Domain failures return typed error codes and field-safe messages.
- No failed action partially mutates state.
- The UI can dismiss errors without losing work.
- The canonical demo remains recoverable by reset.

## Edge Cases

- WebMCP is unavailable.
- One or more tool registrations reject.
- A tool sends unknown keys.
- A tool sends oversized text.
- A proposal becomes stale before approval.
- Evidence expires or contradicts another record.
- A requirement has evidence but not enough to cover all hard conditions.
- Persisted state uses an older schema version.
- Local storage is unavailable or full.
- A user prefers reduced motion.
- The viewport is narrow.
- The activity ledger contains many events.
- Malicious instructions appear inside testimonial evidence.

## What We Would Add With More Time

- Shareable server-backed rooms
- Role-based collaboration
- Multiple vendor comparison
- Vendor clarification drafts and approved sending
- Imported evidence packs
- Signed decision receipts
- Buyer-agent analytics

## Submission Proof Points

- Nine discoverable WebMCP tools with narrow schemas
- Shared action layer used by UI and agent tools
- Two deliberately human-only approval controls
- Evidence invariant that blocks unsupported claims
- Untrusted-content and read-only annotations
- Twelve-case WebMCP eval manifest
- Canonical agent journey and UI-only fallback journey
- Public Cloudflare URL and public MIT repository
- Release receipt with commit, deployment, headers, tests, and public verification
