# Cursor work order 010: open-source launch package

## Objective

Turn the accepted ProofRoom release into a judge-first open-source launch package. A new visitor must understand the problem, see why WebMCP is essential, open the live product, reproduce the project locally, inspect the trust boundaries, and follow a demo that fits under three minutes.

This is a documentation-only milestone. Do not change product code, tests, dependencies, release evidence, deployment configuration, visual artifacts, or the public deployment. Do not create or update an official Devpost form. No Devpost journey state exists locally, so every submission document must say it is local preparation and that nothing has been submitted.

## Source boundary

- Repository: `/Users/treyharnden/Projects/proofroom-webmcp`
- Read `README.md`, `docs/hackathon-build/{prd,spec,checklist}.md`, `docs/release-runbook.md`, `artifacts/release/release-receipt.json`, `artifacts/release/native-webmcp.json`, the visual-audit READMEs, and the accepted work orders 009 through 009c.
- Read and follow `/Users/treyharnden/Projects/ElevationEngine/TREY_VOICE.md` before writing.
- You may edit only:
  - `README.md`
  - `docs/submission/**`
  - `docs/hackathon-build/checklist.md`
  - this work order only if a progress appendix is necessary
- Use no em dash characters.
- Do not use an eyebrow, headline, and dek stack in any screenshot guidance or proposed visual.

## Fixed public facts

Use these facts exactly. Read the evidence files before writing so context is accurate.

- Live app: `https://proofroom-webmcp.harnden-trey.workers.dev`
- Public repository: `https://github.com/0xTrey/proofroom-webmcp`
- License: MIT
- Deployment commit: `82ee322b4e4e8c8658e8eed605431974d084afca`
- Final evidence commit: `cb51518c545b8f498f9938e2054e729a60abb328`
- Cloudflare deployment version: `86b01690-7492-4a37-ae70-3c71d50f43c7`
- Verification results: 423 unit and component tests, 38 end-to-end tests, 48 accessibility checks, and 12 deterministic evals passed
- Native verification browser: headed Chrome `151.0.7922.174`
- Native verification discovered exactly nine tools before and after reload through real `document.modelContext`, with no WebMCP shim
- Native verification executed `get_room_state` and `propose_buyer_context`; revision moved from 0 to 1 and the pending proposal persisted across reload
- Application errors during native verification: zero console, page, request, and response errors
- Chrome emitted two strict-CSP WebMCP testing registration notices, one at initial registration and one after reload. Treat these as explicitly classified browser diagnostics, not application errors. Never conceal them.
- Live natural-language browser-agent selection is `not_run` and must not be presented as passed
- Persistent state is local browser storage. There is no account, database, multi-user room, or model API call
- All named companies and all product, compliance, and testimonial content are fictional demo content
- Challenge links: `https://openai.com/webmcp-challenge/` and `https://webmcp.devpost.com/`
- Official Devpost status: no local journey state and nothing submitted

## 1. Rewrite the root README for judges and builders

Preserve the strongest technical material but change the order and presentation. Required sequence:

1. One primary `# ProofRoom` headline, followed immediately by one strong thesis paragraph and the live demo and repository links. Do not add an eyebrow above the headline.
2. A compact proof strip or table with live status, nine tools, two human approvals, test/eval totals, and MIT license. Avoid decorative badges that imply unverified CI or submission status.
3. A strong 60 to 90 second judge path for the public URL. It must work through visible UI even without WebMCP, then give the native WebMCP path separately.
4. Two or three repository-relative screenshots selected from these accepted 1600 by 900 artifacts, each with a concrete caption:
   - `artifacts/visual-audit/005-evidence/evidence-inspector-ev-011-1600.png`
   - `artifacts/visual-audit/006-decision/roi-preview-1600.png`
   - `artifacts/visual-audit/006-decision/approved-receipt-1600.png`
   - `artifacts/visual-audit/007-recovery/populated-ledger-1600.png`
