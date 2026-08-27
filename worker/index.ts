/**
 * Minimal Cloudflare Worker entry for ProofRoom.
 *
 * ProofRoom is client-first. The Worker only serves the static single page
 * application and adds the isolation header WebMCP benefits from. It never
 * holds room state, never proxies a model API, and never inspects tool traffic.
 */
import { applyResponseContract } from "./responseContract.ts";

type AssetFetcher = {
  fetch(request: Request): Promise<Response>;
};

type WorkerEnv = {
  ASSETS: AssetFetcher;
};

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const assetResponse = await env.ASSETS.fetch(request);
    return applyResponseContract(request, assetResponse);
  },
};
