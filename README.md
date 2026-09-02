# ProofRoom

ProofRoom is a browser-based B2B evaluation room where a WebMCP-connected agent can research,
prepare, and stage a buying decision in visible, validated state, but only the person can approve
buyer context and the final decision. The agent can work the room; it cannot become the buyer.

[Open the verified public baseline](https://proofroom-webmcp.harnden-trey.workers.dev) ·
[Browse the repository](https://github.com/0xTrey/proofroom-webmcp)

The live URL above is the verified public baseline until the current local candidate is deployed.

| Proof dimension | State |
| --- | --- |
| Verified public baseline | Deployed on Cloudflare Workers. 423 unit and component, 38 end-to-end, 48 accessibility, 12 deterministic evals passed. Does not include the landing page, room guide, plain-language, provenance, or current gallery work. |
| Current local candidate | Dirty working tree. 483 unit and component, 45 end-to-end, 52 accessibility, 12 deterministic cases with 60 assertions. Not committed, pushed, deployed, or reflected in Devpost. |
| Devpost | Authenticated project `1402028` remains Untitled, empty, `submission_pre_draft`. No video and no submission. |
| Live natural-language agent | `not_run`. Native Chrome baseline evidence proves discovery and direct tool execution only. |

## Current local candidate judge path

This path uses the local preview at `http://localhost:5173/`. It becomes the public judge path only
after authorized deployment and public parity verification. The verified public baseline does not
yet include this landing flow.

The visible UI is the fastest path and works even when WebMCP is unavailable. Expect the room guide
within the first 12 seconds.

1. **Start on the landing page.** Open `/`, read the plain-language explanation, and select
   `Open the fictional review`. Outcome: you enter the review room with the three-step guide visible.
2. **Set buyer context.** Select `Review the sample buyer profile`, then `Use this buyer profile`.
   Outcome: the fictional Meridian Bank profile becomes the approved context the room uses.
3. **Check evidence.** Select `Check evidence`, then `Run the sample evidence check`. Compare
   supported Salesforce integration with unknown EU data residency. Open `ev_011` and confirm the
   untrusted quarantine. Outcome: open gaps stay visible instead of becoming conclusions.
4. **Reach a human-approved decision.** Select `Review decision`, `Preview calculation`,
   `Prepare the sample not-ready recommendation`, `Prepare recommendation`, then
   `Approve recommendation`. Outcome: the honest not-ready recommendation carries a visible buyer
   approval receipt and activity record.

For the native WebMCP path, use headed Chrome with the experimental feature flags. The native
verifier discovers the tools from real `document.modelContext`, executes `get_room_state` and
`propose_buyer_context`, checks reload persistence, and uses no test shim.

## What the room makes visible

These frames come from the current local candidate gallery. They are not public deployment proof.

![Landing page explaining the buyer problem, fictional EU residency example, and three-step path to human approval.](artifacts/visual-audit/016-submission-gallery/01-landing-hero-1600.png)

Caption: ProofRoom opens on a plain-language landing page that explains the buyer problem, shows a
fictional EU data residency example, and makes the three-step path from priorities to human approval
visible before the review begins.

![Untrusted evidence quarantine around fictional testimonial ev_011.](artifacts/visual-audit/016-submission-gallery/02-untrusted-evidence-1600.png)

Caption: ProofRoom displays the fictional testimonial's instruction-styled sentence inside an
untrusted-content quarantine. The record remains inspectable data and cannot approve context, change
requirement status, or approve a decision.

![Human-approved decision receipt with activity register totals.](artifacts/visual-audit/016-submission-gallery/03-approved-decision-1600.png)

Caption: The approved decision receipt identifies the proposal, payload digest, revision, timestamp,
and safe summary. The activity totals show a human-approved decision plus one deterministic
registered WebMCP `get_room_state` read recorded in the shared activity history. This is a scripted
local browser-shim proof, not a live natural-language agent run.

## Why a buying team would care

- Unsupported vendor claims stay open rather than becoming conclusions.
- Security and commercial review share one source-backed room instead of separate narratives.
- Assumptions, gaps, and the decision trail stay inspectable in the visible state.
- An agent can reduce research and preparation work without taking the two decisions reserved for
  the person.

## Why WebMCP is in the critical path

Without WebMCP, a browser agent can only scrape page prose and narrate a recommendation somewhere
else. The buyer cannot see which evidence supports the answer or which gaps remain open.

With WebMCP, the agent calls narrow page-owned tools that update the same visible, validated room
the buyer reviews. Every tool input passes strict schemas, failed actions are atomic, and successful
mutations append real activity events. The UI and WebMCP tools share `RoomActions`, so both paths
use the same validation, revision rules, persistence, and activity ledger. Approval remains absent
from the tool registry by design.

## Human-agent trust boundary

The agent can stage buyer context and a decision proposal. Only the person can:

1. Approve or reject staged buyer context.
2. Approve or reject a staged decision.

Those controls exist only in the visible UI. There is no approval WebMCP tool. A proposal carries a
base revision, expiry, and browser-local input digest; stale, expired, invalid, or resolved proposals
fail without changing state. The digest protects demo-state integrity and stale approvals. It does
not prove identity or carry legal meaning.

## The exact nine WebMCP tools

| Tool | Boundary | Result |
| --- | --- | --- |
| `get_room_state` | Read only; never returns the activity ledger | Revision, context summary, requirement totals, blockers, ROI, briefs, proposals, next actions |
| `search_product_evidence` | Read only; results may contain untrusted content | Searches 12 records by query, type, requirement tag, and trust class |
| `evaluate_requirement` | Read-only calculation; cannot set status | Proposed status, coverage, gaps, contradictions, eligible evidence |
| `calculate_roi` | Read-only calculation; cannot apply assumptions | Hours saved, labor value, first-year net value, payback, budget comparison |
| `propose_buyer_context` | Stages only; cannot approve or personalize authoritative state | Reviewable buyer-context proposal with revision, digest, and expiry |
| `stage_requirement` | Mutates notes and priority; cannot set status | Buyer notes, priority, non-negotiable state, and open questions |
| `attach_evidence` | Recomputes status; rejects expired or ineligible records | One to six evidence relationships plus derived coverage |
| `save_stakeholder_brief` | Rejects evidence overstatement atomically | CFO or CISO brief with citations, risks, questions, and next step |
| `propose_decision_status` | Stages only; cannot approve | `ready`, `ready_with_conditions`, or `not_ready` proposal with blockers |

The four read tools carry `readOnlyHint`. `search_product_evidence` also carries
`untrustedContentHint`. Registry tests prove that approval, rejection, reset, recovery, ROI apply,
and direct status-authoring tools do not exist.

## Evidence rules the domain enforces

- `supported` requires active, eligible evidence for every hard condition.
- Testimonial evidence cannot prove a security or compliance condition.
- Expired or unrelated evidence cannot support a requirement.
- A brief that calls an unproven requirement proven is rejected, and nothing is saved.
- Every `must` or non-negotiable requirement must be exactly `supported` for `ready`.
- Decision proposals reject duplicate or overlapping IDs, supported blockers, and omitted hard
  blockers.
- Every failed action is atomic. Every successful mutation increments the revision exactly once and
  appends exactly one activity event.

EU data residency is deliberately honest. The fictional hosting note lists North American regions,
and the fictional subprocessor register does not state processing locations. Even with both records
attached, the two hard conditions remain open and the requirement stays `unknown`.

## Architecture and repository map

```text
browser agent -> WebMCP strict input schema -> tool adapter
  -> RoomActions -> invariant validation -> atomic state update
  -> revision and activity event -> structured result -> visible React update

visible UI control -> RoomActions -> the same invariant and receipt path
```

Dependencies flow in one direction:

| Path | Responsibility |
| --- | --- |
| [`src/fixtures`](src/fixtures) | Fictional vendor, buyer, six requirements, 12 evidence records, canonical room |
| [`src/domain`](src/domain) | Types, strict schemas, errors, evidence rules, ROI, digests, receipts, actions |
| [`src/state`](src/state) | Zustand store, browser-local persistence, migration, recovery, selectors |
| [`src/webmcp`](src/webmcp) | DOM declarations, schemas, nine definitions, registration, status, test shim |
| [`src/features`](src/features) | Product, context, evaluation, ROI, briefs, decision, ledger surfaces |
| [`src/app`](src/app) and [`src/components`](src/components) | Shell, routes, navigation, shared presentation |

React components and WebMCP callbacks do not contain product mutations. `RoomActions` is the only
mutation boundary, and requirement status has one evidence-driven writer.

## Run it locally

Requirements: Node 22.12 or newer and npm.

```bash
nvm use 22
npm ci
npm run dev
```

Open `http://localhost:5173/` for the landing route. Deep links `#product`, `#evaluation`, and
`#decision` remain supported but are not the default starting point. The complete UI path remains
available without WebMCP. Playwright needs `npx playwright install chromium` before its first run.

Full local QA:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run test:a11y
npm run evals
npm run build
```

Native headed Chrome verification against the public release:

```bash
PROOFROOM_BASE_URL="https://proofroom-webmcp.harnden-trey.workers.dev" \
npm run verify:webmcp:chrome
```

Public HTTP and browser verification:

```bash
PROOFROOM_BASE_URL="https://proofroom-webmcp.harnden-trey.workers.dev" npm run verify:public
PROOFROOM_BASE_URL="https://proofroom-webmcp.harnden-trey.workers.dev" npm run test:public
```

Deployment is a separate external mutation that requires an authenticated Cloudflare account:

```bash
npm run deploy
```

The local QA and verification commands above are reproducible checks. The deployment command is an
intentional external mutation and is not part of ordinary local QA. These commands do not replace
the committed production evidence described next. See the
[release runbook](docs/release-runbook.md) for lifecycle boundaries.

## Verified public baseline

The release receipt records deployment commit
`82ee322b4e4e8c8658e8eed605431974d084afca` and Cloudflare deployment version
`86b01690-7492-4a37-ae70-3c71d50f43c7`. Git history establishes final evidence commit
`cb51518c545b8f498f9938e2054e729a60abb328`. These identifiers describe the deployed public build
only. They do not cover the landing page, room guide, plain-language work, staging-template
provenance changes, or current gallery work in the current local candidate.

Verified public baseline results:

- 423 unit and component tests passed.
- 38 end-to-end tests passed.
- 48 accessibility checks passed.
- 12 deterministic evals passed.
- Headed Chrome `151.0.7922.174` discovered exactly nine tools before and after reload through real
  `document.modelContext`, with no WebMCP shim.
- Native execution ran `get_room_state` and `propose_buyer_context`. Revision moved from 0 to 1, and
  the pending proposal persisted across reload.
- Application errors were zero across console, page, request, and response checks.
- Chrome emitted two strict-CSP WebMCP testing registration notices, one during initial registration
  and one after reload. The verifier classified them as browser diagnostics using exact phase,
  source, entry-integrity, CSP, execution, and count checks. They are not concealed as application
  success.
- Live natural-language browser-agent selection remains `not_run`.

## Current local candidate

The dirty working tree passed local QA with these counts:

- 483 unit and component tests passed.
- 45 end-to-end tests passed.
- 52 accessibility checks passed.
- 12 deterministic eval cases passed with 60 assertions.

This candidate is not committed, pushed, deployed, or reflected in Devpost. Public verification
does not cover the current landing, room guide, plain-language, provenance, or current gallery work.

Deep evidence:

- [Verified release receipt](artifacts/release/release-receipt.json)
- [Native WebMCP receipt](artifacts/release/native-webmcp.json)
- [Release evidence contract](artifacts/release/README.md)

## Demo and challenge package

The [submission-package index](docs/submission/README.md) maps the local story, rehearsal, capture,
image-selection, and launch-state documents. Start with the
[timed demo script](docs/submission/demo-script.md) for the 2:35 to 2:45 recording path.

## Limitations, disclosure, and license

- Everything named in this repository is fictional demo content. Northstar, Meridian Bank,
  Larkfield Mutual, Ridgeline Research, and every product, compliance, and testimonial claim are
  fictional.
- State lives in local browser storage. There is no account, database, multi-user room, or shared
  backend.
- The application itself makes no model API call. Intelligence comes from the browser agent.
- WebMCP is experimental and environment-dependent. The page reports unavailable and registration
  error states while preserving every visible UI control.
- Evaluation covers the fixed 12-record catalog. There is no arbitrary evidence ingestion.
- Live natural-language browser-agent selection remains `not_run`.

ProofRoom was built for the [OpenAI WebMCP Challenge](https://openai.com/webmcp-challenge/) hosted on
[Devpost](https://webmcp.devpost.com/). Submission documents in this repository are local
preparation only. Authenticated Devpost project `1402028` exists as an Untitled, empty pre-draft
shell. It has no video and has not been submitted. The repository has no local Devpost
journey-state file.

Released under the [MIT License](LICENSE).
