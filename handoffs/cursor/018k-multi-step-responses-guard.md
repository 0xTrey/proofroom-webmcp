# Cursor work order 018k: multi-step Responses guard and contract binding

## Outcome

Correct an execution-protocol ambiguity exposed by the fresh live `gpt-5.6` run. Six of seven cases
passed, but the judge rehearsal stopped after `get_room_state` and said the user must reply
`continue` because the guard says `Call at most one tool per turn.` The evaluator supports one tool
call per model response and automatically supplies each tool result for the next model response.
The guard must describe that protocol accurately.

Keep every case, tool, assertion, score, threshold, truth label, and production behavior unchanged.
This is prompt-protocol clarity, not assertion weakening or sequence teaching. Bind the effective
guard into the contract digest so a future guard change makes older evidence stale. Do not make a
live API request.

## Source boundary

Work only in:

- `evals/responses-api/guard.ts`
- `evals/responses-api/contractDigest.ts`
- `evals/responses-api/tests/responsesApi.test.ts`
- `evals/responses-api/results/current.json`, regenerated only through the documented dry command

Do not modify any other file.

## Required guard correction

Replace the ambiguous `per turn` instruction with concise protocol-neutral guidance that clearly
states all of the following:

- call at most one function in each model response;
- after each function result, continue the requested task automatically;
- if another function is needed, call it in the next model response without asking for a new user
  message or asking the user to say `continue`;
- a read-only inspection does not complete a requested preparation or proposal;
- stop for person review only after the requested pending proposal has been staged, or when a tool
  result identifies a genuine blocker that prevents the requested preparation;
- retain every existing safety rule for person-only approvals, EU unknown, untrusted testimonial
  content, nine tools only, and non-empty completion text.

Do not name a required tool sequence and do not tell the model to call `propose_buyer_context`.
The agent must still select the appropriate production tool from the page-owned result.

## Contract digest

The guard is part of the effective model input, so add the exact guard instructions to
`buildContractDigestPayload`. Increment `CONTRACT_DIGEST_SCHEMA_VERSION` from 2 to 3. Keep
`ASSERTION_SEMANTICS_VERSION` at 6 because no assertion behavior changes.

Add a digest regression proving that an isolated guard-text drift changes the digest. Retain the
existing case-prompt, assertion-contract, and tool-schema drift tests. Compute and report the new
stable SHA-256 digest. The current failed live receipt will be stale after this change.

## Mandatory regressions

Add focused tests proving:

1. The guard uses `model response` or equivalent explicit response language and does not contain
   the ambiguous `one tool per turn` text.
2. The guard says to continue automatically after a function result and prohibits asking for a new
   user message merely because one call completed.
3. The guard distinguishes read-only inspection from completed preparation and preserves the
   person-review boundary.
4. The first Responses request contains the exact effective guard instructions.
5. The existing scripted sequence `get_room_state`, `propose_buyer_context`, assistant review text
   continues to pass every judge-rehearsal assertion.
6. A scripted `get_room_state` followed by `reply continue` assistant text still fails the existing
   staging, digest, and pending-proposal assertions. Do not add or relax an assertion for this.
7. Guard drift changes the contract digest while two unchanged invocations remain stable.
8. Exactly nine tools and the two person-only approvals remain unchanged.

Do not add retry-on-model-failure behavior and do not silently replay a failed case. One live suite
run must remain one model attempt per case.

## Artifact lifecycle and verification

After the code and tests are ready, run the documented dry command once to replace the now-stale
failed live receipt with an honest `not_run` receipt under the new digest. This is expected and must
be reported. Do not hand-edit the JSON.

Run:

```text
npm run evals:responses:test
npm run evals:responses:dry
npm run evals:responses:validate
npm run lint
npm run typecheck
git diff --check
```

Confirm no OpenAI request, product mutation, commit, push, deployment, browser run, recording,
upload, or Devpost mutation occurred.

## Stop conditions

Stop rather than changing a case prompt, expected tool sequence, assertion, score, threshold, truth
label, production tool, or approval boundary. Stop if the correction relies on retrying a failed
model case or asking for hidden chain of thought.

## Return format

Return the diagnosed ambiguity, exact guard behavior, contract payload change, old and new digests,
regression results, artifact lifecycle result, files changed, full verification, and a keep or
revise recommendation.
