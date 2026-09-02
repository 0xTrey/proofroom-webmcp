# Cursor work order 015a: correct the final demo timing evidence

## Objective

Correct one factual defect in work order 015.

The exact spoken-word extraction command from work order 010b returns 274 words for the current
`docs/submission/demo-script.md`, not 271:

```text
awk '/^## 0:00/{started=1} started && /^> /{sub(/^> /, ""); print}' docs/submission/demo-script.md | wc -w
```

The final public-baseline wording added three words after the timing measurement. Make the final
spoken text, word count, arithmetic duration, generated narration duration, and remaining allowance
agree exactly.

## Boundary

Work only in `/Users/treyharnden/Projects/proofroom-webmcp`.

Read:

- `AGENTS.md`
- `/Users/treyharnden/Projects/ElevationEngine/TREY_VOICE.md`, read-only
- `handoffs/cursor/010b-demo-runtime-correction.md`
- `handoffs/cursor/015-submission-state-and-evidence-parity.md`
- `docs/submission/demo-script.md`
- every current file that contains `271-word`, `271 words`, `133.0 seconds`, or `32.0 seconds`

Preserve the full dirty working tree. Do not touch application code, tests, generated evals, release
receipts, visual assets, deployment, Devpost, or unrelated documentation.

## Required correction

In the final spoken block, preserve the verified-public-baseline distinction while removing exactly
three unnecessary words. This wording is acceptable:

> UI and WebMCP share one RoomActions layer, so the same rules and activity ledger govern both paths.
> Public baseline checks passed 423 unit and component tests, 38 end-to-end tests, 48 accessibility
> checks, and 12 evals. The live app and public MIT repository are linked. Natural-language selection
> was not run.

Use the exact final wording that produces a truthful total under the established `wc -w` rule. Do
not report 271 unless the exact command returns 271 on the final file.

After the text is final, run this exact timing command from the repository root:

```text
say -r 135 -o /tmp/proofroom-demo-cursor-audit-015a.aiff "$(awk '/^## 0:00/{started=1} started && /^> /{sub(/^> /, ""); print}' docs/submission/demo-script.md)"
afinfo /tmp/proofroom-demo-cursor-audit-015a.aiff
rm /tmp/proofroom-demo-cursor-audit-015a.aiff
```

Update every current timing claim to the exact final:

- spoken word count
- simple 135 word-per-minute arithmetic
- measured generated narration duration, rounded to one decimal only after retaining the raw value
  in the return report
- allowance remaining to the 165 second stop

Expected current files are:

- `docs/submission/demo-script.md`
- `docs/submission/launch-checklist.md`
- `docs/hackathon-build/checklist.md`

Touch another file only if it contains one of the stale timing claims.

## Acceptance gates

Run and report exact results for:

```text
awk '/^## 0:00/{started=1} started && /^> /{sub(/^> /, ""); print}' docs/submission/demo-script.md | wc -w
npm run lint
git diff --check
rg -n "271-word|271 words|133\.0 seconds|32\.0 seconds|274-word|274 words" README.md docs
```

Confirm:

- the word-count command and the timing table agree
- the measured audio was generated from the final text, not an earlier revision
- the measured duration is at most 140 seconds
- the public-baseline label remains explicit
- no em dash characters
- no commit, push, deploy, upload, or Devpost mutation

Return the exact final spoken word count, raw and rounded audio duration, arithmetic duration,
remaining allowance, files changed, command results, and git status summary. Stop after this one
correction.
