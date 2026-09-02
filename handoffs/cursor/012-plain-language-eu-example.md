# Cursor work order 012: make ProofRoom obvious

## Objective

Rebuild ProofRoom's explanation and visible application language so a first-time visitor can
understand the product without knowing procurement, AI-agent, or WebMCP terminology.

The user opened the current experience and said: `I dont understand what this is/does.` That is a
real comprehension failure. It overrides the previous internal 95/100 acceptance score. Do not
defend the current copy or make small synonym swaps. Make the product concrete.

The experience must teach one complete example:

> A buying team asks, "Does this software keep our data in the EU?" The agent checks the available
> vendor records. Those records mention North American hosting but do not prove EU processing. The
> answer remains Unknown. The agent prepares a not-ready recommendation, and a person decides what
> happens next.

This is a presentation, information-architecture, visible-copy, and test pass. Preserve every
accepted domain, evidence, state, persistence, WebMCP, and human-approval invariant.

Do not commit, push, deploy, publish, alter Cloudflare, add a database, or change any external
state.

## Repository and starting state

Work only in:

`/Users/treyharnden/Projects/proofroom-webmcp`

The current uncommitted working tree is the accepted starting point from work orders 011 and 011a.
Preserve all of it. Do not reset, clean, restore, or overwrite unrelated changes.

Read before editing:

- `AGENTS.md`
- `handoffs/cursor/011-landing-field-systems-app.md`
- `handoffs/cursor/011a-mobile-guide-truth-corrections.md`
- `research/landing-app-autoresearch/autoresearch.md`
- `/Users/treyharnden/Projects/ElevationEngine/TREY_VOICE.md`, read-only
- current `src/app/LandingPage.tsx`
- current `src/app/AppShell.tsx`
- current `src/app/RoomGuide.tsx`
- current `src/app/roomGuideState.ts`
- current `src/app/routes.ts`
- current presentation files under `src/features/**`
- current styles under `src/design/**`
- current component, end-to-end, accessibility, and public tests that reference visible copy

Do not edit `artifacts/brand-lab/**`. It is an unrelated untracked reference directory.

## Plain-language product definition

Use this as the source of truth:

> ProofRoom is a workspace for teams buying business software. It compares the team's requirements
> with the vendor's documents, shows what each document actually proves, and keeps missing answers
> visible. An AI browser agent can do the research and prepare a recommendation. A person approves
> the buying priorities and makes the final decision.

The product is not:

- an autonomous buyer
- a chatbot
- a vendor marketing page
- a legal certification or attestation service
- a live multi-user procurement platform
- a database of real customer records
- a system that contacts vendors or purchases software

## Comprehension gate

A visitor who reads only the first viewport must be able to answer all five questions:

1. Who is this for? A team evaluating business software.
2. What does it do? It checks vendor claims against the team's requirements and source records.
3. What is the example? Whether the fictional product keeps customer data in the EU.
4. What is the result? Unknown, because the available records do not prove EU processing.
5. Who decides? The agent prepares the work, but a person approves priorities and the final call.

Do not require the visitor to understand any of these words in order to answer those questions:

- WebMCP
- buyer context
- canonical
- deterministic
- authoritative
- stage or staged
- dossier
- structured action
- artifact
- payload
- proposal envelope
- diligence file

Technical terms may remain in secondary developer details, immutable IDs, receipt metadata, tool
names, schemas, and error codes. When a technical term must be visible, first explain it with
ordinary language.

## Writing rules

- Lead with the buying problem, not the technology.
- Use short sentences and common words.
- Give one idea to each paragraph or section.
- Prefer concrete nouns and actions: vendor, requirement, document, claim, proof, gap, review,
  approve.
- Use `AI browser agent` on first reference and `agent` after that.
- Explain `Unknown` as `not proven by the available records`, never as system uncertainty.
- Do not claim that missing proof means the vendor fails the requirement.
- Keep exact domain statuses available where they matter, but pair them with plain language.
- Never use an em dash.
- Never use an eyebrow-headline-dek stack.
- Do not add invented metrics, customer names, quotes, or claims.
- Keep Northstar, Meridian Bank, and all records visibly fictional.

## 1. Replace the landing hero with a concrete buying problem

The primary `h1` must be:

