# Cursor work order 010a: launch package audit corrections

## Objective

Correct the launch-package issues found in Codex audit. Keep the accepted information architecture and product claims. This remains documentation-only and external-state-safe.

Do not modify runtime code, tests, dependencies, deployment files, release receipts, visual artifacts, Devpost, YouTube, or external state. Do not commit or push. Use no em dash characters.

## Source boundary

- Repository: `/Users/treyharnden/Projects/proofroom-webmcp`
- Read work order 010 and every current file under `docs/submission/`.
- Read and follow `/Users/treyharnden/Projects/ElevationEngine/TREY_VOICE.md`.
- You may edit only:
  - `README.md`
  - `docs/submission/**`
  - `docs/hackathon-build/checklist.md`
- The untracked work orders are Codex-owned inputs. Do not edit them.

## 1. Give the demo real operational slack

The current script has 412 spoken words. At 150 words per minute it consumes all 165 seconds of the 2:45 target, leaving no room for live clicks, page transitions, proof holds, or natural pauses.

Rewrite `docs/submission/demo-script.md` to:

- contain 300 to 330 spoken words, excluding headings, timestamps, action cues, and the local-preparation notice
- target a final runtime of 2:35 to 2:45
- budget the spoken copy at a conservative 135 words per minute
- leave at least 20 seconds total for unvoiced live interactions, proof holds, and tab transitions
- retain every required proof beat from work order 010
- use natural, thesis-first speech rather than compressed lists
- end by 2:45, not 2:50

Add a compact timing budget near the top with spoken words, assumed speaking rate, estimated speech time, interaction/pause allowance, and target final duration. Make the segment timestamps internally consistent with the script and operational pauses.

Update `docs/submission/demo-shot-list.md` so every shot time aligns with the revised script. Reduce unnecessary live interaction density. It is acceptable to pre-position the CFO and CISO brief state or use one saved brief on screen as long as the narration does not claim unseen actions were performed live. Keep staging and both human approvals live.

## 2. Correct evidence provenance

In `docs/submission/launch-checklist.md`, do not say the release receipt records the final evidence commit. The release receipt records the deployment commit and Cloudflare deployment version. Git history establishes evidence commit `cb51518c545b8f498f9938e2054e729a60abb328`.

State those as separate evidence facts. Search all changed docs for similar attribution errors and correct them without weakening the real claim.

## 3. Make verification commands safe to copy

In `README.md`, the native verifier example must not write to the accepted committed receipt path. Remove `PROOFROOM_NATIVE_OUTPUT` from the copyable command so it prints a fresh result without altering accepted evidence. Keep the public URL variable and command.

Review the other copyable commands for unintended durable or external mutation. Keep `npm run deploy` clearly labeled as an intentional external mutation, not part of ordinary local QA.

## 4. Add submission-package navigation and build provenance

Create `docs/submission/README.md` as a compact index. It must begin with the same local-preparation disclosure and link to the story, demo script, shot list, screenshot plan, and launch checklist. Explain which artifact is for understanding, rehearsal, capture, image selection, and state tracking.

Add a compact `Demo and challenge package` section near the end of the root README that links to this index and the demo script. Keep the root README judge-first and avoid duplicating the full submission copy.

Add a short, truthful `Build process` subsection to `docs/submission/project-story.md`:

- Codex owned research, product strategy, acceptance criteria, work orders, adversarial audits, and final release verification
- Cursor CLI performed the primary implementation passes and returned structured milestone reports
- accepted work was gated by tests, visual evidence, native browser evidence, and release receipts
- link to `../../handoffs/cursor/` as the reviewable work-order trail

Do not frame automation as evidence of product quality by itself. Quality claims must remain tied to the actual gates.

## 5. Verification

Run:

```text
npm run lint
git diff --check
git status --short
```

Also prove:

- the demo script has 300 to 330 spoken words under the stated counting rules
- at 135 words per minute, computed speech time plus the documented interaction allowance fits the stated target
- every demo-shot timestamp aligns with the script
- every repository-relative link and image exists
- the copied native verifier command does not name `artifacts/release/native-webmcp.json`
- release receipt and Git-history claims are attributed separately
- no em dash character exists in changed docs
- only the allowed source boundary changed in this correction pass

## Required report

Return:

1. Exact files changed in this correction pass.
2. Final spoken word count, conservative speech time, interaction allowance, and final target.
3. Evidence-provenance correction.
4. Safe-command correction.
5. New navigation and build-process content.
6. Exact checks and results.
7. One remaining risk or blocker.

## Stop condition

Stop when every audit correction passes or at the first concrete blocker after preserving diagnostics. Return the report to Codex. Do not commit, push, deploy, or touch external state.