5. The problem and why WebMCP changes the interaction model.
6. The human-agent trust boundary, including the two UI-only approvals and why no approval tool exists.
7. The exact nine-tool table with annotations and boundaries.
8. Enforced evidence rules and the deliberate unknown EU residency example.
9. Architecture and repository map.
10. Local setup, full QA commands, native Chrome verification command, Cloudflare deployment command, and public verification commands. Distinguish reproducible local commands from the already verified production evidence.
11. Verified release evidence with the exact counts and native facts above, plus links to the committed release receipts.
12. Honest limitations, fictional-data notice, challenge links, and MIT license.

Keep the README readable. Prefer short paragraphs, precise headings, and compact tables. Do not turn it into a wall of proof hashes. Link to the receipt for deep evidence.

## 2. Create a local challenge story package

Create `docs/submission/project-story.md` with reusable challenge copy. It must begin with a visible note that this is local preparation, no official Devpost draft exists, and nothing has been submitted.

Include:

- Project name
- One-sentence summary
- Problem
- Solution
- Why WebMCP is necessary rather than incidental
- What the agent can do
- What only the person can do
- How it was built
- Nine tool summary
- Evidence and security model
- Testing and release proof
- Limitations
- Live URL, public repo, and challenge links
- A short list of likely judge questions with evidence-backed answers

Do not invent Devpost field names, judging weights, team details, a YouTube URL, or submission status.

## 3. Create the sub-three-minute demo package

Create `docs/submission/demo-script.md` with a timed spoken script. Target 2:35 to 2:50, with an absolute maximum of 3:00 at a clear speaking pace. Include exact timestamps and on-screen actions. The script must cover:

- The buyer problem and thesis
- The Product view and fictional-data disclosure
- Staging and human approval of buyer context
- Evidence evaluation, including one supported requirement and the honest EU residency gap
- ROI and a stakeholder brief
- Decision proposal and visible human approval
- Native WebMCP discovery and the nine tools
- The trust boundary, architecture, test proof, live URL, and public repository

The script must never claim a natural-language live agent run has passed. It can show the native verifier or DevTools tool discovery as technical proof. Keep spoken wording natural and metric-driven.

Create `docs/submission/demo-shot-list.md` with:

- Exact route or surface for each shot
- Exact action, expected visible state, and narration goal
- Browser window and zoom guidance
- Which parts should be live versus pre-positioned
- A recovery plan if the experimental browser feature is unavailable during recording
- A final capture checklist for URL legibility, fictional-data notice, approvals, tool count, audio, cursor movement, and sub-three-minute duration

Do not prescribe fake terminal output or edited proof.

## 4. Create the screenshot and handoff checklist

Create `docs/submission/screenshot-plan.md` with the selected existing artifact paths, ordered captions, recommended use, and crop guidance. Use only accepted artifacts. Do not alter image bytes.

Create `docs/submission/launch-checklist.md` separating these states:

- complete and verified now
- locally prepared but not externally published
- still requires Trey or explicit authorization

It must include public app, public repo, MIT license, README, screenshots, demo rehearsal, video recording, YouTube upload, Devpost registration, official form draft, rules acknowledgement, final submission, and post-submit confirmation. Never mark video, Devpost, or submission work complete.

## 5. Checklist semantics

Do not mark item 12 accepted. Leave it unchecked for Codex because fresh-clone setup, link checking, claim review, and timed rehearsal are independent acceptance gates. You may add a short progress note beneath item 12 naming the files prepared.

## Required verification

Run:

```text
npm run lint
git diff --check
git diff --name-only
git status --short
```

Also run bounded documentation checks that prove:

- every repository-relative link and image path you added exists
- no em dash character exists in changed documentation
- every mentioned tool name matches the source registry
- the demo spoken word count is reported, excluding headings, timestamps, action cues, and code
- no unsupported `submitted`, `uploaded`, `live agent passed`, or database claim was added
- no file outside the allowed boundary changed

Do not run deployment, change external state, commit, or push.

## Required report

Return:

1. Exact files changed.
2. README information architecture and screenshot choices.
3. Demo runtime target and spoken word count.
4. Every verified production claim used and its repository evidence source.
5. Exact checks run and results.
6. Official Devpost and video status.
7. One concrete remaining risk or blocker.

## Stop condition

Stop when the documentation package is complete and all bounded checks pass, or at the first concrete blocker after preserving diagnostics. Return the report to Codex. Do not modify product code, release evidence, deployment, Devpost, YouTube, or external state. Do not commit or push.