`Check a software vendor's claims before you buy.`

Immediately explain the category and outcome in body copy. Use this meaning, with minor edits only
if required for layout:

> ProofRoom is a workspace for teams buying business software. It compares your requirements with
> the vendor's documents, then shows what is proven, contradicted, or still missing.

> An AI browser agent can do the research and prepare a recommendation. You approve the priorities
> and make the final call.

Use one primary CTA:

`Open the fictional review`

The CTA must still enter `#product` and must not mutate room state, persistence, revision, ledger,
evidence, proposals, briefs, or approvals.

Use a lower-priority in-page link:

`See the EU data example`

Do not put tool counts, requirements counts, or WebMCP terminology ahead of the product definition.
Counts may remain as secondary data after the example.

## 2. Make the EU data question the visual centerpiece

Place a compact worked example in or immediately adjacent to the landing hero so it is visible in
the initial desktop viewport and follows directly after the definition on mobile.

The example must communicate these four facts in this order:

1. `Buying question`
   `Does this product keep our customer data in the EU?`
2. `What the agent found`
   `The available records name North American hosting regions. They do not include an EU processing commitment.`
3. `Answer`
   `Unknown: not proven by the available records.`
4. `Next step`
   `Ask the vendor for an EU region commitment before approving the purchase.`

This is fictional demo content. Label it as such without overwhelming the example.

Use the existing Field Systems visual language: square geometry, crisp rules, dark ink, mint for
verified system state, rust for gaps, Black Ops One display use, and IBM Plex Mono for control or
data labels. Do not turn this into a generic SaaS card grid. Do not use color as the only status
signal.

## 3. Rewrite the workflow around the buyer's actual job

Use these four plain-language steps on the landing page and in the room guide:

1. `Set the buying priorities`
   `Confirm the budget, payback target, and requirements that matter to the team.`
2. `Check the vendor's evidence`
   `The agent matches source records to each buying requirement.`
3. `Review the missing answers`
   `See what is proven, partly proven, contradicted, or still unknown.`
4. `Make the final decision`
   `Review the recommendation and approve or reject it yourself.`

Use this direct workflow heading:

`The agent prepares the review. You make the decision.`

Preserve the truthful guide-state logic from 011a. A brief or pending recommendation must never
prove that a person reviewed anything. Do not add guide state to the domain or persistence layer.

## 4. Simplify agent and person authority

The authority section must use concrete actions.

Agent can:

- search the available vendor records
- match records to buying requirements
- calculate the labor-based business case
- prepare finance and security summaries
- prepare a recommendation for review

Only a person can:

- approve which buying priorities guide the review
- change the approved assumptions or requirements
- approve or reject the final recommendation

Keep the existing explicit boundary that the agent cannot accept terms, send data, contact a
vendor, buy anything, or approve either human gate.

Move WebMCP explanation below the main product and example narrative. Use this order:

1. `Browser agent status`
2. `A compatible AI browser can use ProofRoom's nine built-in actions. If it cannot, every task still works through the buttons on this page.`
3. A short secondary sentence may name WebMCP.

## 5. Rename the main application path

Keep the underlying route IDs and hashes unchanged. Change only visible labels and purpose text.

Use these navigation labels:

- `#product`: `Set priorities`
- `#evaluation`: `Check evidence`
- `#decision`: `Review decision`

Update the visible route purposes to match the actual task in plain language.

Change the masthead descriptor from `Field decision system` to:

`Software buying workspace`

Replace `structured agent actions` in the room status strip with:

`browser-agent actions`

Keep the exact nine-tool count and status honest.

## 6. Make the first app screen explain what to do

Rewrite the Product surface so it starts with the buyer's task, not Northstar's product pitch.

Use this `h1`:

`Start with what Meridian Bank needs.`

Use supporting body copy with this meaning:

> Meridian Bank is considering the fictional Northstar platform. Before checking the vendor's
> claims, confirm the budget, payback target, and six requirements that should guide the review.

The buyer-profile control must appear early and use plain language:

- `No buyer profile is approved yet.`
- `Approve the priorities that should guide this review.`
- Button: `Review the sample buyer profile`
- Review heading: `Use these buying priorities?`
- Primary approval: `Use this buyer profile`
- Rejection: `Reject this buyer profile`

