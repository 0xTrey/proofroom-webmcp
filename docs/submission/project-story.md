# ProofRoom challenge story

> Local preparation only. No official Devpost draft exists locally, and nothing has been submitted.

## Project name

ProofRoom

## One-sentence summary

ProofRoom is an agent-native B2B evaluation room where a buyer and browser agent test product fit
against structured evidence, visible assumptions, and human-approved decision state.

## Problem

B2B sites are designed for people to browse and agents to scrape. Product claims, security facts,
integrations, prices, and customer proof sit across disconnected pages and documents. The agent has
to infer what is authoritative, while the buyer gets a narrative instead of an inspectable decision
record.

The real blocker is trust. A fast answer is not useful if a buyer cannot see which evidence supports
it, which gaps remain open, what the agent changed, and which decisions still require a person.

## Solution

ProofRoom puts product research and decision state on one visible page. The browser agent reads the
room, searches a fixed evidence catalog, evaluates requirements, calculates ROI, saves stakeholder
briefs, and stages proposals. The person reviews the same state and retains final authority over
buyer context and the decision.

The domain model enforces the evidence rules. An agent cannot turn persuasive copy into a supported
requirement, skip a hard blocker, or partially mutate the room after a failed action.

## Why WebMCP is necessary

WebMCP is the product interface for the browser agent, not an extra demo control. It exposes nine
narrow tools from the live page with strict schemas, safe results, and read-only or untrusted-content
annotations where required.

The tools and visible UI call the same `RoomActions` methods. That gives both paths one set of
invariants, revision rules, persistence behavior, and activity receipts. Without WebMCP, an agent
would scrape prose and narrate a recommendation outside the room. With WebMCP, it can perform
structured work that the buyer sees, checks, and either approves or leaves pending.

## What the agent can do

- Read the current revision, requirement totals, blockers, ROI summary, brief state, and next actions.
- Search 12 fictional evidence records, including records marked as untrusted content.
- Evaluate evidence coverage without authoring requirement status.
- Calculate ROI from bounded, visible assumptions without silently applying them.
- Stage buyer context for review.
- Update requirement notes, priority, non-negotiable state, and open questions.
- Attach eligible evidence and trigger deterministic status recomputation.
- Save evidence-backed CFO and CISO briefs.
- Stage a `ready`, `ready_with_conditions`, or `not_ready` decision proposal.

## What only the person can do

Two actions are UI-only:

1. Approve or reject staged buyer context.
2. Approve or reject a staged decision.

No approval WebMCP tool exists. The boundary prevents an agent from making personal context
authoritative or becoming the final decision maker. Stale, expired, invalid, and resolved proposals
fail safely.

## How it was built

ProofRoom is a client-first React 19 and TypeScript application deployed as Cloudflare Workers static
assets. Zustand manages browser-local state, Zod validates strict inputs, Vitest covers the domain
and components, and Playwright covers UI, accessibility, public, and native-browser paths.

The dependency flow is fixtures, domain, state, WebMCP, features, then app and components. React
components never write to the store directly. WebMCP callbacks only parse input and call shared
actions. `RoomActions` is the only room-mutation boundary.

### Build process

Codex owned research, product strategy, acceptance criteria, the
[reviewable work-order trail](../../handoffs/cursor/), adversarial audits, and final release
verification. Cursor CLI performed the primary implementation passes and returned structured
milestone reports. Accepted work was gated by tests, visual evidence, native browser evidence, and
release receipts. Those gates, not the use of automation itself, support the quality claims here.

There is no account, database, multi-user room, or application-side model API call.

## Nine-tool summary

| Tool | Job | Hard boundary |
| --- | --- | --- |
| `get_room_state` | Read room summary and next actions | Does not return the activity ledger |
| `search_product_evidence` | Search structured evidence | Read only; returned text may be untrusted |
| `evaluate_requirement` | Calculate evidence coverage | Cannot set requirement status |
| `calculate_roi` | Calculate value, payback, and budget fit | Cannot apply assumptions |
| `propose_buyer_context` | Stage buyer context | Cannot approve or personalize authoritative state |
| `stage_requirement` | Update buyer-owned requirement context | Cannot set status |
| `attach_evidence` | Attach records and recompute coverage | Rejects expired or ineligible proof |
| `save_stakeholder_brief` | Save a CFO or CISO brief | Rejects evidence overstatement |
| `propose_decision_status` | Stage a decision with blockers | Cannot approve the decision |

