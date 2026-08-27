# Release preparation QA

This folder records real local release-preparation evidence. It must not contain a fabricated public URL, deployment identifier, or successful public verification receipt.

Expected local evidence:

- Worker response-contract tests for root HTML, SPA fallback, fingerprinted assets, public SVG, errors, cache behavior, security headers, and blocking tools policy.
- Public HTTP verifier fixture tests, including every named fail-closed case.
- Public Playwright results against an explicit local `wrangler dev` origin.
- A native headed Google Chrome receipt from the same origin when the platform testing API is available. It reports application console, page, request, and response errors separately from the narrowly classified Chrome WebMCP testing registration diagnostic.
- Wrangler deploy dry-run output showing the Worker, static asset count, and `ASSETS` binding without deployment.

Hash-fragment routes share one HTTP document. The public browser suite verifies the Product, Evaluation, and Decision client surfaces in that document. The strict CSP remains enforced with `script-src 'self'` and contains neither `unsafe-eval` nor an `eval-sha256` allowance.

Chrome 151 reports the exact blocked WebMCP testing registration notice at the loaded, same-origin fingerprinted module entry. A passing verifier accepts either zero notices or exactly two identical notices: one during initial registration and one during reload registration. The two locations must match the resolved entry URL, positive line, and nonnegative column exactly. The verifier also requires exact initial and reload discovery, successful native executions, a clean served-entry scan with a SHA-256 digest and byte count, and the unchanged effective Worker CSP. Every other source-located CSP message remains an application failure.

Natural-language browser-agent selection is a separate evidence state and remains unrun.

The accepted visual artifact tree digest before this work order is:

```text
3ae653285619e5977c69f5ad472866da40b1eaa026911946d0b77e1ef00110fe
```

Final command results and any native-platform blocker are reported to Codex. Deployment and checklist item 11 acceptance remain outside this work order.
