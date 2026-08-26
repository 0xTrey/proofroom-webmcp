# ProofRoom

ProofRoom is an agent-native B2B evaluation room. A buyer and their browser agent examine the same
product, requirements, evidence, assumptions, and decision state on one visible page. The agent
researches and stages work through WebMCP tools. The person controls what context becomes
authoritative and what decision is approved.

Most B2B sites make buyer agents scrape marketing claims. ProofRoom exposes structured evidence and a
shared decision workflow instead, so the buyer and the agent can evaluate fit without hiding
assumptions or gaps.

**Everything in this repository is fictional demo content.** Northstar, Meridian Bank, Larkfield
Mutual, and Ridgeline Research do not exist, and no real company, product, or certification is
described.

## The differentiator: enforced evidence

ProofRoom does not display citations and hope. Its domain model refuses to produce a conclusion the
evidence cannot support.

- A requirement is `supported` only when active, eligible evidence covers every hard condition.
- A testimonial can never prove a security or compliance condition.
- Expired evidence cannot support a current requirement.
- EU data residency stays `unknown` in this catalog, because the hosting note lists North American
  regions only and the subprocessor register does not state processing locations. That gap is the
  point of the demo.
- A stakeholder brief that calls an unproven requirement proven is rejected, and nothing is saved.
- Every `must` or non negotiable requirement must be exactly `supported` for a `ready` decision.
  Partial, unsupported, and unknown hard requirements block ready at proposal and approval time.
- Decision proposals reject duplicate or overlapping requirement IDs, supported blockers, and
  omitted current hard blockers.
- A stale, expired, or already resolved proposal cannot be approved.

## Human authority

Two actions are deliberately not tools:

1. Approve or reject the staged buyer context.
2. Approve or reject the decision proposal.

The agent can stage both. Only a visible page control can approve either. Registry tests assert that
no approval tool exists.

## The nine WebMCP tools

| Tool | Kind | What it does | What it cannot do |
| --- | --- | --- | --- |
| `get_room_state` | read only | Revision, approved context summary, requirement totals, blockers, ROI summary, brief presence, proposal states, next actions | Return the activity ledger |
| `search_product_evidence` | read only, untrusted content | Search the twelve record catalog by query, type, requirement tag, and trust class | Mutate anything |
| `evaluate_requirement` | read only | Deterministic status, covered conditions, gaps, contradictions, eligible records | Change requirement status |
| `calculate_roi` | read only | Hours saved, labor value, first year net value, payback, budget comparison | Apply assumptions to the room |
| `propose_buyer_context` | staged mutation | Stage company context for review with a digest and an expiry | Approve context or personalize authoritative state |
| `stage_requirement` | mutation | Update buyer notes, priority, the non negotiable flag, and open questions | Set requirement status |
| `attach_evidence` | mutation | Attach one to six records and recompute coverage | Set status, or attach expired or ineligible records |
| `save_stakeholder_brief` | mutation | Save a CFO or CISO brief with citations, risks, and open questions | Save a brief that overstates evidence |
| `propose_decision_status` | staged mutation | Stage `ready`, `ready_with_conditions`, or `not_ready` with blockers | Approve the decision |

Read tools carry `readOnlyHint`. Evidence search carries `untrustedContentHint`, because testimonial
and external text is returned as data. One testimonial contains an instruction styled sentence on
purpose: ProofRoom renders and returns it as text and never follows it.

## Architecture

```text
browser agent -> WebMCP input schema -> strict Zod parse -> tool definition
  -> shared RoomActions method -> invariant validation -> atomic state update
  -> revision and activity event -> structured tool result -> visible React update
```

The same `RoomActions` interface backs the page controls. Layers:

- `src/fixtures`: canonical vendor, buyer, six requirements, twelve evidence records, demo room.
- `src/domain`: types, strict schemas, typed errors, evidence rules, ROI, digests, receipts, actions.
- `src/state`: Zustand store, storage port, migration and recovery, selectors.
- `src/webmcp`: local experimental DOM declarations, tool schemas and definitions, registration
  lifecycle, status model, React hook, test shim.
- `src/app`, `src/components`, `src/design`: shell, navigation, error boundary, tokens.

React components never write to the store. WebMCP callbacks never hold product logic. Requirement
status has exactly one writer, and it reads evidence.

## Sixty second judge path

```bash
nvm use 22            # Node 22.12 or newer
npm install
npm run test          # domain, state, WebMCP, and component suites
npm run build
npm run dev           # http://localhost:5173
```

1. Open the Product surface. Note the single headline, the fictional content notice, and the agent
   tool status. Without WebMCP the page still works completely.
2. Open Evaluation. Six requirements start `unknown`, because the evaluation has not happened yet.
3. Open Decision. The commercial model, the blockers, the activity totals, and the exact tool list
   are all visible.
4. In a browser with WebMCP, ask the agent to evaluate Northstar for Meridian Bank. Approve the
   staged context in the page, then watch requirement status follow the evidence rather than the
   narrative.

## Tests

| Command | Scope |
| --- | --- |
| `npm run lint` | ESLint plus the repository writing guard |
| `npm run typecheck` | TypeScript strict mode across source, tests, and the Worker |
| `npm run test` | Vitest domain, state, WebMCP, and component suites in jsdom |
| `npm run test:e2e` | Playwright UI only journey |
| `npm run test:a11y` | axe on every surface at 390, 768, 1280, and 1600 pixels |
| `npm run evals` | Eval manifest validation |
| `npm run build` | Type check plus the Cloudflare Vite build |

Playwright needs `npx playwright install chromium` before its first run.

## Deployment

Cloudflare Workers static assets with the official Vite plugin, a minimal Worker entry, and single
page application fallback. The Worker adds `Origin-Agent-Cluster: ?1`. It deliberately does not set a
`Permissions-Policy` that restricts `tools`, because that would disable WebMCP on this page.

## Limitations

- The room lives in browser local storage. There is no account, no database, and no shared room.
- The application never calls a model API. All intelligence comes from the browser agent.
- The input digest is a short non-cryptographic fingerprint. It protects demo-state integrity and
  stale approvals, not identity or non-repudiation.
- WebMCP is experimental. `document.modelContext` is declared locally in `src/webmcp/types.d.ts` and
  isolated behind one adapter, and the page states clearly when tools are unavailable.
- Requirement evaluation covers the twelve fixture records. There is no evidence ingestion.

## License

MIT. See `LICENSE`.
