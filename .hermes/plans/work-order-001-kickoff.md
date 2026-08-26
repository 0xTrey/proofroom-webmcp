# Work order 001 kickoff

- Original requirement and outcome: Complete checklist items 1 through 4 from the ProofRoom work order, producing a Cloudflare-ready React foundation, canonical domain and fixtures, shared Zustand action layer, and nine tested WebMCP tools.
- Success criteria and verification: Meet the acceptance criteria in `handoffs/cursor/001-foundation-domain-webmcp.md`; pass `npm install`, `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- Task-owned paths: Repository-local application, configuration, tests, fixtures, and documentation. Preserve existing research and handoff documents except for checklist status when verified.
- Base and compatibility: Current `main` worktree; Node 22.22.3 and npm 10.9.8; React 19, TypeScript strict mode, Vite, Cloudflare Workers static assets.
- Out of scope: Checklist items 5 through 12, deployment, cloud resources, authentication, databases, external model APIs, CRM, email, analytics, commits, pushes, and external messages.
- Execution authority: Create and edit repository files, install npm dependencies, and run local checks.
- Review authority: Cursor remains final reviewer and must inspect the diff and rerun acceptance commands.
- Side effects: No commit, push, deploy, cloud mutation, or external communication is authorized.
