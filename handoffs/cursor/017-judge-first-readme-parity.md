# Cursor work order 017: judge-first README parity

## Outcome

Turn the root README into an exact, judge-first front door for the current local ProofRoom candidate. A reviewer should understand the buyer problem, the WebMCP-critical workflow, the person-only authority boundary, the three strongest visual proofs, and the current lifecycle state within 90 seconds.

This is a documentation and regression-gate pass. Do not change the application, runtime behavior, gallery images, tool contracts, test counts, release receipts, deployment, or Devpost.

## Source boundary

Work only in:

- `README.md`
- `scripts/check-readme-parity.mjs` (new)
- `package.json`, limited to wiring the new script into the existing `lint` command
- `docs/hackathon-build/checklist.md` only if one concise line is needed to record the new gate

Read but do not edit:

- `artifacts/visual-audit/016-submission-gallery/README.md`
- `docs/submission/project-story.md`
- `docs/submission/screenshot-plan.md`
- `docs/submission/launch-checklist.md`
- current application source and E2E tests for exact labels and routes
- release receipts and `evals/live-agent/current.json`

## Judge-facing information order

Use this order unless a clearly better concise ordering emerges during implementation:

1. `# ProofRoom`
2. One direct definition of the product and its authority thesis. Make the idea unmistakable: the agent can research and prepare the buying decision, but it cannot become the buyer.
3. Live demo and repository links, with the live URL explicitly labeled as the verified public baseline until the local candidate is deployed.
4. A compact proof-state table that clearly separates verified public baseline, current local candidate, Devpost, and live natural-language agent status.
5. A current-candidate judge path that starts on `/`, reaches the room by 0:12, and uses only exact current labels.
6. The current 016 gallery in this exact narrative order: landing explanation, untrusted evidence quarantine, human-approved receipt with the scripted registered read.
7. Why buyers would use it, expressed as concrete outcomes rather than internal mechanics.
8. Why WebMCP is necessary and in the critical path.
9. Human authority boundary and the exact nine-tool surface.
10. Evidence rules, architecture, local setup, public-baseline proof, current-local-candidate proof, challenge package, limitations, and license.

Do not create an eyebrow-headline-dek stack. Keep one primary README title. Avoid ornamental badges, inflated claims, generic AI language, and repeated sections.

## Exact content corrections

### 1. Replace the stale judge path

The current README still uses obsolete controls such as:

- `Stage fictional Meridian Bank draft`
- `Approve buyer context`
- `Apply fictional review set`
- navigation instructions that begin at `/#product`

Remove those strings from current instructions. The current-candidate path must use:

1. Open `/` and understand the plain-language landing page.
2. `Open the fictional review`.
3. `Review the sample buyer profile`.
4. `Use this buyer profile`.
5. `Check evidence`.
6. `Run the sample evidence check`.
7. Inspect supported Salesforce, unknown EU data residency, and `ev_011` quarantine.
8. `Review decision`.
9. `Preview calculation`.
10. `Prepare the sample not-ready recommendation`.
11. `Prepare recommendation`.
12. `Approve recommendation`.

Keep this readable as a fast path, not a twelve-item wall. Group related controls into three or four numbered moves with one expected outcome per move.

Because the current candidate is not deployed, label this as the current local-candidate path. State that it becomes the public judge path only after authorized deployment and public parity verification. Do not tell a judge that the older public baseline already contains this landing flow.

### 2. Replace all three primary visuals

Use only:

- `artifacts/visual-audit/016-submission-gallery/01-landing-hero-1600.png`
- `artifacts/visual-audit/016-submission-gallery/02-untrusted-evidence-1600.png`
- `artifacts/visual-audit/016-submission-gallery/03-approved-decision-1600.png`

Use the accepted captions from `docs/submission/screenshot-plan.md`, tightened only for README length. The third caption must explicitly distinguish its one deterministic registered `get_room_state` shim read from a live natural-language agent run. Do not present current gallery bytes as public deployment proof.

Remove the older 005/006 screenshot set from the primary visual story. Those files may remain in the repository.

### 3. Sharpen potential impact

Add one concise section that answers why a real buying team would care. Ground it in existing behavior only:

