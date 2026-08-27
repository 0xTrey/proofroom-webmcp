# Cursor work order 008a: close executable eval and QA contract gaps

## Objective

Correct the item 10 implementation so it matches work order 008 exactly. Preserve the strong parts of the current runner, cases, browser-shim coverage, QA orchestration, and deterministic behavior. Close every acceptance blocker below, rerun the complete release-candidate matrix, and return exact evidence to Codex.

Do not begin deployment, public verification, final README, video, or Devpost work. Do not commit, push, deploy, or mark item 10 accepted. Codex owns acceptance.

## Source boundary

- Repository: `/Users/treyharnden/Projects/proofroom-webmcp`
- Read `AGENTS.md`, work order 008, the current uncommitted item 10 implementation, and the accepted build checklist.
- Work only in this repository.
- Preserve every accepted item 5 through item 9 visual artifact byte-for-byte.
- Add no backend, model API call, analytics, dependency, or WebMCP tool.
- Keep exactly nine WebMCP tools and two UI-only approvals.
- Use no em dash characters.

## Acceptance blockers found by Codex

### 1. Restore source maps and implement the specified bundle budgets

The current implementation invented a 2.5 MiB total `dist` budget, changed the JavaScript and CSS limits to 160 KiB and 30 KiB, rejected source maps, and disabled Vite production source maps to satisfy those invented rules. This contradicts work order 008.

Correct this exactly:

- restore `build.sourcemap: true` in `vite.config.ts`
- remove the invented total-dist raw budget and Worker-entry size budget
- do not classify source maps or self-hosted fonts as unexpected output
- report source-map and self-hosted-font files and bytes, but exclude them from application-code gzip totals
- enforce total client JavaScript gzip maximum 150 KB, using 150 times 1024 bytes
- enforce total client CSS gzip maximum 40 KB, using 40 times 1024 bytes
- enforce every individual client JavaScript asset raw maximum 600 KB, using 600 times 1024 bytes
- require client HTML, at least one client JavaScript asset, at least one client CSS asset, Worker entry, and Worker configuration
- fail with the exact offending path and measured size for an over-budget individual asset
- keep deterministic unit fixtures for pass, missing output, JavaScript gzip overflow, CSS gzip overflow, and individual raw JavaScript overflow

Use the required script name `npm run check:bundle`. You may keep `bundle:check` as an alias only if it adds value, but all docs and aggregate QA must call `check:bundle`.

### 2. Make the receipt match the required machine contract

The current report omits required fields and writes the wrong JSON filename.

Correct this exactly:

- write `evals/results/deterministic-report.json`, not `latest.json`
- remove the generated `evals/results/latest.json` file
- include both `manifestDigest` and `expectedSequenceDigest` in the JSON fixture or contract section
- include exact family totals: `explicit: 4`, `ambiguous: 4`, `safety: 4`
- include exact tool count and the ordered nine tool names in the JSON report
- include an explicit live-agent selection object in the JSON report with `status: "not_run"`, `includedInPassCount: false`, and a safe explanation
- keep total, passed, failed, tool-call, and assertion counts
- keep every current per-case setup, call, assertion, terminal, and cleanup receipt
- keep the report stable across identical runs and update README/docs to the new filename and both input digests
- stdout must print one concise pass or fail line per case, followed by exactly one final `12 passed, 0 failed` summary line and the receipt digest

Add tests that assert every required top-level report field, both source digests, all three family counts, nine ordered tool names, the live-agent exclusion, the exact output filename, and stable consecutive hashes.

### 3. Enforce the declared manifest and sequence contract fully

The contract currently does not enforce the rule that a state-dependent mutation cannot be sequenced before its required read. Add a small, explicit dependency-order contract for the known cases. Do not infer dependencies from free text.

At minimum, fail closed when a tampered sequence moves any of these state-dependent mutations before its required `get_room_state` call:

- `propose_buyer_context` in `eval_001_canonical_journey` and `eval_006_make_this_relevant`
- `save_stakeholder_brief` in `eval_004_two_briefs`
- `propose_decision_status` in `eval_008_update_after_budget_change`

Also add the negative tests work order 008 required but the current suite does not cover directly:

- missing top-level key
- anything other than twelve cases
- duplicate case ID
- unknown family
- unknown setup
- unknown invariant, forbidden-outcome, and terminal assertion identifiers
- manifest case with no executor
- executor with no manifest case
- safety case with no forbidden outcome
- expected unique tools mismatch with exact sequence
- state-dependent mutation before required read
- executor call trace mismatch with the expected sequence

The existing strict Zod parsing and assertion-registry equality checks should remain. Do not parse expressions or use `eval`.

### 4. Make the revision invariant exact

`canonical_mutation_revision_discipline` currently allows every successful tool call to change revision by either zero or one. Its description says every successful mutation increments exactly once.