## Evidence and security model

A requirement becomes `supported` only when active, eligible evidence covers every hard condition.
Testimonials cannot prove security or compliance conditions. Expired and unrelated records cannot
support a requirement. Briefs that overstate evidence fail atomically, and hard blockers cannot be
omitted from conditional or not-ready decisions.

EU data residency is the deliberate unknown. The fictional hosting note names North American
regions, and the fictional subprocessor register does not state processing locations. Attaching both
records still leaves the hard conditions open, so status remains `unknown`.

One fictional testimonial contains an instruction-styled sentence. ProofRoom marks it as untrusted
data and does not follow it. The activity ledger stores safe summaries rather than raw sensitive
buyer fields.

Proposal input digests protect browser-local demo-state integrity and stale approvals. They are not
identity proof and carry no legal meaning.

## Testing and release proof

The verified release evidence records:

- 423 unit and component tests passed.
- 38 end-to-end tests passed.
- 48 accessibility checks passed.
- 12 deterministic evals passed.
- Headed Chrome `151.0.7922.174` discovered exactly nine native tools before and after reload through
  real `document.modelContext`, with no shim.
- Native execution of `get_room_state` and `propose_buyer_context` moved the revision from 0 to 1,
  showed the pending proposal, and preserved it across reload.
- Application console, page, request, and response errors were all zero.
- Chrome emitted two disclosed strict-CSP WebMCP testing registration notices. They were classified
  as browser diagnostics only after exact phase, source, entry-integrity, CSP, execution, and count
  checks.
- Live natural-language browser-agent selection remains `not_run`.

The [release receipt](../../artifacts/release/release-receipt.json) records deployment commit
`82ee322b4e4e8c8658e8eed605431974d084afca` and Cloudflare deployment version
`86b01690-7492-4a37-ae70-3c71d50f43c7`. The
[native WebMCP receipt](../../artifacts/release/native-webmcp.json) records browser discovery,
execution, and persistence facts. Git history establishes final evidence commit
`cb51518c545b8f498f9938e2054e729a60abb328`.

## Limitations

- All companies, products, compliance statements, and testimonials are fictional demo content.
- State persists in one browser's local storage.
- There is no account, authentication, database, shared room, or evidence ingestion.
- The fixed catalog contains 12 evidence records and six requirements.
- WebMCP is experimental and depends on browser support.
- The application never calls a model API.
- Live natural-language browser-agent selection has not been run.

## Links

- Live app: https://proofroom-webmcp.harnden-trey.workers.dev
- Public repository: https://github.com/0xTrey/proofroom-webmcp
- Challenge: https://openai.com/webmcp-challenge/
- Devpost challenge page: https://webmcp.devpost.com/
- License: [MIT](../../LICENSE)

## Likely judge questions

### Could the agent approve its own work?

No. Context approval and decision approval are visible UI controls only. The exact nine-tool registry
contains no approval tool, and tests assert that absence.

### What prevents a persuasive testimonial from proving a security claim?

Evidence eligibility lives in the domain layer. Testimonial evidence cannot satisfy security or
compliance conditions. Untrusted text is returned and rendered as data, never executed as an
instruction.

### Why does EU data residency remain unknown?

The catalog does not prove either required condition. It names no EU hosting region and gives no
subprocessor processing locations. ProofRoom reports the gap instead of converting absence into a
claim.

### Does the native test use a fake WebMCP surface?

No. The accepted headed Chrome run used real `document.modelContext`, discovered the same nine tools
before and after reload, executed two tools, and used no WebMCP shim.

### Is this a production procurement system?

No. It is a fictional client-first demonstration with browser-local persistence. There is no
authentication, database, shared backend, imported evidence, or production customer data.

### Has a live natural-language browser agent completed the journey?

No. That evidence state is explicitly `not_run`. The passed native evidence proves tool discovery,
execution, state mutation, and reload persistence, not natural-language tool selection.