- unsupported vendor claims remain open rather than becoming conclusions;
- security and commercial review use the same source-backed room;
- assumptions, gaps, and the decision trail are inspectable;
- an agent can reduce research and preparation work without taking the two decisions reserved for the person.

Do not claim measured time savings, revenue impact, production readiness, multi-user collaboration, identity proof, cryptographic signatures, or legal effect.

### 4. Make WebMCP leverage immediate

Preserve the existing strong shared-`RoomActions` explanation, but make the central contrast visible near the top:

- without WebMCP, an agent can only scrape pages and narrate elsewhere;
- with WebMCP, it can call narrow page-owned tools that update the same visible, validated room the buyer reviews;
- approval remains absent from the tool registry by design.

Keep the exact nine-tool table and current official annotation claims. Do not add unsupported MCP annotations.

### 5. Preserve lifecycle truth

Keep these facts explicit and separate:

- verified public baseline: 423 unit/component, 38 end-to-end, 48 accessibility, 12 deterministic evals;
- current local candidate: 447 unit/component, 45 end-to-end, 52 accessibility, 12 deterministic cases with 60 assertions;
- current local candidate is not committed, pushed, deployed, or reflected in Devpost;
- public verification does not cover the current landing, room guide, plain-language, provenance, or current gallery work;
- Devpost project `1402028` remains Untitled, empty, `submission_pre_draft`, with no video and no submission;
- native Chrome baseline evidence proves discovery and direct tool execution, not natural-language selection;
- live natural-language browser-agent selection remains `not_run`;
- everything named is fictional demo content;
- state is browser-local, with no account, database, multi-user room, or application-side model call.

Replace fragile wording such as `after work orders 011 through 014a and autoresearch run 12` with `current dirty working tree` or another state-based description.

### 6. Correct local entry point

The local run instructions must tell a new user to open the landing route at `http://localhost:5173/`. Direct `#product`, `#evaluation`, and `#decision` routes may be described as supported deep links, not the default starting point.

## README parity gate

Create `scripts/check-readme-parity.mjs` and wire it into `npm run lint` after the existing ESLint and no-em-dash checks.

The gate must:

- read the root README;
- require the three exact 016 gallery paths;
- require the exact current control labels listed above;
- reject the known stale control labels listed above;
- require explicit `verified public baseline`, `current local candidate`, and `not_run` language;
- require the local root URL `http://localhost:5173/`;
- reject the fragile stale lineage phrase `work orders 011 through 014a`;
- resolve every local Markdown link and image target in the README and fail if any file path is missing;
- ignore `http`, `https`, and same-document fragment targets when checking filesystem existence;
- print one compact success line and actionable failures;
- use only Node built-ins and add no dependency.

Do not add a counted test. The verified local candidate count must remain 447.

## Required verification

Run:

```text
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run test:a11y
npm run evals
npm run evals:live:validate
npm run build
npm run check:bundle
git diff --check
```

Also run negative proof for the new README gate without changing the working README permanently. A temporary copy or temporary working directory is allowed. Demonstrate that at least one stale control and one missing local image path each cause a nonzero exit, then restore or discard all temporary material.

Verify independently:

- all current control strings exist in the current UI source/tests;
- all three gallery paths resolve and hashes still match the gallery README;
- every local Markdown link and image in README resolves;
- no em dash exists;
- no eyebrow-headline-dek stack was introduced;
- public and local evidence states remain separate;
- exactly nine tools and two UI-only approvals remain unchanged;
- ordinary QA leaves gallery bytes unchanged.

## Stop conditions

Stop and report rather than inventing a claim if a desired impact statement is not supported by current behavior. Do not edit application code, recapture images, change test counts, commit, push, deploy, record video, upload media, or mutate Devpost.

## Return format

Return:

1. summary;
2. judge-first content order implemented;
3. stale path and gallery corrections;
4. impact and WebMCP-leverage changes;
5. lifecycle truth evidence;
6. README parity-gate design and negative-test evidence;
7. files changed;
8. exact QA commands and counts;
9. external actions explicitly not run;
10. git status and keep/revise recommendation.
