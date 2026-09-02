# Work order 016 submission gallery

Captured from the local preview server through Playwright with `UPDATE_SUBMISSION_GALLERY=1`.

## Capture command

```text
UPDATE_SUBMISSION_GALLERY=1 npx playwright test tests/e2e/decisionVisual.spec.ts --project=e2e
```

Image `03-approved-decision-1600.png` combines a human-approved decision with one deterministic
registered `get_room_state` read through the page's browser-tool shim. This is a scripted local
browser-shim proof, not a live-agent run.

## Candidate status

- Local candidate only. Not committed, pushed, deployed, uploaded to Devpost, or published.
- All entities, companies, and evidence records shown are fictional demo content.
- No personal or real customer data appears in these frames.
- Live natural-language browser-agent selection remains `not_run`.

## Files

All images are 1600 by 900 viewport captures with animations disabled. No full-page screenshots. No
manual browser capture, resizing, overlays, or post-processing.

| File | SHA-256 | Page state | Judge purpose |
| --- | --- | --- | --- |
| `01-landing-hero-1600.png` | `71b8a6eabb96d47dfe852cbb0ec230c7ab8c2e0a71683d199e1937905f2fc68b` | Root landing route with headline, definition copy, fictional EU example card, three-step decision chain, and `Open the fictional review` | Show the current buyer problem, value explanation, and human-approval path before entering the room |
| `02-untrusted-evidence-1600.png` | `a2a03f25f057bf3e1530bc7dc1a32c32e588e126fd1d38a931ff90b9d1fd78e6` | Evaluation surface with `ev_011` inspector open, quarantine copy, instruction-styled testimonial, close control, and dimmed in-product context | Prove untrusted persuasive copy stays inspectable data and cannot control the workflow |
| `03-approved-decision-1600.png` | `d6c7067127ff3c58a126c184595cc69c0b561e910ff8417300600280722b84d7` | Decision surface after `Approve recommendation` plus one deterministic registered `get_room_state` read, with full receipt metadata and complete activity summary totals visible below the sticky room guide | Connect the second person-only approval and one registered WebMCP read to a browser-local receipt and shared activity history |

## Verification

```text
sips -g pixelWidth -g pixelHeight artifacts/visual-audit/016-submission-gallery/*.png
shasum -a 256 artifacts/visual-audit/016-submission-gallery/*.png
```

Expected dimensions: 1600 by 900 for every file.
