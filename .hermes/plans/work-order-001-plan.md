# Work order 001 implementation plan

## Phase goal

Build the complete technical foundation for checklist items 1 through 4 while stopping before the visual product and feature UI milestones.

## Sequence

1. Scaffold package, TypeScript, Vite, Cloudflare, lint, test, Playwright, fonts, tokens, app shell, license, README, and repository instructions.
2. Define strict schemas and types, then add canonical vendor, buyer, six requirements, twelve evidence records, reset state, digest, ROI, evidence evaluation, errors, and receipts.
3. Add the storage abstraction, Zustand store, migrations, selectors, and one stable `RoomActions` surface with atomic transactions and ledger events.
4. Add nine strict WebMCP schemas, tool definitions, native registration lifecycle, status reporting, and an executable test shim.
5. Add focused tests for every milestone invariant, run all acceptance commands, inspect the diff, and repair failures within scope.

## Architecture

- Keep fixtures, domain rules, state, WebMCP, and React shell as separate layers.
- Put all read and mutation behavior behind `RoomActions`; React and WebMCP callbacks may not write state directly.
- Parse external and persisted inputs with strict Zod schemas.
- Perform each mutation through one atomic state transition that increments revision once and appends one immutable event.
- Keep human approvals in `RoomActions` for future UI use but omit them from WebMCP.
- Treat WebMCP as an isolated adapter with locally declared experimental DOM types and a real-definition test shim.

## Success criteria

- Exactly six canonical requirements and twelve canonical evidence records.
- EU data residency remains unknown.
- All listed invariants and WebMCP lifecycle behaviors have deterministic tests.
- The five acceptance commands pass.
