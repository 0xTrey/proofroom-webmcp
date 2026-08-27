# ProofRoom

ProofRoom turns B2B product research into a visible decision workflow: a browser agent can inspect
structured evidence and stage work through WebMCP, while the buyer alone decides which context and
final decision become authoritative.

[Open the live demo](https://proofroom-webmcp.harnden-trey.workers.dev) ·
[Browse the public repository](https://github.com/0xTrey/proofroom-webmcp)

| Proof | Verified state |
| --- | --- |
| Live release | Public on Cloudflare Workers |
| WebMCP surface | Exactly 9 native tools |
| Human authority | 2 UI-only approvals |
| Automated verification | 423 unit and component, 38 end-to-end, 48 accessibility checks |
| Deterministic evals | 12 passed |
| License | [MIT](LICENSE) |

## Judge path in 60 to 90 seconds

The visible UI is the fastest path and works even when WebMCP is unavailable.

1. Open the [live Product surface](https://proofroom-webmcp.harnden-trey.workers.dev/#product).
   Confirm the fictional-data notice, the WebMCP availability state, and the product story.
2. Select `Stage fictional Meridian Bank draft`. Review every proposed field, then select
   `Approve buyer context`. The page reorders product, evidence, and package content only after this
   visible approval.
3. Open `Evaluation`, select `Apply fictional review set`, and compare a supported requirement with
   EU data residency. EU residency stays `unknown` because the catalog does not prove it.
4. Open `Decision`. Inspect the ROI assumptions, create the honest CFO and CISO briefs, stage the
   canonical `not ready` proposal, and approve it in the page. Finish at the decision receipt and
   activity register.

For the native WebMCP path, use headed Chrome with the experimental feature flags. The native
verifier discovers the tools from real `document.modelContext`, executes `get_room_state` and
`propose_buyer_context`, checks reload persistence, and uses no test shim. Live natural-language
browser-agent selection has not been run and is not part of the passed evidence.

## What the room makes visible

![A quarantined fictional testimonial is displayed as untrusted data, including its instruction-styled sentence.](artifacts/visual-audit/005-evidence/evidence-inspector-ev-011-1600.png)

Caption: The evidence inspector keeps testimonial text visible but marks it as data, not
instructions. It cannot approve context, change status, or approve a decision.

![The commercial model shows an edited ROI preview and an above-budget warning before assumptions are applied.](artifacts/visual-audit/006-decision/roi-preview-1600.png)

Caption: ROI is deterministic and reviewable. A calculation preview does not silently replace the
room's assumptions.

![The approved decision receipt shows the proposal and approval metadata.](artifacts/visual-audit/006-decision/approved-receipt-1600.png)

Caption: The final receipt records the buyer's visible approval after the agent or UI stages a
decision proposal.

## The problem, and why WebMCP matters

Most B2B sites scatter product claims, security facts, pricing assumptions, and customer proof across
pages and documents. An agent has to scrape prose, guess at authority, and return a conclusion that
the buyer cannot inspect as shared state.

WebMCP changes the interaction model inside the live page. ProofRoom exposes narrow, typed actions
for reading state, searching evidence, calculating ROI, and staging changes. The UI and WebMCP tools
call the same domain actions, so both paths use the same validation, revision rules, persistence,
and activity ledger. The agent works on the room instead of narrating around it.

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

Open `http://localhost:5173/#product`. The complete UI path remains available without WebMCP.
Playwright needs `npx playwright install chromium` before its first run.

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

## Verified production evidence

The release receipt records deployment commit
`82ee322b4e4e8c8658e8eed605431974d084afca` and Cloudflare deployment version
`86b01690-7492-4a37-ae70-3c71d50f43c7`. Git history establishes final evidence commit
`cb51518c545b8f498f9938e2054e729a60abb328`.

Verified results:

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
- The application makes no model API call. Intelligence comes from the browser agent.
- WebMCP is experimental and environment-dependent. The page reports unavailable and registration
  error states while preserving every visible UI control.
- Evaluation covers the fixed 12-record catalog. There is no arbitrary evidence ingestion.
- Live natural-language browser-agent selection has not been run.

ProofRoom was built for the [OpenAI WebMCP Challenge](https://openai.com/webmcp-challenge/) hosted on
[Devpost](https://webmcp.devpost.com/). Submission documents in this repository are local
preparation only. No official Devpost draft exists locally, and nothing has been submitted.

Released under the [MIT License](LICENSE).
