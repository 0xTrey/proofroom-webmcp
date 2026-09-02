# Cursor work order 019: release-candidate evidence parity gate

## Outcome

Build a fail-closed, machine-readable release-candidate gate that prevents ProofRoom's current local
candidate, an older public deployment, native WebMCP proof, Responses API proof, and compatible
browser-agent proof from being conflated.

The gate must make the honest current result `blocked`: the working tree is dirty, the verified
public release is tied to an older commit, and compatible natural-language browser-agent evidence
is still `not_run`. It must say exactly why. A local pass, Responses pass, or older public baseline
must never make recording or submission evidence-ready by itself.

This is local tooling and documentation only. Do not commit, push, deploy, call a remote API, run a
live browser agent, record, upload, or mutate Devpost.

## Source boundary

Work only in:

- `scripts/qa.ts`
- new `scripts/rc-gate.ts` and tightly related local helper modules under `scripts/` if needed
- `artifacts/rc-gate/**`
- `package.json`
- `tests/qa/qaOrchestration.test.ts`
- new `tests/release/rcGate.test.ts` and fixture helpers under `tests/release/**`
- bounded factual updates to `artifacts/release/README.md`, `docs/hackathon-build/eval-qa.md`,
  `docs/submission/README.md`, and `docs/submission/launch-checklist.md`

Do not modify application source, production tools, deterministic cases or runner, Responses cases
or evaluator, live-agent schema or artifact, existing release evidence, accepted screenshots,
top-level README, dependencies, or external systems.

## Evidence lanes

Model five independent lanes in the combined receipt:

1. `localCandidate`
2. `publicDeployment`
3. `nativeWebMcp`
4. `responsesApi`
5. `compatibleBrowserAgent`

Also model deterministic-eval evidence and product invariants as required gates. Each lane must have
its own status, source path, digest, key identifiers, and blocking reasons. Do not use one lane to
satisfy another.

The Responses lane proves only local OpenAI Responses model selection over adapted copies of the
nine production schemas and shared actions. It never proves `document.modelContext`, page-origin
execution, native WebMCP discovery, compatible browser-agent selection, deployment, or public URL
parity.

## Local QA receipt

Extend `scripts/qa.ts` only enough to support an explicit `--write-receipt` mode. Preserve the
current `npm run qa` behavior when the flag is absent.

Add `evals:responses:validate` to the exact QA step matrix after deterministic evals and before the
live-agent record validator. The new receipt mode must:

- run every existing QA step plus the Responses validator;
- capture ordered step IDs, commands, exit codes, and pass or fail status without storing raw
  command output;
- capture `HEAD` as a full 40-character Git commit;
- capture filtered `git status --porcelain=v1 -z` before and after QA, excluding only
  `artifacts/rc-gate/local-qa.json` and `artifacts/rc-gate/current.json`;
- store SHA-256 digests and entry counts for those filtered status snapshots, not raw file names;
- require the before and after status digests to match for a passing QA receipt;
- record whether the filtered worktree was clean, but do not make dirtiness turn successful local
  tests into a false test failure;
- retain the accepted visual tree before and after digest, file count, byte count, and byte-identical
  result;
- record SHA-256 digests for `evals/results/deterministic-report.json`,
  `evals/responses-api/results/current.json`, and `evals/live-agent/current.json` after their
  validators run;
- write `artifacts/rc-gate/local-qa.json` atomically in the same directory with restrictive file
  mode where supported, even on a failed QA run;
- never include absolute paths, environment variables, credentials, cookies, command output, or
  browser storage.

Add a strict schema or strict Zod validator for the local QA receipt. Cap strings, arrays, and the
whole artifact. The receipt's `status` may be `passed` or `failed`. It is evidence of local command
execution only, never deployment proof.

Add package script:

```text
qa:receipt
```

## Combined RC receipt

Add `scripts/rc-gate.ts` with pure, dependency-injected classification functions plus a thin CLI.
The pure functions must be the primary test surface and must not spawn commands or use the network.

Write `artifacts/rc-gate/current.json` atomically and validate it against a strict committed
`artifacts/rc-gate/rc-gate.schema.json` plus an equivalent handwritten or Zod validator. Also add a
short `artifacts/rc-gate/README.md` explaining lifecycle boundaries.

