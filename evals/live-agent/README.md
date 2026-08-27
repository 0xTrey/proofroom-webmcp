# Live browser-agent evidence

This slot is separate from the deterministic executable eval suite. The deterministic suite proves
the production tool definitions, strict schemas, shared actions, state transitions, invariants, and
safe receipts through the model-context shim. It does not prove that an external browser agent will
select the intended tools from a natural-language prompt.

`current.json` therefore remains `not_run`. That status is valid evidence of an unverified boundary,
not a passing result, and it contributes zero passes to `npm run evals` or `npm run qa`.

To replace it after a real run:

1. Use an eligible browser that exposes a live WebMCP-capable agent.
2. Run all twelve prompts from `evals/manifest.json` against a clean canonical room per case.
3. Record the supported browser-agent name, exact browser version, tested public or local URL, app
   build identifier, tool-discovery evidence path, verification UTC timestamp, verifier label, and
   known deviations.
4. For every case, record the exact manifest prompt ID, matching prompt-text SHA-256, observed tool
   sequence, result evidence path, and outcome.
5. Set `status` to `verified` only when every case passed. Use `failed` when any case failed.
6. Validate the record with `npm run evals:live:validate`.

Do not infer, simulate, or backfill observed tool selection from the deterministic expected
sequences. The validator enforces structure and case coverage, but the operator remains responsible
for recording a real run.
