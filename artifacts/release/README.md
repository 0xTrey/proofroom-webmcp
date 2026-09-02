# ProofRoom release evidence

This directory holds machine-readable evidence for the Cloudflare release lifecycle.

- `release-receipt.schema.json` defines `prepared`, `deployed`, `verified`, and `failed`.
- `prepared-receipt.json` records local preparation only. It contains no public URL, deployment ID, or public verification claim.
- `http-verification.json` records the real public HTTPS and response-contract check.
- `native-webmcp.json` records the real headed Chrome native WebMCP check.
- `public-headers.txt` preserves the public response-header readback.
- `release-receipt.json` is the final verified receipt and cross-references the real evidence files by SHA-256 digest.

Product, Evaluation, and Decision are hash-fragment client surfaces served from one HTTP document. Public browser QA verifies each surface. Native Chrome evidence reports zero application console, page, request, and response errors.

Chrome 151 attributes the blocked WebMCP testing registration notice to the loaded module entry. Verified native evidence may disclose zero notices or exactly two identical notices, one in `initial_registration` and one in `reload_registration`. Both must have the same loaded-entry URL, positive line, and nonnegative column. The referenced native receipt must use the phase-bound entry-integrity contract, prove exact nine-tool discovery before and after reload, record the served entry path, byte count, and SHA-256 digest, show a clean forbidden-marker scan, and record the exact effective Worker CSP. A source-located message that does not satisfy every condition fails verification.

The strict CSP contains neither `unsafe-eval` nor an `eval-sha256` allowance. Natural-language browser-agent selection remains a separate, unrun evidence state.

Validate the honest preparation receipt:

```text
npm run release:receipt:validate
```

Validate the final verified receipt and every referenced evidence file:

```text
PROOFROOM_RELEASE_RECEIPT=artifacts/release/release-receipt.json npm run release:receipt:validate
```

Validate the local release-candidate gate after refreshing evidence:

```text
npm run qa:receipt
npm run release:rc:refresh
npm run release:rc:validate
```

Use `npm run release:rc:gate` as the hard pre-recording and pre-submission technical gate. A `ready`
technical receipt still does not authorize recording, upload, Devpost population, or submission.

This command runs the handwritten TypeScript contract and the committed JSON Schema with date-time format validation. Ajv and ajv-formats are development dependencies because this release command executes them directly, not only because tests import them.

For a `verified` receipt, the same command resolves the referenced HTTP and native evidence paths inside the repository, verifies each file's SHA-256 digest, validates each receipt independently, and cross-checks both origins against the public URL. It also requires the public response headers and the complete native Chrome summary to match the final release receipt. A `prepared` receipt does not require public evidence files or deployment claims.

Codex completes deployment and public verification by following `docs/release-runbook.md`. A local build, dry run, localhost verifier, or native local browser run does not prove deployment or public verification.
