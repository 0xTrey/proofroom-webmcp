# Build Notes

## August 26, 2026

### Direction

- Selected ProofRoom, an agent-native B2B buyer evaluation room.
- Kept the buyer-facing concept from the Pro recommendation.
- Merged the evidence, approval, and receipt mechanics from LaunchProof.
- Set the canonical vendor and buyer as fictional to keep the public repository safe.

### Autoresearch

- Baseline score: 82/100.
- Scope-compressed plan: 88/100, kept.
- Demo-first architecture: 91/100, kept.
- Visual expansion: 85/100, rejected.
- Trust contract and evals: 94/100, kept as current best.
- Neon collaboration: 89/100, rejected.
- Embedded AI chat: 84/100, rejected.
- Vendor outreach: 85/100, rejected.
- Category generalization: 90/100, rejected.
- Multi-buyer collaboration: 92/100, rejected.
- Five consecutive rejected mutations triggered the local-maximum stopping condition.

### Architecture decisions

- Use a static client-first React application on Cloudflare.
- Do not use Neon for the challenge MVP.
- Do not call an external model from the application.
- Keep all fixtures deterministic and public-safe.
- Keep approval actions UI-only.
- Use one shared domain action layer for UI and WebMCP.
- Use a test shim for deterministic tool verification.
- Preserve a complete UI-only fallback journey.

### Source verification

- Inspected the official WebMCP repository at `41d12f057167ccf5954dbcf49d99502cb6c84491`.
- Inspected the official Cloudflare WebMCP React example at `2f957bc2a3ffb7aee14792bb3cb658ad3176ed93`.
- Confirmed Cursor, GitHub, Wrangler, and Cloudflare authentication.
- Confirmed local Node 22.22.3, so dependency versions must not require Node 24.

### Build mode

- Cursor CLI performs implementation in bounded milestones.
- Codex owns diff review, independent tests, visual QA, defect ledgers, revised handoffs, deployment verification, and completion claims.
- Cursor must report changed files, commands, results, blockers, and residual risks after each work order.
