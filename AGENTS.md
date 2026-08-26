# ProofRoom repository instructions

ProofRoom is a client-first React application deployed to Cloudflare Workers static assets. A
browser agent supplies intelligence through WebMCP. The application supplies deterministic state,
evidence rules, tools, persistence, and receipts. There is no database, no authentication, and no
external model call.

Read `docs/hackathon-build/scope.md`, `docs/hackathon-build/prd.md`, `docs/hackathon-build/spec.md`,
and `docs/hackathon-build/checklist.md` before changing behavior. The spec and PRD control product
behavior. Do not broaden the product.

## Architecture

Layers, in dependency order. A layer may import only from layers above it.

1. `src/fixtures`: canonical fictional vendor, buyer, requirements, evidence, and demo room state.
2. `src/domain`: types, strict schemas, typed errors, invariants, evidence rules, ROI, digests,
   receipts, and the action implementations.
3. `src/state`: Zustand store, storage adapters, schema migration and recovery, selectors.
4. `src/webmcp`: local experimental DOM declarations, tool schemas, tool definitions, registration
   lifecycle, status model, React hook, and the test shim.
5. `src/features`: product, context, evaluation, ROI, briefs, decision, and ledger surfaces.
6. `src/app` and `src/components`: shell, navigation, error boundary, and shared presentation.

### Non-negotiable rules

- React components never write to the store directly. They call `RoomActions`.
- WebMCP tool callbacks never contain product logic. They parse input and call `RoomActions`.
- `RoomActions` is the only place a room mutation happens.
- A failed action is atomic. It returns a typed `DomainError` and changes nothing, including the
  activity ledger.
- A successful mutating action increments `revision` exactly once and appends exactly one event.
- A successful read-only action appends exactly one event and leaves `revision` unchanged.
- Requirement status is derived from eligible evidence. No caller may set status directly.
- Approving buyer context and approving a decision are UI-only. They must never become WebMCP tools.
- Do not weaken a strict Zod schema to make a test pass. Fix the caller or the fixture.
- Do not fake a tool call or an activity event. Every event comes from a real action.

## Writing constraints

- Never use the em dash character anywhere in the repository. `npm run lint` fails on it. Use a
  comma, a parenthesis, a colon, or a second sentence.
- Never compose an eyebrow, headline, and dek stack. A surface starts with one primary headline.
- Never use a generic purple-gradient SaaS look, a glass dashboard, or an undifferentiated card wall.
- Never make a claim about a real company, product, or certification. Every entity in this repository
  is fictional demo content and must be labeled as such.
- Never describe the browser-local input digest with cryptographic or legal language. It protects
  demo-state integrity and stale approvals, nothing more.

## Visual system

- Newsreader for the primary headline and major editorial moments.
- Manrope for navigation, controls, and body UI.
- IBM Plex Mono for evidence IDs, revisions, timestamps, and ledger metadata.
- Tokens live in `src/design/tokens.css`. Warm paper surface, deep ink panels, acid green for
  verified evidence, cobalt for agent work, rust for gaps and contradictions.
- Status must always carry text plus a shape or icon, never color alone.
- Respect `prefers-reduced-motion` for every transition.

## Commands

```text
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run test:a11y
npm run evals
npm run build
npm run deploy
```

`npm run lint` runs ESLint and the repository writing guard. `npm run test` runs the Vitest domain,
state, WebMCP, and component suites in jsdom. The Playwright suites need
`npx playwright install chromium` before their first run.

## Reporting contract

After each work order, return a structured report with:

1. Checklist items completed or partial.
2. Files created and materially changed, including untracked files.
3. Architecture decisions made inside the spec, and assumptions taken.
4. Exact commands run with pass and fail counts.
5. Known defects and residual risks.
6. Any blocker that needs judgment above the implementation layer.
7. The recommended next bounded milestone.

Stop after one focused repair attempt on a named blocker. Do not commit, push, deploy, or send an
external message unless the work order authorizes it.