The combined receipt must contain at least:

- schema version, generated timestamp, and `ready` or `blocked` status;
- candidate `HEAD`, filtered clean-tree flag, filtered status digest and entry count;
- local QA receipt digest, step summary, candidate commit, and before or after workspace parity;
- deterministic report digest, manifest digest, expected-sequence digest, exact 12/12 cases,
  60 assertions, and exact nine tool names;
- Responses status, model, start and completion timestamps when completed, seven case IDs, aggregate
  score and pass or fail counts, artifact digest, `contractDigest`, and fixed truth labels;
- public release ID, state, source and deployment commits, deployment ID, public origin, deployed and
  verified timestamps, final release-receipt digest, HTTP receipt digest, and native receipt digest;
- native browser product and version, headed flag, exact nine tools before and after reload,
  execution status, public origin, entry path, entry SHA-256 and byte count, CSP parity, and
  application error counts;
- compatible browser-agent status, browser identity, tested URL, app build identifier, verified
  timestamp, 12-case pass or fail counts, artifact digest, and evidence paths when completed;
- product invariants: exact ordered nine `TOOL_NAMES`, the exact seven-name
  `HUMAN_ONLY_ACTION_NAMES` set from production, the two judge-visible approval gate names
  `approve_buyer_context` and `approve_decision`, every human-only action absent from tool names,
  and fresh canonical room EU-residency status `unknown`;
- canonical, unique blocking-reason codes and short bounded messages;
- `recordingEvidenceReady` and `submissionTechnicalEvidenceReady` booleans derived from the exact
  same blocker set.

The readiness booleans are technical evidence gates only. They are not authorization to record,
upload, populate Devpost, or submit.

Do not persist tool inputs, model reasoning, full assistant text, raw git status paths, raw browser
logs, absolute paths, or credentials.

## Parity and freshness rules

`status` may be `ready` only when all of these are true:

- the filtered working tree is clean;
- the local QA receipt is `passed`, matches current `HEAD`, matches the current filtered status
  digest, and still matches the three current eval artifact digests;
- deterministic evidence validates at exactly 12 passed, 0 failed, 60 assertions, and nine exact
  tools, with current manifest and expected-sequence digests;
- Responses evidence validates as `passed`, all seven cases pass, aggregate score is at least 90,
  and its truth labels still deny native or compatible-browser proof while keeping EU unknown;
- the final release receipt validates independently with its referenced HTTP and native evidence;
- release preparation source commit, deployment commit, current candidate `HEAD`, and compatible
  browser-agent app build identifier are identical;
- the HTTP receipt origin, native receipt origin, compatible browser-agent tested origin, and final
  release public origin are identical credential-free HTTPS origins;
- native WebMCP evidence is passed, headed, exact-nine before and after reload, execution-passed,
  reload-verified, entry-integrity-passed, strict-CSP-matched, and linked by digest to the release;
- compatible browser-agent evidence validates as `verified`, contains all 12 exact manifest prompts,
  and every case passes;
- product invariants are exact: nine tools, all seven production human-only action names remain
  absent from the tool registry, the two judge-visible approval gate names remain present in that
  human-only set and absent from tools, and EU residency remains unknown.

Any missing, malformed, failed, stale, or mismatched lane must produce `blocked`. Validation errors
must become bounded reason codes, not stack traces or raw data.

Current older public receipts remain valid historical evidence. Classify them as `stale` relative
to the local candidate, never as invalid merely because a newer candidate exists.

## CLI and package scripts

Add:

```text
release:rc:refresh
release:rc:validate
release:rc:gate
```

Required behavior:

- `release:rc:refresh` reads and validates all local sources, generates the combined receipt, writes
  it atomically, prints a bounded lane summary, and exits zero when a structurally valid receipt is
  written even if its honest status is `blocked`;
- `release:rc:validate` validates the persisted receipt plus current local source parity, prints
  `READY` or `BLOCKED` with reason codes, and exits zero for a structurally valid honest `blocked`
  receipt;
