# Cursor work order 013: build the judge runway

## Objective

Make ProofRoom understandable in the first 15 seconds and make its WebMCP path easy for a judge to
try without weakening the normal buyer experience.

The current local build already explains the product in plain language. Preserve that work. This
pass adds two missing connections:

1. a compact visual chain that shows how buyer requirements become an evidence-backed,
   human-approved decision
2. a secondary rehearsal panel with one exact natural-language prompt for a compatible AI browser

This is a presentation, documentation, and test change. It must not change the domain model,
fixtures, room state, persistence, tool count, tool schemas, approval rules, routes, or deployment.

Do not commit, push, deploy, publish, update Devpost, record a live-agent pass, add dependencies, or
change external state.

## Why this work order exists

Independent contest review found a strong implementation but two judge-visible gaps:

- WebMCP Leverage is difficult to see until late in the journey.
- The repository honestly records natural-language browser-agent selection as `not_run`, but the
  product does not give a judge a short, safe prompt to try it.

The official challenge prioritizes working, non-trivial WebMCP use, a coherent product, real impact,
and a novel concept. The latest host announcement also asks projects to show the product working in
the first 10 to 15 seconds.

## Repository and starting state

Work only in:

`/Users/treyharnden/Projects/proofroom-webmcp`

The uncommitted working tree is the accepted starting point from work orders 011, 011a, 012, and
012a. Preserve all existing changes. Do not reset, clean, restore, or overwrite unrelated work.

Read completely before editing:

- `AGENTS.md`
- `docs/hackathon-build/scope.md`
- `docs/hackathon-build/prd.md`
- `docs/hackathon-build/spec.md`
- `docs/hackathon-build/checklist.md`
- `docs/hackathon-build/eval-qa.md`
- `handoffs/cursor/012-plain-language-eu-example.md`
- `handoffs/cursor/012a-plain-language-mobile-corrections.md`
- `research/landing-app-autoresearch/autoresearch.md`
- `/Users/treyharnden/Projects/ElevationEngine/TREY_VOICE.md`, read-only
- current target source and test files listed below

Do not edit `artifacts/brand-lab/**`.

## Non-negotiable product contract

- Exactly nine WebMCP tools remain registered.
- Buyer-profile approval and final-decision approval remain person-only UI actions.
- The agent cannot approve, reject, contact a vendor, accept terms, send data, purchase anything,
  or turn missing proof into a supported claim.
- EU data residency remains `Unknown: not proven by the available records.`
- Northstar, Meridian Bank, and every record remain visibly fictional.
- Every task remains usable through normal page controls when WebMCP is unavailable.
- The landing CTA and rehearsal panel must not mutate room state, revision, persistence, the ledger,
  evidence, proposals, briefs, or approvals.
- Do not claim that a real natural-language agent run passed. It has not been run.
- Never use an em dash.
- Never use an eyebrow-headline-dek stack.

## 1. Add a compact decision chain to the landing hero

Add one presentational ordered strip within the landing hero. It must be visible in the initial
desktop viewport and follow the product definition on mobile.

Use these three nodes and this exact meaning:

1. `Set priorities`
   `The buyer chooses what matters.`
2. `Check evidence`
   `The agent matches claims to source records.`
3. `Approve the decision`
   `Only the person can make it final.`

The strip should read visually as:

`Buyer requirements -> eligible evidence -> human-approved decision`

Requirements:

- Use semantic ordered-list markup with an accessible label.
- Keep the existing Field Systems palette, square geometry, rules, and typography.
- Use text and shape in addition to color.
- Keep the existing EU worked example and primary CTA visually dominant.
- Do not introduce a new headline above the existing H1.
- At 390 pixels, the strip must stack or scroll naturally without horizontal page overflow.
- This is explanatory UI only. It must have no click handler and no domain or storage effect.

## 2. Echo the decision chain in the room guide

Add one concise, presentational line to the room guide summary:

`Priorities -> evidence -> person decides`

The line should orient the buyer without increasing mobile chrome materially. At 390 pixels, keep it
inside the compact guide summary and do not restore any copy intentionally hidden by work order
012a.

Do not change `deriveRoomGuideState`, guide completion rules, route targets, persistence, or domain
state. A brief or pending recommendation still must not count as proof of human review.

## 3. Add a secondary agent rehearsal panel

Add a single accessible `<details>` panel after the browser-agent status section on the landing
page. The closed summary is:

`Try the browser-agent path`

The panel must stay visually secondary to the product definition, EU example, and primary CTA.

