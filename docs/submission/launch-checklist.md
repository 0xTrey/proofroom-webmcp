# ProofRoom launch checklist

> Local preparation only. Authenticated Devpost project `1402028` exists as an Untitled, empty
> pre-draft shell. It has no video and has not been submitted.

The four sections below are state labels, not a publishing plan. Checked items already have
repository evidence. Unchecked items remain incomplete. The repository has no local Devpost
journey-state file.

## Current lifecycle snapshot

| Area | Status | Next required proof |
| --- | --- | --- |
| Public baseline | verified | None for the recorded deployment; public counts stay tied to the release receipt |
| Local candidate | prepared | Commit, push, deploy, and rerun public verification after authorization |
| Devpost shell | empty | Populate project `1402028` with approved copy, URLs, screenshots, and video |
| Video | empty | Record, review, upload, and confirm playback |
| Live natural-language agent | not_run | Run an eligible browser agent against a compatible deployed build |
| Release-candidate gate | blocked | Run `npm run qa:receipt`, `npm run release:rc:refresh`, and `npm run release:rc:validate` |
| Final submission | incomplete | Complete Devpost population and submit after video and copy review |

## Verified public baseline

What the deployed Cloudflare build and public repository evidence prove today:

- [x] Public app responds at https://proofroom-webmcp.harnden-trey.workers.dev.
- [x] Public repository exists at https://github.com/0xTrey/proofroom-webmcp.
- [x] Repository license is MIT.
- [x] Production release receipt records deployment commit
  `82ee322b4e4e8c8658e8eed605431974d084afca` and Cloudflare deployment version
  `86b01690-7492-4a37-ae70-3c71d50f43c7`.
- [x] Git history establishes final evidence commit
  `cb51518c545b8f498f9938e2054e729a60abb328`.
- [x] Accepted screenshot artifacts exist for evidence, ROI, decision approval, and activity state.
- [x] The current local candidate gallery is captured at
  [`artifacts/visual-audit/016-submission-gallery/`](../../artifacts/visual-audit/016-submission-gallery/)
  and selected in [`screenshot-plan.md`](screenshot-plan.md). It is not deployed or uploaded.
- [x] Verified public automated results are 423 unit and component tests, 38 end-to-end tests, 48
  accessibility checks, and 12 deterministic evals passed.
- [x] Native headed Chrome evidence records exactly nine tools before and after reload with zero
  application console, page, request, and response errors.
- [x] Fictional-data disclosure and browser-local persistence limitations are documented.
- [x] The judge-first README and local challenge package are committed and visible in the public
  repository at the recorded deployment baseline.
- [x] A fresh public clone passed `npm ci`, lint, typecheck, all 423 unit and component tests, and the
  production build against that baseline.
- [x] Independent link review resolved all 38 local documentation links and three screenshot paths
  for the public baseline package.

Public verification does not cover the landing page, room guide, plain-language work, or
staging-template provenance changes in the current local candidate.

## Current local candidate

What the current dirty working tree proves locally. This work is not committed, pushed, deployed,
or reflected in Devpost.

- [x] Local QA passed with 483 unit and component tests, 45 end-to-end tests, 52 accessibility
  checks, and 12 deterministic eval cases with 60 assertions.
- [x] Submission-package navigation is prepared in [`README.md`](README.md).
- [x] Three accepted screenshots are selected, ordered, captioned, and given crop guidance in
  [`screenshot-plan.md`](screenshot-plan.md). The current local candidate uses the
  [`016-submission-gallery`](../../artifacts/visual-audit/016-submission-gallery/) set, which is not
  deployed or uploaded.
- [x] Challenge project story is prepared in [`project-story.md`](project-story.md).
- [x] Sub-three-minute spoken script is prepared in [`demo-script.md`](demo-script.md).
- [x] Recording sequence and recovery path are prepared in
  [`demo-shot-list.md`](demo-shot-list.md).
- [x] Fresh-clone setup, link checking, claim review, and measured narration timing have independent
  acceptance for the current script.
- [x] The 262-word script rendered at 129.0 seconds in a measured macOS `say -r 135` narration
  rehearsal for the current spoken block, leaving 36.0 seconds before the 2:45 stop for live
  actions and proof holds.

## Prepared but not externalized

- [ ] Commit and push the current local candidate after explicit authorization.
- [ ] Deploy the current local candidate and rerun public verification.
- [ ] Complete one human-paced live rehearsal against the public app before recording the final
  video.

## Still requires Trey or explicit authorization

- [ ] Record the final demo video.
- [ ] Review the final cut for URL legibility, fictional-data disclosure, two visible approvals,
  exact nine-tool proof, audio, cursor movement, and duration.
- [ ] Upload the final video to YouTube or another approved host.
- [ ] Confirm the uploaded video URL and playback permissions.
- [ ] Register for the Devpost challenge if registration is not already complete outside this
  repository.
- [ ] Populate authenticated Devpost project shell `1402028` with approved project copy,
  repository URL, live URL, screenshots, and final video URL.
- [ ] Read and acknowledge the current challenge and Devpost rules.
- [ ] Review every official form field for accuracy and fictional-data disclosure.
- [ ] Submit the official Devpost entry.
- [ ] Capture and preserve the official post-submit confirmation and final public entry URL.

Current official status: authenticated Devpost project `1402028` is Untitled, empty, in
`submission_pre_draft`, has no video, and has not been submitted. The repository has no local
Devpost journey-state file.
