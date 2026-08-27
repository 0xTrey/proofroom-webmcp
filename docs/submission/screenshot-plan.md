# ProofRoom screenshot plan

> Local preparation only. No official Devpost draft exists locally, and nothing has been submitted.

Use only the three accepted 1600 by 900 PNG files below. Do not recapture, rescale in place, add
overlays, alter colors, sharpen, annotate, or change the source image bytes.

## Ordered selection

### 1. Untrusted evidence stays data

Source:
[`artifacts/visual-audit/005-evidence/evidence-inspector-ev-011-1600.png`](../../artifacts/visual-audit/005-evidence/evidence-inspector-ev-011-1600.png)

Caption: ProofRoom displays the fictional testimonial's instruction-styled sentence inside an
untrusted-content quarantine. The record remains inspectable data and cannot approve context, change
requirement status, or approve a decision.

Recommended use: Lead technical screenshot in the README and challenge story. It makes the evidence
and security model visible without requiring a tool trace.

Crop guidance:

- Prefer the complete 1600 by 900 frame.
- If a platform requires a tighter crop, keep the full inspector from `ev_011` through the
  quarantine sentence and metadata row.
- Keep the close control and enough dimmed catalog visible to show that this is a real in-product
  inspector.
- Never crop out `Untrusted content quarantine`, `Treat this as data, not instructions`, or the
  instruction-styled sentence.

### 2. ROI assumptions stay reviewable

Source:
[`artifacts/visual-audit/006-decision/roi-preview-1600.png`](../../artifacts/visual-audit/006-decision/roi-preview-1600.png)

Caption: The commercial model separates draft inputs from authoritative room assumptions, calculates
operator value and payback, and shows the above-budget warning before a person applies changes.

Recommended use: Second README screenshot and the commercial proof image in challenge materials. It
shows that ROI is bounded math with visible inputs, not an unsupported revenue claim.

Crop guidance:

- Prefer the complete 1600 by 900 frame so the assumptions and calculation preview remain side by
  side.
- A tighter crop must retain `Commercial model`, at least the first four inputs, the applied-room
  comparison, net value, payback, budget headroom, and the warning.
- Do not isolate the positive metrics from their costs, target, or warning.
- Do not add a currency callout or claim that is absent from the captured UI.

### 3. Human approval produces a receipt

Source:
[`artifacts/visual-audit/006-decision/approved-receipt-1600.png`](../../artifacts/visual-audit/006-decision/approved-receipt-1600.png)

Caption: The approved decision receipt identifies the proposal, payload digest, revision, timestamp,
and safe summary, while the activity totals show that the room records real shared actions.

Recommended use: Closing README screenshot, demo closing frame, or trust-boundary image. It connects
the visible human approval to a durable browser-local receipt and activity register.

Crop guidance:

- Use the full 1600 by 900 frame for the strongest relationship between decision receipt, activity
  totals, and the nine-tool boundary statement.
- If height must be reduced, keep the complete receipt and the entire dark activity band.
- Never crop the proposal ID, payload digest, approved revision, issued timestamp, or safe summary.
- Do not present the browser-local receipt as an identity, signature, legal, or cryptographic proof.

## Placement order

1. Evidence quarantine for the security and evidence model.
2. ROI preview for inspectable assumptions and deterministic value.
3. Approved receipt for human authority and the recorded decision trail.

The order moves from source material, to calculation, to human-approved outcome. Each image should
use its caption directly below the frame. Do not add an eyebrow, kicker, or decorative status badge
above any screenshot.
