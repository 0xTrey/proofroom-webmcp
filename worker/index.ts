/**
 * Minimal Cloudflare Worker entry for ProofRoom.
 *
 * ProofRoom is client-first. The Worker only serves the static single page
 * application and adds the isolation header WebMCP benefits from. It never
 * holds room state, never proxies a model API, and never inspects tool traffic.
 */

type AssetFetcher = {
  fetch(request: Request): Promise<Response>;
};

type WorkerEnv = {
  ASSETS: AssetFetcher;
};

const SECURITY_HEADERS: Array<[string, string]> = [
  ["Origin-Agent-Cluster", "?1"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["X-Content-Type-Options", "nosniff"],
];

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const assetResponse = await env.ASSETS.fetch(request);
    const response = new Response(assetResponse.body, assetResponse);

    for (const [header, value] of SECURITY_HEADERS) {
      response.headers.set(header, value);
    }

    return response;
  },
};
