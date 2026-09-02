# Cursor work order 015: make submission state and evidence lifecycle exact

## Objective

Make every current launch and submission document tell the same, accurate lifecycle story.

The authenticated Devpost account now has project shell `1402028`, but it is still Untitled, empty,
has no video, and is in `submission_pre_draft`. Nothing has been submitted. The repository has no
local Devpost journey-state file. Several documents still say no official draft exists, which is
now stale.

The public Cloudflare release and public GitHub state are also older than the current local release
candidate. The verified public baseline has 423 unit and component tests, 38 end-to-end tests, and
48 accessibility checks. The current local candidate has 447 unit and component tests, 45
end-to-end tests, 52 accessibility checks, and 12 deterministic eval cases with 60 assertions. The
current local work is not committed, pushed, deployed, or reflected in Devpost.

Correct those boundaries everywhere a judge, collaborator, or future release operator would use as
current state. Do not rewrite archival handoffs. Do not change application code, tests, visual
assets, release receipts, external systems, or the actual Devpost project.

## Repository and starting state

Work only in:

`/Users/treyharnden/Projects/proofroom-webmcp`

Preserve the entire dirty working tree, including accepted work orders 011 through 014a and
autoresearch run 12. Do not reset, clean, restore, or overwrite unrelated work.

Read completely before editing:

- `AGENTS.md`
- `/Users/treyharnden/Projects/ElevationEngine/TREY_VOICE.md`, read-only
- `README.md`
- every current file under `docs/submission/`
- `docs/hackathon-build/checklist.md`
- `docs/hackathon-build/build-notes.md`
- `docs/hackathon-build/eval-qa.md`
- `artifacts/release/release-receipt.json`
- `artifacts/release/README.md`
- `evals/results/README.md`
- `evals/live-agent/current.json`
- `handoffs/cursor/010-open-source-launch-package.md`
- `handoffs/cursor/010a-launch-package-audit-corrections.md`
- `handoffs/cursor/010b-demo-runtime-correction.md`
- `handoffs/cursor/013-judge-runway-and-agent-rehearsal.md`
- `handoffs/cursor/014-agent-input-provenance.md`

## Non-negotiable truth boundary

Keep these four states separate:

1. **Verified public baseline**: the deployed Cloudflare build and public repository evidence tied to
   the recorded deployment and evidence commits.
2. **Verified local candidate**: the current dirty working tree after work order 014a and
   autoresearch run 12. It passed local QA but is not public.
3. **External project shell**: authenticated Devpost project `1402028`, currently Untitled, empty,
   no video, `submission_pre_draft`, and not submitted.
4. **Future external actions**: commit, push, deployment, public parity verification, live-agent
   rerun, video recording and upload, Devpost population, and final submission.

Never infer one state from another. Do not call the current local candidate live, public, released,
committed, pushed, deployed, submitted, or visible to judges.

## 1. Replace stale Devpost status language

Update the current-state notices in:

- `README.md`
- `docs/submission/README.md`
- `docs/submission/project-story.md`
- `docs/submission/demo-script.md`
- `docs/submission/demo-shot-list.md`
- `docs/submission/screenshot-plan.md`
- `docs/submission/launch-checklist.md`

Use concise wording with this exact meaning:

> Local preparation only. Authenticated Devpost project `1402028` exists as an Untitled, empty
> pre-draft shell. It has no video and has not been submitted.

The repository still has no local Devpost journey-state file. State that separately where useful.

Replace the launch-checklist action to create a draft with an unchecked action to populate the
existing project shell. Keep registration or rules acknowledgement unchecked unless direct evidence
proves completion. Do not imply that inspecting the project shell acknowledged the rules.

Do not edit historical work orders that accurately describe the state at the time they were issued.

## 2. Separate public release proof from local candidate proof

In the root README proof table and verification sections:

- label 423 unit/component, 38 end-to-end, and 48 accessibility checks as the verified public
  baseline tied to the recorded release receipt
- add a separate current local candidate row with 447 unit/component, 45 end-to-end, 52
  accessibility, and 12 deterministic eval cases with 60 assertions
- state that the current local candidate is not committed, pushed, deployed, or reflected in
  Devpost
