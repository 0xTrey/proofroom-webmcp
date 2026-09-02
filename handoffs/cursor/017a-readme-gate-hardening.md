# Cursor work order 017a: README gate hardening

## Outcome

Close the three bounded audit findings from work order 017:

1. Correct the buyer-profile outcome from staged context to approved context.
2. Make the README parity gate reject extended or altered current control labels instead of passing on substrings.
3. Make the local-link checker reject paths that resolve outside the repository, even when the external file exists.

Do not otherwise rewrite the README or broaden scope.

## Source boundary

Work only in:

- `README.md`
- `scripts/check-readme-parity.mjs`
- `docs/hackathon-build/checklist.md` only if its parity-gate description needs a factual correction

Do not change application code, package scripts, dependencies, test counts, gallery bytes, release receipts, lifecycle state, or any external system.

## Required corrections

### 1. Approval language

Change the outcome after `Use this buyer profile` from `the staged context the room uses` to `the approved context the room uses` or equally exact wording. Preserve the staging-before-approval explanation elsewhere.

### 2. Exact current-label enforcement

The current `readme.includes(label)` check passes an altered code token such as `` `Review decision STALE` `` because `Review decision` remains a substring.

Require each current UI control as an exact inline-code token in the README. For example, the required representation for `Review decision` is exactly `` `Review decision` `` with an immediate closing backtick. An extended token must fail.

Keep stale-label rejection at least as strict as it is now. A stale phrase anywhere in current instructions must fail, including inside a longer token.

Add no Markdown parser dependency.

### 3. Repository containment

For every local Markdown link or image target:

- resolve the target relative to the README directory;
- remove the fragment before resolution as today;
- prove the resolved lexical path is the repository root itself or a descendant;
- reject `..` traversal, absolute local paths outside the repo, and any target whose resolved path escapes the repository, even if that file exists;
- then check existence;
- keep `http`, `https`, and same-document fragment targets ignored.

Use Node built-ins only. Produce an actionable error containing the offending target.

## Required negative proof

Use isolated temporary material and leave no repository residue. Demonstrate nonzero exits with the expected specific failure for:

1. exact current token `` `Review decision` `` replaced by `` `Review decision STALE` ``;
2. an injected local Markdown link that traverses to an existing temporary file outside the temporary repo root;
3. one required gallery path replaced with a missing image path;
4. one stale control injected.

Also run the positive gate against the real README and prove it passes.

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

Verify the three gallery hashes before and after ordinary QA are identical. Confirm 447 unit/component, 45 end-to-end, 52 accessibility, 12 deterministic cases, and live-agent `not_run` remain unchanged.

## Stop conditions

Stop and report rather than loosening the gate if exact-token or repository-containment logic causes a false failure in the current README. Do not commit, push, deploy, record, upload, recapture, spend credits, or mutate Devpost.

## Return format

Return:

1. summary;
2. exact fixes;
3. positive and four negative gate results;
4. containment design;
5. files changed;
6. exact QA commands and counts;
7. gallery hash preservation;
8. lifecycle and contract invariants;
9. external actions not run;
10. git status and keep/revise recommendation.
