# Source Notes

Verified on August 26, 2026.

## Challenge

- The project must be a working WebMCP-enabled web application with a public live URL.
- The submission requires a public source repository with a visible open-source license.
- The demo video must be public, include audio, and remain under three minutes.
- The judging criteria are WebMCP Leverage, Execution, Potential Impact, and Creativity and Ambition.
- The submission deadline is September 3, 2026 at 1:00 p.m. Pacific.

Sources: [OpenAI challenge](https://openai.com/webmcp-challenge/), [Devpost challenge](https://webmcp.devpost.com/), [official rules](https://webmcp.devpost.com/rules).

## WebMCP implementation

- The current specification exposes imperative tools through `document.modelContext.registerTool`.
- Tool definitions include name, optional title, description, input schema, execute callback, and annotations.
- Current annotations include `readOnlyHint` and `untrustedContentHint`.
- An `AbortSignal` can unregister tools when a React effect unmounts.
- The official Cloudflare React example reuses application actions from the tool callbacks and treats registration state as visible UI state.

Source repository: [webmachinelearning/webmcp](https://github.com/webmachinelearning/webmcp), inspected at commit `41d12f057167ccf5954dbcf49d99502cb6c84491`.

Cloudflare example: [cloudflare/agents WebMCP React example](https://github.com/cloudflare/agents/tree/main/examples/webmcp-react), inspected at commit `2f957bc2a3ffb7aee14792bb3cb658ad3176ed93`.

## Local environment

- Node.js: 22.22.3
- npm: 10.9.8
- Wrangler: 4.83.0
- Cloudflare account: authenticated
- Cursor CLI: authenticated
- GitHub CLI: authenticated as `0xTrey`

Package versions must remain compatible with Node 22. Do not copy the official example's Node 24 engine constraint without verification.
