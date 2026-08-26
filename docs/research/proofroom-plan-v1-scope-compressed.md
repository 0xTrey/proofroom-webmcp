# ProofRoom Plan V1: Scope Compressed

## Product promise

ProofRoom turns a fictional B2B software site into an inspectable buyer evaluation workspace. A person and an agent can evaluate the same product against the same requirements, evidence, and assumptions without leaving the page.

## Scope lock

Build one complete evaluation, not a general platform.

- Fictional vendor: Northstar, a campaign operations platform
- Fictional buyer: Meridian Bank, a 1,000-person fintech
- Requirements: Salesforce, EU data residency, SSO, SOC 2 Type II, 20 campaigns per month, and payback within 12 months
- Stakeholders: CFO and CISO only
- Evidence: twelve local records split across product, security, integration, implementation, and customer proof
- Persistence: browser local storage with a reliable reset path

## Three product surfaces

### 1. Product experience

Show a premium vendor site that remains useful without an agent. After the buyer approves a context proposal, the page reorders and emphasizes relevant capabilities, proof, and open gaps. The shared buyer context remains visible.

### 2. Evaluation workspace

Show the six requirements in a matrix with status, priority, attached evidence, rationale, buyer notes, and open questions. The state model forbids `supported` unless at least one eligible evidence record is attached.

### 3. Decision room

Show a transparent ROI model, CFO brief, CISO brief, proposed decision status, and the real WebMCP activity ledger. Every assumption and tool result is inspectable.

## Canonical demo

1. Open the unpersonalized site.
2. Ask the agent to evaluate Northstar for Meridian Bank.
3. The agent reads room state and proposes buyer context.
4. The person approves the context in the page.
5. The agent evaluates all six requirements and attaches evidence.
6. EU data residency remains unknown because the evidence does not prove it.
7. The agent calculates ROI from visible assumptions and saves CFO and CISO briefs.
8. The person changes the budget ceiling to $90,000 and keeps EU residency non-negotiable.
9. The agent proposes a revised `not ready` decision.
10. The person sees the actual activity ledger and evidence receipt.

## Reduced tool set

- `get_room_state`
- `search_product_evidence`
- `evaluate_requirement`
- `calculate_roi`
- `propose_buyer_context`
- `stage_requirement`
- `attach_evidence`
- `save_stakeholder_brief`
- `propose_decision_status`

## Non-goals

- No real vendor or customer data
- No authentication
- No database
- No external AI API
- No vendor email or CRM action
- No arbitrary document ingestion
- No team collaboration
- No multiple vendor comparison
- No mobile-first editing workflow

## Acceptance focus

- Every UI control and WebMCP tool calls the same domain action.
- All mutations are visible and reversible.
- Human approval is required before buyer context or decision status becomes authoritative.
- Unsupported requirements stay unsupported or unknown.
- A judge can reset and complete the demo without an account.
- The app renders a helpful fallback when WebMCP is unavailable.
