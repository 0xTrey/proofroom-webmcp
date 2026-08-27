# ProofRoom Cloudflare release runbook

Codex owns this runbook. Run each lifecycle step separately and preserve its real output. Do not treat one step as proof of another.

## 1. Confirm source identity and a clean tree

```text
git rev-parse HEAD
git status --porcelain
git remote get-url origin
test -z "$(git status --porcelain)"
```

The final deployment commit must be present on the public GitHub remote. Record the full SHA, clean-tree command output, remote URL, and public repository URL in the release receipt.

## 2. Run aggregate local QA

```text
npm ci
npm run qa
```

Record the exact test counts, bundle measurements, deterministic eval digest, and visual artifact digest. This proves local QA only.

## 3. Read the authenticated Cloudflare account

```text
npx wrangler whoami
npx wrangler --version
```

Record the safe account label and Wrangler version. Never copy tokens or account secrets into the repository.

## 4. Prove the deployment bundle without mutation

```text
npm run deploy:dry-run
```

Confirm the redirected Cloudflare Vite output, static asset count, Worker entry, and `ASSETS` binding. A dry run is not a deployment.

## 5. Deploy the committed release

```text
npm run deploy
```

This is the only actual deployment command. It builds first, then runs `wrangler deploy`. Execute it only after Codex authorizes production mutation.

## 6. Capture the public URL and deployment identity

```text
npx wrangler deployments list --name proofroom-webmcp
npx wrangler versions list --name proofroom-webmcp
```

Record the public HTTPS URL, deployment or version ID, and deployment UTC timestamp from Cloudflare output. Do not infer these values from local configuration.

## 7. Verify the public HTTP contract

```text
PROOFROOM_BASE_URL="https://PUBLIC_ORIGIN" PROOFROOM_VERIFY_OUTPUT="artifacts/release/http-verification.json" npm run verify:public
shasum -a 256 artifacts/release/http-verification.json
```

The verifier checks the app shell, hash-fragment routes, fingerprinted assets, content types, security headers, cache rules, provider errors, and response leaks. Product, Evaluation, and Decision are client surfaces in one HTTP document.

## 8. Run public browser QA

```text
PROOFROOM_BASE_URL="https://PUBLIC_ORIGIN" npm run test:public
```

Record the exact passed and failed test counts. This suite starts no local server.

## 9. Run native headed Chrome verification

```text
PROOFROOM_BASE_URL="https://PUBLIC_ORIGIN" PROOFROOM_NATIVE_OUTPUT="artifacts/release/native-webmcp.json" npm run verify:webmcp:chrome
shasum -a 256 artifacts/release/native-webmcp.json
```

Keep the default headed mode. `PROOFROOM_NATIVE_HEADLESS=1` is diagnostic only and cannot supply accepted native evidence.

The native verifier fails on every application console error, page error, request failure, and response failure. Chrome 151 attributes the blocked WebMCP testing registration notice to the loaded module entry. The verifier accepts zero notices or exactly two identical notices, one during `initial_registration` and one during `reload_registration`. Both notices must use the exact loaded-entry URL and the same positive line and nonnegative column.

Before classification, the verifier resolves the same-origin fingerprinted module entry from the document, fetches the served bytes, records the repository-safe path, SHA-256 digest, and byte count, and proves that `eval(`, `new Function`, `eval-sha256`, and `Hash of blocked script` are absent. It reads the effective root CSP from the browser response and requires the exact Worker contract. It also validates the exact nine tools before and after reload and requires both native executions to pass. Any different phase, source, location, message, count, entry scan, CSP, discovery, execution, page error, request failure, response failure, or other console error fails the lane. The strict CSP must still contain neither `unsafe-eval` nor an `eval-sha256` allowance.

## 10. Capture final public response headers

```text
curl --fail --silent --show-error --dump-header artifacts/release/public-headers.txt --output /dev/null "https://PUBLIC_ORIGIN/"
```

Read back every required header and confirm no `Permissions-Policy` value disables `tools`.

## 11. Complete and validate the release receipt

Update a release receipt from `prepared` to `verified` only after all deployment and public evidence exists. Record file digests, zero application console, page, request, and response error counts, exact nine native tool names, native Chrome version, native receipt schema version `2`, phase-bound contract identifier, reload registration proof, effective CSP, loaded-entry path, byte count and digest, zero or exactly two disclosed Chrome testing diagnostics with their allowed phases and location, and the visual artifact digest before and after public verification. Natural-language browser-agent selection remains a separate evidence state and must stay marked unrun until it is actually performed.

`release:receipt:validate` first runs the handwritten TypeScript contract, then compiles and runs the committed JSON Schema with date-time formats enabled. Ajv and ajv-formats are executable release-validation dependencies. For a `verified` receipt, the command also resolves both referenced evidence files inside the repository, verifies their declared SHA-256 digests, validates the public HTTP and native Chrome receipts independently, and requires both evidence origins to equal the public URL origin. The public response headers and every native summary field in the final receipt must match the referenced evidence. A `prepared` receipt remains valid without deployment or public evidence files.

```text
PROOFROOM_RELEASE_RECEIPT="artifacts/release/release-receipt.json" npm run release:receipt:validate
git diff --check
git diff --exit-code -- artifacts/visual-audit/003-baseline artifacts/visual-audit/004-context artifacts/visual-audit/005-evidence artifacts/visual-audit/006-decision artifacts/visual-audit/007-recovery
```

## 12. Codex acceptance, commit, and push sequence

Codex first reviews every item 11 acceptance proof and the final receipt. Only after acceptance:

```text
git status --short
git diff --check
git add <reviewed-release-files>
git commit -m "chore: prepare verified Cloudflare release"
git push origin HEAD
```

Checklist item 12 starts only in a separate authorized work order after item 11 acceptance. This runbook does not claim that item 11 or item 12 is complete.