- keep the live URL and recorded deployment identifiers unchanged
- keep natural-language browser-agent selection as `not_run`

Do not replace historical release-receipt counts with local counts. Do not imply that public
verification covers the new landing page, room guide, plain-language work, or staging-template
provenance change.

In `docs/submission/launch-checklist.md`, redesign the status sections if needed so a reader can
scan:

- what the released baseline proves
- what the current local candidate proves
- what is prepared but not externalized
- what still requires Trey or explicit authorization

Move any claim that the current judge-first package is committed and public into accurate baseline
wording or mark the current candidate externalization step unchecked. Keep the latest local QA
counts and the older public counts visibly distinct.

## 3. Fix submission-package internal contradictions

Resolve current-state contradictions without rewriting the full demo script yet.

At minimum:

- `docs/submission/demo-script.md` must not say generated narration timing is pending if the launch
  checklist records a completed 126.4 second measured rehearsal for the 272-word script
- label that timing evidence as belonging to the current script only if the script text and 272-word
  count still match; otherwise recalculate the spoken block word count and rerun the same local
  `say` timing method documented by work order 010b
- do not claim a human-paced live rehearsal, final recording, upload, or public video
- keep video recording, upload, playback verification, Devpost population, and final submission
  unchecked
- keep the live-agent state `not_run`; the blocked blind attempt is discovery evidence, not a pass

If timing must be regenerated, use `/tmp` for the audio artifact and do not add it to the repository.

## 4. Add a compact lifecycle snapshot

Add one compact current-state table to `docs/submission/README.md` or
`docs/submission/launch-checklist.md`. Use these rows:

- Public baseline
- Local candidate
- Devpost shell
- Video
- Live natural-language agent
- Final submission

Each row must say `verified`, `prepared`, `not_run`, `empty`, or `incomplete` precisely and identify
the next required proof. Keep this small and factual.

## 5. Update only genuinely current build notes

Update `docs/hackathon-build/checklist.md` or `docs/hackathon-build/build-notes.md` only where they
purport to state the current state. Preserve historical release evidence and dated statements.

Do not add external project-shell facts to generated release receipts or deterministic eval
artifacts.

## Expected files

- `README.md`
- `docs/submission/README.md`
- `docs/submission/project-story.md`
- `docs/submission/demo-script.md`
- `docs/submission/demo-shot-list.md`
- `docs/submission/screenshot-plan.md`
- `docs/submission/launch-checklist.md`
- optionally the smallest necessary current-state section in `docs/hackathon-build/checklist.md` or
  `docs/hackathon-build/build-notes.md`

No runtime, test, dependency, generated eval, visual artifact, release receipt, deployment, or
external state changes.

## Acceptance gates

Run and report exact results for:

```text
npm run lint
npm run typecheck
npm run test
npm run evals
npm run evals:live:validate
npm run build
npm run check:bundle
git diff --check
```

Also run targeted claim checks and report their output:

```text
rg -n "No official Devpost draft exists locally|Create an official Devpost form draft" README.md docs/submission
rg -n "423|38 end-to-end|48 accessibility|447|45 end-to-end|52 accessibility|60 assertions" README.md docs/submission docs/hackathon-build
rg -n "submitted|uploaded|deployed|committed|pushed|not_run|submission_pre_draft|1402028" README.md docs/submission
```

The first command must return no current-state hits. Review every hit from the other commands in
context rather than treating a string match as proof.

Confirm:

- no em dash characters
- no eyebrow-headline-dek pattern was introduced
- every Devpost statement matches the verified external shell facts above
- public and local QA counts are labeled separately
- no link target was broken
- no historical handoff was rewritten
- no commit, push, deploy, upload, or Devpost mutation occurred

## Return format

Return:

1. summary
2. files changed
3. before and after lifecycle table
4. exact public-baseline and local-candidate claims
5. Devpost and video status
6. exact command results and counts
7. claim-check output summary
8. known incomplete external steps
9. git status summary
10. recommendation for Codex acceptance

Stop when the documentation lifecycle is internally consistent and all gates pass, or at the first
concrete blocker after preserving diagnostics. Do not start another work order.