Keep the action semantics, person-only approval, proposal lifecycle, receipts, revision checks,
expiry checks, digests, and domain field names unchanged. Visible receipts may keep exact technical
metadata in a collapsed or secondary region.

Simplify the product page sections:

- `Open the diligence file` to `See the proof behind the pitch`
- `9 agent tools` to `9 browser-agent actions`
- `Research, calculate, and stage work` to `Find proof, test fit, and prepare a recommendation`
- `2 human boundaries` to `2 decisions only you can make`
- `6 requirements, 12 records` to `6 buying questions checked against 12 records`
- `The product claim and the proof record stay separate.` to `A vendor claim is not proof.`
- `Packaging is legible before the buying work begins.` to `See price and implementation details before deciding.`

Do not change fixture values or vendor claims.

## 7. Make the evidence screen start with the example

Use this `h1`:

`Check six buying requirements against the vendor's evidence.`

Use body copy with this meaning:

> Every answer starts as Unknown. A requirement changes only when an eligible source record proves
> or contradicts it.

On first load of the Evaluation route, select `req_eu_residency` as the visible requirement when it
exists. This is presentation state only. It must not attach evidence, change status, write storage,
increment revision, or add a ledger event.

Use these plain-language labels:

- `Your buying questions and the proof`
- `Run the sample evidence check`
- `The sample check attaches the demo records. It does not approve a profile or decision.`
- `What the evidence must prove` instead of `Exact hard-condition checklist`
- `Why this answer` instead of `Deterministic rationale`
- `Records used for this answer` instead of `Attached evidence record`
- `Your notes and follow-up questions` instead of `Buyer notes and open questions`
- `Search the available records` instead of `Search the structured proof index`
- `Full source record` instead of `Complete summary`

Where the UI displays a requirement status, preserve the canonical status label and add a concise
meaning nearby:

- Supported: every required condition is proven by eligible records.
- Partial: some conditions are proven, but at least one is still open.
- Unknown: no eligible record proves the required conditions yet.
- Unsupported: an eligible record directly contradicts a required condition.

Do not allow a testimonial, note, person, or agent to set requirement status.

## 8. Make the decision screen read like a decision

Use this `h1`:

`Review the recommendation, then make the final call.`

Use body copy with this meaning:

> The agent can prepare the business case, summarize the evidence, and identify blockers. Only you
> can approve or reject the recommendation.

Use these section names and labels:

- `Check the business case` instead of `Commercial model`
- `Numbers currently used in this review` instead of `Applied room result`
- `Preview the calculation`
- `Use these reviewed numbers` instead of `Apply reviewed assumptions`
- `Reset sample values` instead of `Reset to canonical`
- `Briefs for finance and security` instead of `Stakeholder briefs`
- `Fill the honest sample draft` instead of `Fill canonical honest ... draft`
- `Recommendation prepared for your review` instead of `Staged proposal`
- `No recommendation prepared yet` instead of `No proposal staged`
- `Edit a recommendation` instead of `Stage a proposal`
- `Prepare recommendation` instead of `Stage proposal`
- `Edit recommendation` instead of `Open proposal editor`
- `Prepare the sample not-ready recommendation` instead of `Fill canonical not-ready draft`
- `Approve recommendation` instead of `Approve decision`
- `Reject recommendation` instead of `Reject proposal`

Internal variables, statuses, IDs, action names, schemas, and receipts must remain unchanged. A
plain-language label may wrap an exact status, but do not rename the domain value.

## 9. Keep technical audit detail secondary

The activity ledger, receipt IDs, revisions, digests, timestamps, origin, and tool names are valid
proof. They should remain available, but their headings and helper copy must first say why a buyer
would inspect them.

Examples:

- `Activity history` before `authoritative activity register`
- `See who changed what, when it changed, and whether the action came from a person or agent.`
- `Technical receipt details` for IDs, digests, revisions, and timestamps

Do not remove audit data. Do not change stored event names, tool names, receipt values, or origin
classification.

## 10. Preserve fixed trust and architecture contracts

These are non-negotiable:

