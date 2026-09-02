# Release-candidate gate artifacts

This directory holds machine-readable evidence that separates the local candidate, verified
public deployment, native WebMCP proof, Responses API proof, and compatible browser-agent proof.

## Files

- `local-qa.json` records the bounded local QA receipt from `npm run qa:receipt`.
- `current.json` records the combined release-candidate gate receipt.
- `rc-gate.schema.json` defines the combined receipt shape.

## Local flow

Run these commands in order:

```text
npm run qa:receipt
npm run release:rc:refresh
npm run release:rc:validate
```

Use `npm run release:rc:gate` as the hard pre-recording and pre-submission technical gate. It
exits nonzero unless the combined receipt status is `ready`.

## Lifecycle boundaries

- A `blocked` receipt is expected and safe while the working tree is dirty, the verified public
  release predates the current candidate, or compatible browser-agent evidence is still `not_run`.
- A `ready` technical receipt still does not authorize recording, upload, Devpost population, or
  submission.
- Generated files in this directory are excluded from filtered workspace cleanliness checks. Any other
  dirty path still blocks readiness.
- Responses API proof never satisfies native WebMCP or compatible browser-agent lanes.
