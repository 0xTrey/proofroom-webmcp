# Autoresearch: custom

Started: 2026-08-26
Runs: 16 | Best score: 100/100 | Status: kept

## Current best
Strategy: release-candidate-parity-gate
Score: 100/100
Summary: Added a fail-closed release-candidate gate that keeps local QA, public deployment, native WebMCP, Responses API, compatible browser-agent, deterministic, and product-invariant evidence distinct. Independent adversarial loops closed digest-binding, path-containment, schema-parity, invalid-eval, and receipt-readback gaps. The honest candidate remains blocked until external lifecycle evidence is refreshed.


## Experiment target

Produce the strongest launch plan for ProofRoom, an agent-native B2B evaluation workspace built for the OpenAI WebMCP Challenge. The winning plan must be specific enough for Cursor CLI to implement without inventing product behavior or architecture.

## Custom rubric

### Challenge alignment (0-25)

- 0-10: WebMCP is decorative or the challenge story is unclear.
- 11-17: The app uses WebMCP but could mostly exist unchanged without it.
- 18-22: WebMCP enables visible shared human-agent work and a clear demo.
- 23-25: The product makes a strong, specific argument for the agent-native web and maps directly to the judging criteria.

### Product and demo clarity (0-25)

- 0-10: The audience, workflow, or value is vague.
- 11-17: The concept is understandable but the demo is feature-driven.
- 18-22: One real audience, one coherent workflow, and one memorable demo moment are explicit.
- 23-25: A judge can understand the product, its differentiation, and its complete three-minute story immediately.

### Execution reliability (0-25)

- 0-10: Scope or infrastructure makes completion unlikely.
- 11-17: A plausible build with significant hidden dependencies.
- 18-22: Bounded architecture, testable acceptance criteria, and credible release sequencing.
- 23-25: Deterministic behavior, progressive enhancement, strong automated and visual QA, simple deployment, and a clear failure strategy.

### Trust, evidence, and technical depth (0-25)

- 0-10: Unsupported AI conclusions or broad unsafe tools.
- 11-17: Basic citations and approval language without enforcement.
- 18-22: Evidence-gated conclusions, narrow tool contracts, visible state changes, and explicit human approval.
- 23-25: The data model and tools enforce provenance, untrusted-content handling, reversible staging, approval integrity, and auditable receipts.

## Mutation strategies

- `scope-compression`
- `demo-first-architecture`
- `visual-expansion`
- `trust-contract-and-evals`
- `add-neon-collaboration`
- `embed-ai-chat`
- `add-vendor-outreach`
- `generalize-category`
- `multi-buyer-collaboration`

## History

| Run | Score | Status | Strategy |
|-----|-------|--------|----------|
| 1   | 82    | baseline   | baseline |
| 2   | 88    | kept   | scope-compression |
| 3   | 91    | kept   | demo-first-architecture |
| 4   | 85    | reverted   | visual-expansion |
| 5   | 94    | kept   | trust-contract-and-evals |
| 6   | 89    | reverted   | add-neon-collaboration |
| 7   | 84    | reverted   | embed-ai-chat |
| 8   | 85    | reverted   | add-vendor-outreach |
| 9   | 90    | reverted   | generalize-category |
| 10   | 92    | reverted   | multi-buyer-collaboration |
| 11   | 98    | kept   | judge-runway-and-agent-rehearsal |
| 12   | 99    | kept   | agent-input-provenance |
| 13   | 99    | kept   | submission-state-truth |
| 14   | 99    | kept   | judge-facing-demo-gallery |
| 15   | 100    | kept   | responses-api-model-selection-eval |
| 16   | 100    | kept   | release-candidate-parity-gate |
