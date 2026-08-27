# Cursor work order 010b: measured demo runtime correction

## Objective

Correct the final demo timing after an independent generated-narration rehearsal. The 307-word script is 136.4 seconds by simple word-rate arithmetic, but macOS `say -r 135` rendered its punctuation and natural pauses at 153.781 seconds. That leaves only 11.2 seconds before the 2:45 stop and is not enough for live interaction.

Shorten the spoken script while preserving every required proof beat. Align the shot list with the new script. Do not change any other launch content unless necessary for timing consistency.

## Boundary

- Repository: `/Users/treyharnden/Projects/proofroom-webmcp`
- Read work orders 010 and 010a and the current demo script and shot list.
- Read and follow `/Users/treyharnden/Projects/ElevationEngine/TREY_VOICE.md`.
- You may edit only:
  - `docs/submission/demo-script.md`
  - `docs/submission/demo-shot-list.md`
- Use no em dash characters.
- Do not commit, push, deploy, or touch external state.

## Corrections

1. Reduce spoken copy to 270 to 285 words under the existing counting rule.
2. Preserve these proof beats:
   - problem and one-room thesis
   - fictional-data disclosure
   - staged context plus visible human approval
   - one supported requirement plus unknown EU residency
   - untrusted testimonial quarantine
   - visible ROI assumptions plus evidence-honest stakeholder synthesis
   - not-ready decision proposal plus visible human approval and receipt
   - real native `document.modelContext`, nine tools, two executions, reload persistence, no shim
   - shared `RoomActions`, exact test/eval totals, live app, public MIT repository, natural-language selection not run
3. Keep the final target at 2:35 to 2:45, ending by 2:45.
4. Update the timing table with the exact new word count. Report simple 135-word-per-minute math, but also record the measured generated-narration gate.
5. Run this exact independent timing command from the repository root:

```text
say -r 135 -o /tmp/proofroom-demo-cursor-audit.aiff "$(awk '/^## 0:00/{started=1} started && /^> /{sub(/^> /, ""); print}' docs/submission/demo-script.md)"
afinfo /tmp/proofroom-demo-cursor-audit.aiff
rm /tmp/proofroom-demo-cursor-audit.aiff
```

The `estimated duration` must be at most 140.0 seconds. That leaves at least 25 seconds before the 2:45 stop for live clicks, holds, and transitions.
6. Align all script segments and shot timestamps. It is acceptable for narration to stop while a proof hold or click continues within a segment.

## Verification

Run:

```text
npm run lint
git diff --check
git status --short
```

Prove exact spoken word count, generated narration duration, remaining allowance to 165 seconds, contiguous script segments, aligned shot timestamps, no lost proof beat, no em dash, and only the two allowed files changed in this pass.

## Required report

Return exact files changed, word count, arithmetic duration, measured narration duration, remaining allowance, proof-beat confirmation, checks, and remaining risk.

## Stop condition

Stop when measured narration is no more than 140.0 seconds and all checks pass, or at the first concrete blocker. Do not commit or push.