- exactly nine WebMCP tools
- exactly two person-only approval gates
- no WebMCP approval or rejection tool
- `RoomActions` remains the only room mutation boundary
- no direct presentation writes to Zustand
- six canonical requirements and twelve evidence records
- EU data residency remains unknown after the sample review
- testimonials cannot prove security or compliance
- requirement status remains derived only from active, eligible, attached evidence
- browser-local persistence and deterministic reset remain unchanged
- one ledger event per successful action remains unchanged
- no mutation from landing navigation, direct hashes, guide navigation, initial EU selection, or
  explanation controls
- every task works through visible UI controls when agent actions are unavailable
- direct `#product`, `#evaluation`, and `#decision` links remain functional
- browser Back and Forward remain functional
- one `h1` on every route
- no external calls, remote fonts, telemetry, authentication, database, model API, or chat

Do not change source under:

- `src/domain/**`
- `src/state/**`
- `src/webmcp/**`
- `src/fixtures/**`
- `evals/**`
- `scripts/**`
- deployment, release, or submission files
- `artifacts/brand-lab/**`

## Allowed edit boundary

You may edit:

- `src/app/**`
- presentation-only files under `src/features/**`
- `src/components/StatusMark.tsx` only if needed for plain-language display labels
- `src/design/**`
- focused tests under `tests/components/**`, `tests/e2e/**`, `tests/accessibility/**`, and
  `tests/public/**`
- this work order's follow-up report, if you create one under `handoffs/cursor/**`

Do not add dependencies.

## Required tests

Add or strengthen tests that prove:

1. The landing page contains `software vendor`, `teams buying business software`, the exact EU
   question, the exact Unknown explanation, the next step, and the person-only final decision.
2. The landing primary CTA enters `#product` without any room mutation or local-storage write.
3. Product, Evaluation, and Decision use the new plain-language navigation and `h1` labels.
4. Evaluation initially displays EU data residency without changing state.
5. Running the sample evidence check leaves EU residency Unknown and exposes why.
6. The complete visible UI journey still reaches person-only buyer-profile approval and final
   recommendation approval.
7. No agent tool can approve either human gate.
8. Direct hashes, Back and Forward, reset, recovery, persistence, one-`h1`, no-overflow, keyboard
   focus, reduced motion, and mobile task targeting still work.
9. The page remains usable when `document.modelContext` is unavailable.
10. No prohibited technical phrase appears in the primary landing definition, workflow, guide,
    route labels, or main task headings.

Update tests for intentional copy changes. Do not weaken behavior, state, evidence, approval, or
security assertions just to make tests pass.

## Visual verification

Inspect production-build screenshots at:

- 390 by 844 for `/`, `/#product`, `/#evaluation`, and `/#decision`
- 1440 by 1000 for `/`, `/#product`, `/#evaluation`, and `/#decision`

Confirm:

- the first landing viewport explains the category and shows the EU example
- the app `h1` remains visible in the first mobile viewport
- no horizontal overflow
- no clipped CTA or status text
- focus indicators remain visible
- the example is not a generic card grid
- the existing Field Systems identity remains coherent
- no eyebrow-headline-dek stack appears

If screenshot capture is blocked, rely on explicit Playwright geometry assertions and report the
blocker. Do not claim a visual pass without evidence.

## Verification commands

Run targeted tests while editing. Before reporting, run:

```text
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run test:a11y
npm run evals
npm run build
npm run check:bundle
git diff --check
git status --short
```

Also report whether the optional live natural-language browser-agent check ran. Do not count it as
passed if it did not run.

## Required report

Return:

1. The new first-viewport product explanation.
2. The complete EU data-residency example as rendered.
3. Every main navigation, guide, page-heading, section-heading, and CTA change.
4. The visible terms intentionally retained for technical accuracy.
5. Exact files changed in this pass.
6. Exact tests added or updated.
7. Exact command results with pass and fail counts.
8. Screenshot paths and viewport sizes, or one named capture blocker.
9. Proof that the fixed trust and architecture contracts are unchanged.
10. Residual risks or one named blocker.
11. Confirmation that no commit, push, deployment, publication, or external mutation occurred.

## Stop condition

Stop when the landing page tells the full EU example, every primary app path uses ordinary buying
language, the sample journey remains truthful and fully usable, and all required local gates pass.
If one blocker remains after one focused repair attempt, preserve the diagnostics and report it.
Do not broaden scope or change external state.
