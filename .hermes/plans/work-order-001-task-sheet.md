# Work order 001 task sheet

## Required files and surfaces

- Root: `AGENTS.md`, `LICENSE`, `README.md`, package and tool configuration, Cloudflare worker configuration.
- `src/fixtures`: fictional Northstar vendor, Meridian Bank buyer, six requirements, twelve evidence records, canonical room state.
- `src/domain`: strict schemas and inferred types, typed errors, digest, evidence rules, ROI calculation, proposal and decision rules, receipts, and `RoomActions`.
- `src/state`: local and memory storage, migration and recovery, Zustand store, persisted production store, selectors.
- `src/webmcp`: DOM declarations, strict tool schemas, nine definitions, registration lifecycle, status model, React hook, test shim.
- `src/app` and `src/design`: intentional shell and preliminary token layer only.
- `tests`: domain, state, and WebMCP acceptance coverage.

## Mandatory behavior

- Every failed action is atomic and returns a typed safe error.
- Every successful mutation increments revision once and appends exactly one event.
- Every read-only action appends one event without incrementing revision.
- Evidence is active, eligible, and non-contradictory before it can support a condition.
- Testimonials alone never satisfy security or compliance.
- Unsupported requires an explicit limitation or contradiction; insufficient proof remains unknown or partial.
- Proposal approval validates pending state, expiry, base revision, and stable digest.
- Every hard requirement must be fully supported for a ready decision; partial, unsupported, and unknown all block ready.
- Reset recreates canonical data with only reset timestamp variance.
- Persisted data is strictly validated; incompatible or corrupt data recovers to the fixture with a notice.
- WebMCP registers nine unique imperative tools with one abort signal and all-settled partial failure reporting.
- `get_room_state`, `evaluate_requirement`, and `calculate_roi` are read-only.
- `search_product_evidence` is read-only and may return untrusted content.
- Approval methods never appear in the registry.

## Review rubric

- Check exact fixture counts and fictional labels.
- Check unknown-key and length rejection.
- Check direct store writes are absent from React and WebMCP callbacks.
- Check state snapshots before and after expected failures.
- Check annotations on every tool and executable real callbacks through the shim.
- Check no em dash character appears in repository-authored text.
- Run `npm install`, `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
