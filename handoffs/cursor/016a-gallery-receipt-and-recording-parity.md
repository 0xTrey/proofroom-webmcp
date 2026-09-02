# Cursor work order 016a: gallery receipt and recording parity

## Outcome

Correct the two acceptance defects in work order 016 without broadening the product contract:

1. The final gallery image must show the complete decision receipt without the sticky room guide covering its heading or any metadata.
2. The demo shot list must distinguish local rehearsal from the future, authorization-gated public recording.

Strengthen the final frame by recording one deterministic read through the page's registered WebMCP tool surface before capture, so the activity summary visibly contains both page and agent-origin activity. This is a scripted local browser-shim proof, not natural-language selection, and every document must label it that way.

## Source boundary

Work only in:

- `tests/e2e/decisionVisual.spec.ts`
- `tests/e2e/support/` if a narrowly shared browser-tool helper is materially cleaner than local test code
- `src/design/global.css`, limited to a wide-screen activity-summary density correction if needed to keep the receipt and summary simultaneously visible
- `artifacts/visual-audit/016-submission-gallery/03-approved-decision-1600.png`
- `artifacts/visual-audit/016-submission-gallery/README.md`
- `docs/submission/demo-shot-list.md`
- `docs/submission/screenshot-plan.md`
- `docs/submission/project-story.md`
- `docs/submission/launch-checklist.md`
- `docs/hackathon-build/checklist.md` only if its current-candidate wording becomes stale

Do not change runtime domain behavior, fixtures, the nine tool definitions, schemas, approvals, persistence, eval cases, counts, public receipts, Devpost state, or images 01 and 02.

## Required implementation

### 1. Fix recording lifecycle truth

Replace the unconditional instruction to record the current flow from the public Cloudflare origin with two explicit stages:

- Rehearsal now: use the current local candidate at `http://127.0.0.1:4181` or the configured Playwright preview. Keep the URL and local-only status visible where useful.
- Final recording later: only after explicit authorization to commit, push, and deploy, plus successful public verification, repeat the same sequence against `https://proofroom-webmcp.harnden-trey.workers.dev`.

The final capture checklist must block recording if the public app does not match the locally accepted candidate. Do not imply the local candidate is public.

### 2. Remove receipt occlusion

Re-capture only `03-approved-decision-1600.png` at exactly 1600 by 900. The image must show, without overlap or clipping:

- `Decision receipt` heading
- receipt ID
- kind
- proposal ID
- payload digest
- approved revision
- issued timestamp
- safe summary
- the complete activity-summary totals

Prefer a real, generally useful wide-screen density correction over capture-only hiding. The room guide may remain visible, but it must not overlap the receipt. Do not hide application content, post-process the PNG, resize it, add an overlay, or fabricate state.

Add a geometric assertion that compares the sticky room-guide box with the complete receipt box or every receipt field plus heading and fails on overlap. Also assert that the activity summary is entirely within the 1600 by 900 viewport at capture time.

### 3. Make the shared activity path visible

For the 1600 submission-gallery capture only, install the same supported deterministic browser-tool shim pattern already used in `tests/e2e/qaCoverage.spec.ts`. After the person approves the recommendation and before the gallery capture, execute exactly one successful registered `get_room_state` read through the actual registered definition.

Acceptance facts:

- the call is made through the page's registered WebMCP definition, not by directly editing storage;
- the approved decision is still created only by the visible `Approve recommendation` UI action;
- the gallery shows agent activity greater than zero and person activity greater than zero;
- the test asserts those two facts;
- no natural-language model selected this call;
- `evals/live-agent/current.json` remains `not_run`;
- no approval tool is introduced.

Update the gallery README and screenshot caption to say that the frame combines a human-approved decision with one deterministic registered WebMCP read in the shared activity record. Do not call it a live-agent run.

### 4. Remove stale local-candidate lineage wording

Where the touched documents describe the current candidate as ending at work order 014a, replace that fragile lineage with `current dirty working tree` or another state-based description. Keep the existing verified counts and lifecycle distinctions unchanged.

### 5. Preserve untouched gallery bytes

Before making changes, hash images 01 and 02. After the gated re-capture and after ordinary QA, prove both hashes are unchanged. Update the recorded SHA-256 for image 03 everywhere it appears.

## Required verification

Run and report exact outcomes for:

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

Also run the smallest gated gallery command needed to replace only image 03. If the existing spec necessarily executes other tests, prove images 01 and 02 remain byte-identical.

Independently report:

- all three gallery dimensions and SHA-256 hashes;
- image 01 and 02 before/after hashes;
- exact visible activity totals in image 03;
- geometric receipt-versus-guide and activity-summary viewport evidence;
- exact E2E count, which should remain 45 unless a test was genuinely added;
- confirmation that ordinary `npm run test:e2e` leaves all gallery bytes unchanged;
- confirmation that exactly nine tools remain and both approvals remain UI-only;
- `evals/live-agent/current.json` status;
- git status summary.

## Stop conditions

Stop and report rather than weakening assertions if the full receipt and complete activity summary cannot fit together at 1600 by 900 without hiding real application content. Do not commit, push, deploy, record video, upload media, mutate Devpost, or perform any other external action.

## Return format

Return:

1. summary;
2. defects corrected;
3. files changed;
4. new image 03 dimensions, hash, and visible totals;
5. geometric assertion evidence;
6. image 01 and 02 byte-preservation evidence;
7. exact QA commands and counts;
8. external actions explicitly not run;
9. git status summary;
10. keep/revise recommendation for Codex.
