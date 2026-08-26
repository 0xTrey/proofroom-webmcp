# Cursor work order 002: foundation audit fixes

## Objective

Correct the foundation defects found by Codex after work order 001. Do not start checklist items 5 through 9. The milestone is accepted only when the domain and browser gates below pass from a fresh shell.

## Allowed boundary

- Repository: `/Users/treyharnden/Projects/proofroom-webmcp`
- Read the complete planning set under `docs/hackathon-build/` and work order 001 before editing.
- You may edit foundation source, tests, configuration, README, and the planning documents where the audit exposed an inconsistent contract.
- You may install an already-declared Playwright browser if the local test runner needs it.
- Do not deploy, commit, push, add Neon, add authentication, add an AI model, or build the later feature workspaces.

## Required corrections

### 1. Make Playwright preview reachable

Observed evidence:

- `npm run preview -- --port 4173 --strictPort` serves `http://localhost:4173/`.
- `curl http://localhost:4173/` returns 200.
- `curl http://127.0.0.1:4173/` cannot connect.
- `playwright.config.ts` waits for `http://127.0.0.1:4173` and times out after 120 seconds.

Fix the preview command used by Playwright so it explicitly binds to `127.0.0.1`. Prove `npm run test:e2e` and `npm run test:a11y` both run instead of timing out.

### 2. Return zero results for an unmatched evidence query

`search_product_evidence` currently returns the full filtered catalog when no record scores above zero, then calls every returned record a match. This is misleading.

Change the search behavior so a nonempty query with no lexical match returns:

- `matched: 0`
- `returned: 0`
- `results: []`
- the existing widen-query guidance

Preserve stable sorting and filters for real matches. Add domain or WebMCP tests for an unmatched query and a filtered unmatched query.

### 3. Make `ready` mean every hard requirement is fully supported

The strongest trust contract is the intended one:

- A `must` requirement or any `nonNegotiable` requirement blocks `ready` unless its status is exactly `supported`.
- `partially_supported`, `unsupported`, and `unknown` all block `ready`.
- `ready_with_conditions` and `not_ready` remain available while gaps exist.

Update the invariant, tests, comments, tool descriptions, PRD/spec wording, and visible copy so they all say the same thing. Add a direct regression test proving that a must requirement with `partially_supported` blocks `ready`.

### 4. Reject internally inconsistent decision proposals

Decision proposal arrays must be trustworthy, not merely well typed.

At minimum enforce and test these rules without duplicating product logic in the WebMCP adapter:

- `supportingRequirementIds` contains unique IDs.
- `blockingRequirementIds` contains unique IDs.
- The two arrays are disjoint.
- A `supported` requirement cannot be listed as blocking.
- A hard blocker from the current room cannot be omitted from `blockingRequirementIds` when status is `ready_with_conditions` or `not_ready`.
- A `ready` proposal must have no blocking IDs and no current hard blockers.

Return structured domain failures with no state or ledger mutation. Keep approval human-only.

## Verification

Run all of these and fix failures:

```text
npm run lint
npm run typecheck
npm test
npm run evals
npm run build
npm run test:e2e
npm run test:a11y
```

Also run a direct reachability check against the Playwright preview host if needed.

## Required report

Return:

1. Each corrected defect and the exact files changed.
2. The new regression tests and what each proves.
3. Every command run with pass/fail status and test counts.
4. Any remaining browser, WebMCP, or contract risk.
5. The next recommended work order, but do not begin it.

## Stop condition

Stop after all four corrections pass the full verification matrix, or after reporting one concrete blocker with command output and attempted fixes.