Inside the panel, explain in ordinary language:

- A compatible AI browser can discover ProofRoom's nine built-in WebMCP actions.
- The prompt asks the agent to read state, inspect evidence, and prepare work for review.
- The agent must stop at the person-only approval boundary.
- If the browser does not support WebMCP, the same review remains usable through page controls.

Show this exact prompt in a selectable block:

> Evaluate Northstar for Meridian Bank, a 1,000-person fintech that needs bidirectional Salesforce
> integration, EU data residency, SAML single sign-on, a current SOC 2 Type II report, 20 campaigns
> per month, and payback inside 12 months. Read the room and available evidence, then prepare the
> buyer profile for review. Do not approve the buyer profile or a final decision. Stop when a person
> must review.

Show the expected safe checkpoint in four short steps:

1. Read the current room.
2. Search and evaluate the vendor evidence.
3. Prepare the buyer profile for review.
4. Stop for the person to approve or reject it.

Do not promise an exact model-selected tool sequence. Do not say the live rehearsal passed. Do not
add a page-owned chatbot, model call, automation runner, or fake agent animation.

## 4. Add a truthful local rehearsal guide

Create:

`docs/submission/live-agent-rehearsal.md`

The guide must contain:

- the exact prompt above
- browser prerequisites
- the canonical reset requirement
- the expected safe checkpoint
- the nine expected discoverable tool names, derived from the current source of truth
- the two actions that must remain absent from WebMCP
- a compact evidence-capture table with browser or agent version, public URL, commit or build ID,
  timestamp, observed tool sequence, visible state change, reload result, and evidence path
- an explicit distinction among deterministic evals, direct native browser execution, and genuine
  natural-language agent selection
- the command `npm run evals:live:validate`
- a warning that `verified` is valid only after all twelve manifest cases have real records and the
  validator passes

Do not edit `evals/live-agent/current.json` in this work order.

## Target files

Expected product files:

- `src/app/LandingPage.tsx`
- `src/app/RoomGuide.tsx`
- `src/design/landing.css`
- `src/design/room-guide.css`

Expected tests:

- `tests/components/landingPage.test.tsx`
- `tests/components/roomGuide.test.tsx`
- the smallest existing end-to-end or accessibility files needed to prove the new interaction

New documentation:

- `docs/submission/live-agent-rehearsal.md`

Do not edit domain, state, fixtures, WebMCP definitions, eval manifests, deployment files, release
receipts, or Devpost state.

## Acceptance gates

### Product and copy

- The first desktop viewport contains the existing product definition, EU example, primary CTA,
  and all three decision-chain nodes without clipping.
- The first mobile flow preserves the same comprehension order without horizontal overflow.
- There is one H1 and no eyebrow-headline-dek stack.
- The rehearsal panel is keyboard accessible with native details behavior.
- Opening or closing the rehearsal panel does not alter room revision, local persistence, activity
  events, route, or approvals.
- The page states that the agent prepares work and the person approves it.
- The page never claims natural-language selection has passed.

### Tests

- Component tests assert all three decision nodes, the exact prompt, the person-only stop, and the
  unchanged primary CTA target.
- Room-guide tests prove the new orientation line renders while guide state derivation remains
  unchanged.
- End-to-end coverage opens and closes the rehearsal panel with the keyboard and verifies no room
  state or route change.
- Accessibility coverage includes the new details panel and decision-chain semantics.
- Exact-nine-tool and absent-approval tests remain unchanged and pass.

Run and report exact results for:

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
```

If the full matrix is too slow during implementation, use targeted tests first, then run the full
matrix before reporting completion.

### Visual evidence

Capture fresh desktop and 390-pixel landing screenshots in a new run-specific subdirectory under
`artifacts/visual-audit/013-judge-runway/`. Do not overwrite accepted 012 artifacts.

Report:

- viewport size
- full-page dimensions
- whether the decision chain is visible in the first viewport
- whether the EU example and CTA remain visible
- horizontal overflow result
- any console or page errors

## Cursor completion report

Return this exact structure and stop:

1. `Summary`
2. `Files changed`
3. `Behavior preserved`
4. `Tests and exact counts`
5. `Visual evidence`
6. `Known limitations or not_run items`
7. `Git status`
8. `Recommendation: ready for Codex audit` or `blocked`

Do not start another work order. Codex will independently inspect the diff, run acceptance tests,
apply the brand gate, score the autoresearch mutation, and decide whether to keep or revert it.
