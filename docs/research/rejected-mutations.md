# Rejected Plan Mutations

## Add Neon collaboration

Proposal: persist shareable buyer rooms in Neon with accounts, multi-device state, and collaboration links.

Decision: reject for the challenge MVP. It adds authentication, schema migration, privacy, network reliability, and permissions work without improving the canonical single-session WebMCP demonstration. The architecture keeps a clean persistence boundary so this can be added after judging.

## Embed an AI chat

Proposal: add an application-side language model and chat panel.

Decision: reject. The browser agent is already the intelligence. A second agent makes WebMCP look decorative, adds credentials and network failures, and weakens the shared-page thesis.

## Add vendor outreach

Proposal: let the buyer agent send a clarification request to the vendor or create a CRM record.

Decision: reject. External communication adds consequential side effects, confirmation complexity, third-party dependencies, and demo risk. ProofRoom can create a visible draft request without sending it.

## Generalize across software categories

Proposal: support any SaaS vendor through imported schemas and evidence packs.

Decision: reject. Generalization weakens the specific buyer story and requires ingestion, schema authoring, and more fixtures. The open-source architecture can document extension points without implementing them.

## Multi-buyer collaboration

Proposal: let security, finance, marketing, and procurement users join the same room in real time.

Decision: reject for this release. It has real product potential but requires identity, conflict resolution, role permissions, and a backend. Two stakeholder briefs demonstrate the idea without the infrastructure burden.
