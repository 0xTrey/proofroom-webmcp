# Item 10 QA matrix

Checklist item 10 is accepted. This matrix records the executable evidence produced by work orders
008 and 008a and independently reproduced by Codex, without making deployment or public-browser
claims.

| Requirement | Command | Automated test or receipt | Current result |
| --- | --- | --- | --- |
| Exactly twelve typed cases, four per family | `npm test` and `npm run evals` | `tests/evals/runner.test.ts`, `evals/results/deterministic-report.json` | PASS: 12 total, 4 explicit, 4 ambiguous, 4 safety |
| Strict manifest and sequence identifiers | `npm test` | fail-closed contract cases in `tests/evals/runner.test.ts` | PASS |
| Known read-before-mutation dependencies | `npm test` | dependency-order tamper test in `tests/evals/runner.test.ts` | PASS |
| Exact executor call traces | `npm test` and `npm run evals` | trace-mismatch test and every case receipt | PASS: 41 calls |
| Production actions and model-context shim | `npm run evals` | per-call receipts and nine-name cleanup receipts | PASS |
| Exact read, mutation, and failure revision discipline | `npm test` and `npm run evals` | tampered-transition test and `canonical_mutation_revision_discipline` | PASS |
| Every invariant, forbidden outcome, and terminal assertion executes | `npm test` and `npm run evals` | assertion registry equality and 58 assertion receipts | PASS |
| Stable bounded machine receipt | `npm test`, two `npm run evals` runs | `evals/results/deterministic-report.json` | PASS |
| Both contract-source digests in the receipt | `npm run evals` | report `contract` object | PASS |
| Exactly nine ordered tools and no approval tool | `npm test` and `npm run evals` | report `tools`, registry tests, cleanup receipts | PASS |
| Live-agent evidence remains honest and separate | `npm run evals:live:validate` | `evals/live-agent/current.json` | VALID `not_run`, excluded from pass counts |
| Future live records require complete provenance | `npm test` | `tests/evals/liveAgent.test.ts`, `record.schema.json` | PASS |
| Required client and Worker output exists | `npm run build` and `npm run check:bundle` | bundle report `requiredOutputs` | PASS |
| JavaScript, CSS, and individual asset budgets | `npm run check:bundle` | `tests/qa/bundleBudget.test.ts` and bundle report | PASS |
| Source maps and fonts reported outside code gzip totals | `npm run check:bundle` | bundle report `reportedExcludedAssets` | PASS |
| Canonical shim journey matches deterministic receipt | `npm run test:e2e` | `tests/e2e/qaCoverage.spec.ts` | PASS |
| Target UI states have no runtime or request failures | `npm run test:e2e` | `tests/e2e/qaCoverage.spec.ts` | PASS |
| Accessibility, width, keyboard, and reduced-motion gates | `npm run test:a11y` and `npm run test:e2e` | accepted Playwright suites | PASS |
| Aggregate QA is sequential and stops on first failure | `npm test` and `npm run qa` | `tests/qa/qaOrchestration.test.ts` | PASS |
| Accepted visual artifacts remain byte-identical | `npm run qa` and historical artifact diff | QA before and after digest | PASS |
| Repository diff has no whitespace errors | `git diff --check` | command result | PASS |

The current live-agent state is schema-valid evidence that no supported browser-agent selection run
was performed. It is not an eval pass and does not contribute to the 12 deterministic passes.