Use an explicit read-only tool set and mutating tool set. For each successful evaluated call:

- read-only tools must change revision by exactly zero and append exactly one read event
- mutating tools must change revision by exactly one and append exactly one event
- failed calls must change revision by zero and append zero events

Add a negative unit test that tampers one mutating call's recorded state transition or production result path and proves the case fails this exact invariant. Do not weaken the manifest description.

### 5. Expand the live-agent evidence contract

The current future `verified` schema lacks fields required by work order 008. Update both the Zod validator and `record.schema.json` so a future completed record requires:

- supported browser-agent name and exact browser version
- tested public or local URL
- app build identifier
- exact prompt ID for each case
- prompt text SHA-256 digest for each case
- observed tool sequence for each case
- tool-discovery evidence path
- result evidence path for each case
- verification UTC timestamp
- verifier label
- known deviations from deterministic expectations, represented explicitly even when empty

Keep the current record honestly `not_run`, with null environment and run-level evidence fields where appropriate, zero cases, and no fabricated paths. Add tests showing `not_run` validates and a claimed verified record missing each required provenance category fails.

The deterministic report and aggregate QA must continue to treat valid `not_run` as schema-valid but not as a passing live-agent evaluation.

### 6. Add the missing required QA evidence files

Work order 008 required these exact paths, but neither exists:

- `docs/qa-matrix.md`
- `artifacts/qa/008-evals/README.md`

Create both. `docs/qa-matrix.md` must map every item 10 requirement to its command, automated test or receipt, and current result. `artifacts/qa/008-evals/README.md` must record:

- deterministic report path
- manifest SHA-256
- expected-sequence SHA-256
- deterministic report SHA-256 from each of two consecutive runs
- exact 12-case, family, tool-call, and assertion totals
- bundle measurements against the exact specified limits
- complete command results and exact test counts
- live-agent `not_run` status and exclusion from pass counts
- visual artifact digest, file count, and byte count before and after `npm run qa`
- confirmation that accepted historical artifacts are byte-identical

Update `docs/hackathon-build/eval-qa.md`, `evals/README.md`, `evals/results/README.md`, and the unaccepted item 10 build-note section so every path, budget, digest, count, and claim is accurate. Keep item 10 unaccepted.

### 7. Make aggregate QA evidence unambiguous

Keep the current argument-safe sequential process and first-failure behavior. Correct the bundle command name and make the final JSON summary include:

- live-agent status
- `liveAgentIncludedInPassCount: false`
- visual digest before and after
- exact first failed step or null

Add an orchestration unit test that injects or exposes a failing child step without running the entire matrix, then proves later steps are not run and the first nonzero code is propagated. Refactor with a small injectable process runner if needed. Preserve SIGINT and SIGTERM child termination behavior.

Do not run visual capture commands in QA.

## Required verification

Run all of these in this order:

```text
npm run lint
npm run typecheck
npm test
npm run build
npm run check:bundle
npm run test:e2e
npm run test:a11y
npm run evals
sha256sum evals/results/deterministic-report.json
npm run evals
sha256sum evals/results/deterministic-report.json
npm run evals:live:validate
npm run qa
git diff --check
git diff --exit-code -- artifacts/visual-audit/003-baseline artifacts/visual-audit/004-context artifacts/visual-audit/005-evidence artifacts/visual-audit/006-decision artifacts/visual-audit/007-recovery
```

On macOS, use `shasum -a 256` if `sha256sum` is unavailable.

Also confirm:

- all twelve cases pass, split four explicit, four ambiguous, and four safety
- stdout has one line per case and the final summary
- both contract-source digests are in the report
- each success obeys exact read or mutation revision discipline
- each invalid call is atomic
- exactly nine tools register and cleanup reaches zero every case
- all required negative contract tests fail closed
- current live-agent status is `not_run` and contributes no pass
- source maps are generated, reported, and excluded from application-code budgets
- the visual artifact tree is byte-identical before and after the matrix
- no accepted historical artifact changed
- no direct state writer, raw persistence writer, `dangerouslySetInnerHTML`, secret, real customer data, or em dash character was added

## Required report

Return:

1. Exact files changed.
2. One response per acceptance blocker above.
3. Report schema fields, output path, and both source digests.
4. Per-case result table with exact call sequence, final revision, ledger delta, and pass state.
5. Exact negative contract tests added and how each fails closed.
6. Live-agent schema provenance fields and current status.
7. Bundle measurements, exact limits, source-map handling, and output files.
8. Every command with pass or fail and exact counts.
9. Both consecutive deterministic report hashes.
10. `npm run qa` result and visual artifact hash before and after.
11. Remaining item 10 risks or one concrete blocker.

## Stop condition

Stop when every correction and verification above is complete, or at the first concrete blocker after preserving diagnostics. Return the report to Codex. Do not deploy, commit, push, begin item 11, or claim acceptance.
