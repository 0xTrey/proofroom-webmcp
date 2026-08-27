# Item 10 executable eval and QA evidence

Checklist item 10 is accepted. This receipt records local deterministic and browser-shim evidence
independently reproduced by Codex. It contains no deployment or live browser-agent selection claim.

## Deterministic eval receipt

- Report: `evals/results/deterministic-report.json`
- Manifest SHA-256: `04f622a2b5358bd7532df4a72c5d81f3e35bb143f177561399f8e6bd2dfb4f2d`
- Expected-sequence SHA-256: `4be96767aca3f2604570e4a9b9ec3f89c1b77fcce71c2338d6582ab392fb8df2`
- Consecutive run 1 report SHA-256:
  `0edab70eaf1a9899bbeb426b0b5dfdc4896e49d207b5a32bff2c53c6ca010b06`
- Consecutive run 2 report SHA-256:
  `0edab70eaf1a9899bbeb426b0b5dfdc4896e49d207b5a32bff2c53c6ca010b06`
- Cases: 12 passed, 0 failed
- Families: 4 explicit, 4 ambiguous, 4 safety
- Tool calls: 41
- Executable assertions: 58
- Registered production tools: 9, cleaned back to 0 after every case

## Bundle and output evidence

`npm run check:bundle` passed after the production build.

| Measurement | Actual | Limit | Result |
| --- | ---: | ---: | --- |
| Total client JavaScript gzip | 125,030 bytes | 153,600 bytes | PASS |
| Total client CSS gzip | 23,219 bytes | 40,960 bytes | PASS |
| Largest individual client JavaScript raw | 441,935 bytes | 614,400 bytes | PASS |

Required output was present: client HTML, client JavaScript, client CSS, Worker entry, and Worker
configuration. Two source maps totaling 1,840,277 raw bytes and 64 self-hosted font files totaling
660,040 raw bytes were reported and excluded from application-code gzip totals.

## Command results

| Command | Result | Exact count or evidence |
| --- | --- | --- |
| `npm run lint` | PASS | repository writing guard passed |
| `npm run typecheck` | PASS | 0 TypeScript errors |
| `npm test` | PASS | 325 tests |
| `npm run build` | PASS | Worker and client production builds with source maps |
| `npm run check:bundle` | PASS | 3 enforced budget categories, 5 required output categories |
| `npm run test:e2e` | PASS | 38 tests |
| `npm run test:a11y` | PASS | 48 tests |
| `npm run evals` | PASS | 12 cases, 41 calls, 58 assertions |
| `npm run evals:live:validate` | PASS | schema-valid `not_run` record |
| `npm run qa` | PASS | all 10 sequential steps completed |
| `git diff --check` | PASS | no whitespace errors |
| accepted historical artifact diff | PASS | no tracked byte changes |

## Live-agent boundary

`evals/live-agent/current.json` is `not_run`. Its environment and evidence fields are null, its case
list is empty, and it contributes no deterministic or aggregate QA pass. A future verified record
must supply browser-agent, browser-version, tested-URL, build, prompt, tool sequence, evidence path,
verification time, verifier, and deviation provenance.

## Accepted visual artifact integrity

Before `npm run qa`:

- SHA-256: `3ae653285619e5977c69f5ad472866da40b1eaa026911946d0b77e1ef00110fe`
- Files: 49
- Bytes: 13,924,973

After `npm run qa`:

- SHA-256: `3ae653285619e5977c69f5ad472866da40b1eaa026911946d0b77e1ef00110fe`
- Files: 49
- Bytes: 13,924,973

The before and after trees are byte-identical. The explicit git diff check across
`003-baseline`, `004-context`, `005-evidence`, `006-decision`, and `007-recovery` is empty.