- `release:rc:gate` performs the same validation but exits nonzero unless status is `ready`. This is
  the hard pre-recording and pre-submission technical gate.

No command may deploy, fetch a public URL, launch a browser, call OpenAI, alter current eval
artifacts, clear storage, create commits, push, record, upload, or touch Devpost.

## Mandatory fixture attacks

Use fixture-only pure tests. Do not depend on the current dirty worktree for test expectations.
Cover at least:

1. full ready parity;
2. dirty worktree;
3. missing, failed, stale-commit, changed-status, or changed-eval local QA receipt;
4. deterministic count, tool, manifest-digest, or expected-sequence-digest mismatch;
5. Responses `not_run`, `failed`, invalid, stale contract, wrong case totals, or forged truth label;
6. proof that a Responses pass cannot satisfy native or compatible-browser lanes;
7. public release source or deployment commit mismatch;
8. invalid final release receipt, missing referenced evidence, digest mismatch, or origin mismatch;
9. missing or invalid native receipt, tool mismatch, reload mismatch, failed execution, or entry
   integrity mismatch;
10. compatible browser agent `not_run`, failed, missing cases, prompt-digest mismatch, build mismatch,
    tested-origin mismatch, or any failed case;
11. tool count drift, any of the seven human-only actions exposed as a tool, wrong seven-name
    human-only action set, either judge-visible approval gate name missing, or EU status changed
    from unknown;
12. duplicate or noncanonical blocking reasons;
13. unknown keys, oversized strings or arrays, absolute paths, credential-bearing URLs, and
    secret-like values;
14. source state changing after receipt generation;
15. valid blocked receipt accepted by `validate` but rejected by the hard `gate`;
16. generated RC files excluded from workspace cleanliness without allowing any other dirty path,
    including a fixture with both generated RC files plus one unrelated dirty path.

Every test must assert the exact reason code or validation boundary, not only a generic failure.

## Honest current output

After tests pass, run `qa:receipt`, then refresh and validate the combined receipt. The expected
current status is `blocked`. At minimum it must report:

- dirty local worktree;
- verified public release commit does not match the current candidate;
- compatible browser-agent evidence is not verified.

If Responses is still `not_run` or failed at execution time, report that as an additional blocker.
Do not hand-edit the current receipt to get the expected reasons.

## Documentation

Add only factual lifecycle guidance:

- the exact three-command local flow: QA receipt, RC refresh, RC validate or hard gate;
- the gate separates local, public, native, Responses, and compatible browser-agent evidence;
- current `blocked` is expected and safe until external lifecycle work is authorized and reverified;
- a `ready` technical receipt still does not authorize recording, upload, Devpost population, or
  submission.

Do not replace the existing release receipt or imply the local candidate is deployed.

## Required verification

Run:

```text
npm run qa:receipt
npm run release:rc:refresh
npm run release:rc:validate
npm run release:rc:gate
PROOFROOM_RELEASE_RECEIPT=artifacts/release/release-receipt.json npm run release:receipt:validate
npm run evals:responses:validate
npm run evals:live:validate
npm run lint
npm run typecheck
npm run test
npm run build
npm run check:bundle
git diff --check
```

`release:rc:gate` must exit nonzero for the honest current blockers. Capture and report that expected
nonzero result without bypassing it. All other listed commands must pass.

Confirm exact product counts after the added tooling tests, exact 12 deterministic cases and 60
assertions, exact nine tools, the exact seven production human-only actions, the two judge-visible
approval gates, EU unknown, and no external mutation.

## Stop conditions

Stop rather than weakening the gate if a stale public receipt can appear current, Responses proof
can satisfy native or compatible browser evidence, generated output files make an otherwise clean
candidate permanently dirty, an existing historical release receipt becomes invalid, or the
current blocked reasons cannot be derived from real source files.

## Return format

Return:

1. summary;
2. local QA receipt design;
3. combined RC receipt schema and lane rules;
4. readiness and blocker derivation;
5. fixture attack matrix;
6. honest current receipt status and exact blockers;
7. files changed;
8. verification commands, counts, and expected hard-gate exit;
9. unchanged lifecycle and product invariants;
10. keep or revise recommendation and residual risks.
