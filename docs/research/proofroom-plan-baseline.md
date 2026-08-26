# ProofRoom Baseline Plan

## Direct answer

Build a fictional B2B software site that becomes a shared evaluation room when a buyer visits with an agent. The person sees the product, requirements, evidence, assumptions, stakeholder briefs, and agent activity in one visible workspace. The agent uses WebMCP tools to search product evidence, evaluate requirements, personalize the page, calculate ROI, and save decision material.

## Audience and problem

The target user is a B2B software buyer working with an AI agent. Marketing sites make buyers and their agents reconstruct product fit from pages, PDFs, and claims. ProofRoom gives both parties structured product evidence and a shared stateful evaluation surface.

## Core workflow

1. The buyer opens a fictional vendor site.
2. The buyer approves a company profile and six requirements.
3. The agent personalizes the visible experience.
4. The agent builds a requirement matrix and attaches evidence.
5. The app calculates ROI from editable assumptions.
6. The agent saves CFO and CISO briefs.
7. The person reviews the activity ledger and final recommendation.

## Initial product surface

- Personalized product page
- Buyer context panel
- Requirement and evidence matrix
- ROI calculator
- CFO and CISO briefs
- Agent activity ledger

## Initial WebMCP tools

- `get_room_context`
- `search_product_evidence`
- `get_requirement_coverage`
- `compare_plans`
- `calculate_roi`
- `set_buyer_context`
- `personalize_experience`
- `add_requirement`
- `attach_evidence`
- `record_risk`
- `save_stakeholder_brief`
- `set_decision_status`

## Technical baseline

- React and TypeScript
- Client-side state and local persistence
- Static deployment
- No authentication
- No database
- No external AI API
- Feature detection for `document.modelContext`
- Shared action functions for UI and WebMCP tool calls

## Baseline risks

- Twelve tools and six major surfaces may be too broad.
- Direct agent writes to buyer context and decision status need stronger approval controls.
- The product can become a feature tour instead of one clear demo.
- Synthetic product evidence needs an explicit truth model so the app does not look like unsupported marketing copy.
- Visual personalization can become superficial if it only swaps strings.

## Official constraints

- Working live URL in ChatGPT's in-app browser or compatible Chrome
- Public open-source repository with visible license
- Public demo video shorter than three minutes with audio
- Complete product experience, not a technical proof of concept
- Meaningful and non-trivial WebMCP implementation

Sources: [OpenAI challenge](https://openai.com/webmcp-challenge/), [Devpost rules](https://webmcp.devpost.com/rules), [Chrome WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp), [Chrome tool security](https://developer.chrome.com/docs/ai/webmcp/secure-tools).
