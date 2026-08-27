export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

export const SECURITY_HEADERS: ReadonlyArray<readonly [string, string]> = [
  ["Origin-Agent-Cluster", "?1"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["X-Content-Type-Options", "nosniff"],
  ["Cross-Origin-Opener-Policy", "same-origin"],
  ["Content-Security-Policy", CONTENT_SECURITY_POLICY],
  ["Strict-Transport-Security", "max-age=31536000; includeSubDomains"],
];

export const CACHE_CONTROL = {
  document: "no-cache",
  fingerprintedAsset: "public, max-age=31536000, immutable",
  publicAsset: "public, max-age=3600",
  error: "no-store",
} as const;

const FINGERPRINTED_ASSET = /^\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.[A-Za-z0-9]+$/;
const BLOCKING_TOOLS_POLICY = /(?:^|,)\s*tools\s*=\s*\(\s*(?:"?none"?\s*)?\)(?:\s*,|$)/i;

export function blocksSameOriginTools(value: string | null): boolean {
  return value !== null && BLOCKING_TOOLS_POLICY.test(value);
}

export function cacheControlFor(request: Request, response: Response): string {
  if (response.status < 200 || response.status >= 400) {
    return CACHE_CONTROL.error;
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("text/html")) {
    return CACHE_CONTROL.document;
  }

  const pathname = new URL(request.url).pathname;
  if (FINGERPRINTED_ASSET.test(pathname)) {
    return CACHE_CONTROL.fingerprintedAsset;
  }

  return CACHE_CONTROL.publicAsset;
}

export function applyResponseContract(request: Request, assetResponse: Response): Response {
  const headers = new Headers(assetResponse.headers);

  for (const [header, value] of SECURITY_HEADERS) {
    headers.set(header, value);
  }

  if (blocksSameOriginTools(headers.get("Permissions-Policy"))) {
    headers.delete("Permissions-Policy");
  }
  headers.set("Cache-Control", cacheControlFor(request, assetResponse));

  return new Response(assetResponse.body, {
    status: assetResponse.status,
    statusText: assetResponse.statusText,
    headers,
  });
}
