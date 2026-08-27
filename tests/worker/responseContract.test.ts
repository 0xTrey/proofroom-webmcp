import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyResponseContract,
  blocksSameOriginTools,
  CACHE_CONTROL,
  CONTENT_SECURITY_POLICY,
  SECURITY_HEADERS,
} from "../../worker/responseContract.ts";

function responseFor(
  path: string,
  response: Response,
): Response {
  return applyResponseContract(new Request(`https://proofroom.example${path}`), response);
}

describe("Cloudflare Worker response contract", () => {
  it("adds every required security header to root HTML and preserves the body", async () => {
    const response = responseFor(
      "/",
      new Response("<!doctype html><title>ProofRoom</title>", {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }),
    );

    for (const [name, value] of SECURITY_HEADERS) {
      expect(response.headers.get(name)).toBe(value);
    }
    expect(response.headers.get("Content-Security-Policy")).toBe(CONTENT_SECURITY_POLICY);
    expect(response.headers.get("Cache-Control")).toBe(CACHE_CONTROL.document);
    expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    await expect(response.text()).resolves.toContain("ProofRoom");
  });

  it("marks fingerprinted assets immutable while preserving status and content type", async () => {
    const response = responseFor(
      "/assets/index-CitHfJ6b.js",
      new Response("export const ready = true;", {
        status: 206,
        statusText: "Partial Content",
        headers: { "Content-Type": "text/javascript; charset=utf-8" },
      }),
    );

    expect(response.status).toBe(206);
    expect(response.statusText).toBe("Partial Content");
    expect(response.headers.get("Content-Type")).toBe("text/javascript; charset=utf-8");
    expect(response.headers.get("Cache-Control")).toBe(CACHE_CONTROL.fingerprintedAsset);
    await expect(response.text()).resolves.toBe("export const ready = true;");
  });

  it("uses a bounded cache for non-fingerprinted public SVG assets", () => {
    const response = responseFor(
      "/favicon.svg",
      new Response("<svg />", { headers: { "Content-Type": "image/svg+xml" } }),
    );

    expect(response.headers.get("Cache-Control")).toBe(CACHE_CONTROL.publicAsset);
    expect(response.headers.get("Content-Type")).toBe("image/svg+xml");
  });

  it("never gives an error response immutable caching", () => {
    const response = responseFor(
      "/assets/missing-AbCdEf12.js",
      new Response("not found", {
        status: 404,
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Type": "text/plain",
        },
      }),
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe(CACHE_CONTROL.error);
    expect(response.headers.get("Content-Type")).toBe("text/plain");
  });

  it("keeps SPA fallback documents revalidating", async () => {
    const response = responseFor(
      "/unknown/provider-route",
      new Response("<main id=\"root\">ProofRoom</main>", {
        headers: { "Content-Type": "text/html" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(CACHE_CONTROL.document);
    await expect(response.text()).resolves.toContain("ProofRoom");
  });

  it("rejects and removes a Permissions-Policy that disables tools", () => {
    expect(blocksSameOriginTools("camera=(), tools=()")).toBe(true);
    expect(blocksSameOriginTools("tools=(self), camera=()")).toBe(false);

    const response = responseFor(
      "/",
      new Response("ProofRoom", {
        headers: {
          "Content-Type": "text/html",
          "Permissions-Policy": "camera=(), tools=()",
        },
      }),
    );

    expect(response.headers.has("Permissions-Policy")).toBe(false);
    expect(blocksSameOriginTools(response.headers.get("Permissions-Policy"))).toBe(false);
  });

  it("keeps the Worker and static header CSP free of eval allowances", () => {
    const staticHeaders = readFileSync("public/_headers", "utf8");
    for (const policy of [CONTENT_SECURITY_POLICY, staticHeaders]) {
      expect(policy).not.toContain("unsafe-eval");
      expect(policy).not.toContain("eval-sha256");
      expect(policy).toContain("script-src 'self'");
    }
    expect(staticHeaders).toContain(`Content-Security-Policy: ${CONTENT_SECURITY_POLICY}`);
  });
});
