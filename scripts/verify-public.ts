import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const REQUIRED_SECURITY_HEADERS = {
  "origin-agent-cluster": "?1",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "cross-origin-opener-policy": "same-origin",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
} as const;

export const REQUIRED_CSP_DIRECTIVES = [
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
] as const;

const FINGERPRINTED_ASSET = /-[A-Za-z0-9_-]{6,}\.(?:js|css)$/;
const PUBLIC_CHECKED_ROUTES = ["/", "/#product", "/#evaluation", "/#decision"] as const;
const SHA256 = /^[0-9a-f]{64}$/;
const PROVIDER_ERROR = /(?:cloudflare error|error 1\d{3}|worker threw exception|internal server error)/i;
const LEAK_PATTERNS = [
  /\b(?:sk_(?!_)|ghp_|github_pat_)[A-Za-z0-9_-]{12,}/,
  /AKIA[0-9A-Z]{16}/,
  /\bat\s+[A-Za-z0-9_$.[\]]+\s*\([^)\n]+:\d+:\d+\)/,
  /\/Users\/[^/\s]+/,
  /\/home\/[^/\s]+/,
  /[A-Za-z]:\\Users\\[^\\\s]+/,
] as const;

export type PublicVerificationReceipt = {
  schemaVersion: 1;
  kind: "public_http_verification";
  status: "passed";
  origin: string;
  checkedRoutes: string[];
  assets: {
    module: string;
    css: string;
    favicon: string;
    socialImage: string;
  };
  responseCount: number;
  securityHeaders: Record<string, string>;
  digest: string;
};

export type VerifyPublicOptions = {
  baseUrl: string;
  allowHttp?: boolean;
  fetchImpl?: typeof fetch;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function record(value: unknown, label: string): Record<string, unknown> {
  assert(
    value !== null && typeof value === "object" && !Array.isArray(value),
    `${label} must be an object.`,
  );
  return value as Record<string, unknown>;
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assert(
    JSON.stringify(actual) === JSON.stringify(wanted),
    `${label} must contain exactly: ${wanted.join(", ")}.`,
  );
}

export function computePublicVerificationReceiptDigest(input: {
  origin: string;
  checkedRoutes: readonly string[];
  assets: PublicVerificationReceipt["assets"];
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        origin: input.origin,
        checkedRoutes: input.checkedRoutes,
        modulePath: input.assets.module,
        cssPath: input.assets.css,
        faviconPath: input.assets.favicon,
        socialImagePath: input.assets.socialImage,
      }),
    )
    .digest("hex");
}

export function validatePublicVerificationReceipt(
  value: unknown,
): PublicVerificationReceipt {
  const receipt = record(value, "Public verification receipt");
  assertExactKeys(
    receipt,
    [
      "schemaVersion",
      "kind",
      "status",
      "origin",
      "checkedRoutes",
      "assets",
      "responseCount",
      "securityHeaders",
      "digest",
    ],
    "Public verification receipt",
  );
  assert(receipt.schemaVersion === 1, "Public verification receipt schemaVersion must be 1.");
  assert(
    receipt.kind === "public_http_verification",
    "Public verification receipt kind is invalid.",
  );
  assert(receipt.status === "passed", "Public verification receipt status must be passed.");

  const origin = validateBaseUrl(
    typeof receipt.origin === "string" ? receipt.origin : undefined,
  );
  assert(
    Array.isArray(receipt.checkedRoutes) &&
      JSON.stringify(receipt.checkedRoutes) === JSON.stringify(PUBLIC_CHECKED_ROUTES),
    "Public verification receipt checkedRoutes must contain the exact four release routes.",
  );
  assert(
    receipt.responseCount === 9,
    "Public verification receipt responseCount must be exactly 9.",
  );

  const assets = record(receipt.assets, "Public verification receipt assets");
  assertExactKeys(
    assets,
    ["module", "css", "favicon", "socialImage"],
    "Public verification receipt assets",
  );
  for (const field of ["module", "css", "favicon", "socialImage"] as const) {
    assert(
      typeof assets[field] === "string" && assets[field].length > 0,
      `Public verification receipt assets.${field} must be a non-empty string.`,
    );
    const assetUrl = new URL(assets[field], origin);
    assert(
      assetUrl.origin === origin.origin &&
        assetUrl.search === "" &&
        assetUrl.hash === "",
      `Public verification receipt assets.${field} must be a same-origin path without a query or hash.`,
    );
  }
  assert(
    FINGERPRINTED_ASSET.test(new URL(String(assets.module), origin).pathname) &&
      new URL(String(assets.module), origin).pathname.endsWith(".js"),
    "Public verification receipt module must be a fingerprinted JavaScript asset.",
  );
  assert(
    FINGERPRINTED_ASSET.test(new URL(String(assets.css), origin).pathname) &&
      new URL(String(assets.css), origin).pathname.endsWith(".css"),
    "Public verification receipt css must be a fingerprinted CSS asset.",
  );
  assert(
    new URL(String(assets.favicon), origin).pathname === "/favicon.svg",
    "Public verification receipt favicon must be /favicon.svg.",
  );
  assert(
    new URL(String(assets.socialImage), origin).pathname === "/og-image.svg",
    "Public verification receipt socialImage must be /og-image.svg.",
  );

  const headers = record(
    receipt.securityHeaders,
    "Public verification receipt securityHeaders",
  );
  const expectedHeaders = {
    ...REQUIRED_SECURITY_HEADERS,
    "content-security-policy": REQUIRED_CSP_DIRECTIVES.join("; "),
  };
  assertExactKeys(
    headers,
    Object.keys(expectedHeaders),
    "Public verification receipt securityHeaders",
  );
  for (const [name, expected] of Object.entries(expectedHeaders)) {
    assert(
      headers[name] === expected,
      `Public verification receipt securityHeaders.${name} must match the exact Worker response contract.`,
    );
  }
  const csp = String(headers["content-security-policy"]);
  assert(
    !csp.includes("unsafe-eval") && !csp.includes("eval-sha256"),
    "Public verification receipt CSP must not contain an eval allowance.",
  );
  assert(
    typeof receipt.digest === "string" && SHA256.test(receipt.digest),
    "Public verification receipt digest must be a lowercase SHA-256 digest.",
  );
  const normalizedAssets = assets as PublicVerificationReceipt["assets"];
  assert(
    receipt.digest ===
      computePublicVerificationReceiptDigest({
        origin: origin.origin,
        checkedRoutes: PUBLIC_CHECKED_ROUTES,
        assets: normalizedAssets,
      }),
    "Public verification receipt digest does not match its receipt fields.",
  );
  return receipt as PublicVerificationReceipt;
}

export function validateBaseUrl(value: string | undefined, allowHttp = false): URL {
  assert(value, "PROOFROOM_BASE_URL is required.");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("PROOFROOM_BASE_URL must be a valid URL origin.");
  }

  assert(url.username === "" && url.password === "", "The verification origin cannot contain credentials.");
  assert(url.pathname === "/" && url.search === "" && url.hash === "", "PROOFROOM_BASE_URL must be an origin without a path, query, or hash.");
  if (url.protocol !== "https:") {
    const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
    assert(
      allowHttp && url.protocol === "http:" && localHosts.has(url.hostname),
      "Public verification requires HTTPS. Set PROOFROOM_ALLOW_HTTP=1 only for localhost development.",
    );
  }
  return url;
}

function tags(html: string, name: string): string[] {
  return html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) ?? [];
}

function attribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)')`, "i"));
  return match?.[1] ?? match?.[2] ?? null;
}

function oneAsset(
  html: string,
  tagName: string,
  predicate: (tag: string) => boolean,
  attributeName: string,
  label: string,
): string {
  const matches = tags(html, tagName).filter(predicate);
  assert(matches.length === 1, `HTML must contain exactly one ${label}.`);
  const value = attribute(matches[0] ?? "", attributeName);
  assert(value, `${label} must include ${attributeName}.`);
  return value;
}

function assertNoLeak(label: string, text: string): void {
  assert(!PROVIDER_ERROR.test(text), `${label} contains a provider or server error page.`);
  for (const pattern of LEAK_PATTERNS) {
    assert(!pattern.test(text), `${label} contains server, secret-like, stack, or host-path material.`);
  }
}

function blocksTools(value: string | null): boolean {
  return value !== null && /(?:^|,)\s*tools\s*=\s*\(\s*(?:"?none"?\s*)?\)(?:\s*,|$)/i.test(value);
}

function assertSecurityHeaders(label: string, response: Response): void {
  for (const [name, expected] of Object.entries(REQUIRED_SECURITY_HEADERS)) {
    assert(response.headers.get(name) === expected, `${label} is missing exact ${name}: ${expected}.`);
  }
  const csp = response.headers.get("content-security-policy");
  assert(csp, `${label} is missing Content-Security-Policy.`);
  for (const directive of REQUIRED_CSP_DIRECTIVES) {
    assert(csp.includes(directive), `${label} CSP is missing directive: ${directive}.`);
  }
  assert(!blocksTools(response.headers.get("permissions-policy")), `${label} disables same-origin WebMCP tools.`);
}

function resolveAsset(origin: URL, value: string, label: string): URL {
  const url = new URL(value, origin);
  assert(url.origin === origin.origin, `${label} must stay on the ProofRoom origin.`);
  return url;
}

async function read(
  fetchImpl: typeof fetch,
  url: URL,
  label: string,
): Promise<{ response: Response; text: string }> {
  const response = await fetchImpl(url, { redirect: "error" });
  const text = await response.text();
  assertNoLeak(label, text);
  assertSecurityHeaders(label, response);
  return { response, text };
}

function assertStatusAndType(
  label: string,
  response: Response,
  expectedStatus: number,
  acceptedTypes: readonly string[],
): void {
  assert(response.status === expectedStatus, `${label} returned ${response.status}, expected ${expectedStatus}.`);
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  assert(
    acceptedTypes.some((type) => contentType.includes(type)),
    `${label} returned an invalid content type: ${contentType || "missing"}.`,
  );
}

export async function verifyPublicRelease(
  options: VerifyPublicOptions,
): Promise<PublicVerificationReceipt> {
  const origin = validateBaseUrl(options.baseUrl, options.allowHttp);
  const fetchImpl = options.fetchImpl ?? fetch;
  const checkedRoutes = [...PUBLIC_CHECKED_ROUTES];
  let responseCount = 0;
  let rootHtml = "";
  let rootResponse: Response | null = null;

  for (const route of checkedRoutes) {
    const current = await read(fetchImpl, new URL(route, origin), route);
    responseCount += 1;
    assertStatusAndType(route, current.response, 200, ["text/html"]);
    assert(current.text.includes("ProofRoom"), `${route} does not identify ProofRoom.`);
    assert(current.text.includes('id="root"'), `${route} is not the ProofRoom application shell.`);
    if (route === "/") {
      rootHtml = current.text;
      rootResponse = current.response;
    }
  }

  assert(rootResponse, "Root response was not captured.");
  const titleTags = rootHtml.match(/<title\b[^>]*>[\s\S]*?<\/title>/gi) ?? [];
  assert(titleTags.length === 1, "HTML must contain exactly one document title.");
  assert(/ProofRoom/i.test(titleTags[0] ?? ""), "The document title must identify ProofRoom.");
  assert(/fictional|demo content/i.test(rootHtml), "HTML must label the product and company content as fictional.");
  assert(!/\b(?:real|actual)\s+customer\b/i.test(rootHtml), "HTML must not claim a real customer.");

  const modulePath = oneAsset(
    rootHtml,
    "script",
    (tag) => attribute(tag, "type") === "module" && attribute(tag, "src") !== null,
    "src",
    "module entry",
  );
  const cssPath = oneAsset(
    rootHtml,
    "link",
    (tag) => (attribute(tag, "rel") ?? "").split(/\s+/).includes("stylesheet"),
    "href",
    "stylesheet",
  );
  const faviconPath = oneAsset(
    rootHtml,
    "link",
    (tag) => (attribute(tag, "rel") ?? "").split(/\s+/).includes("icon"),
    "href",
    "favicon",
  );
  const socialImagePath = oneAsset(
    rootHtml,
    "meta",
    (tag) => attribute(tag, "property") === "og:image",
    "content",
    "social image metadata",
  );

  assert(FINGERPRINTED_ASSET.test(new URL(modulePath, origin).pathname), "Module entry filename is not fingerprinted.");
  assert(FINGERPRINTED_ASSET.test(new URL(cssPath, origin).pathname), "CSS filename is not fingerprinted.");
  const assets = [
    { label: "module entry", path: modulePath, types: ["text/javascript", "application/javascript"] },
    { label: "CSS asset", path: cssPath, types: ["text/css"] },
    { label: "favicon", path: faviconPath, types: ["image/svg+xml"] },
    { label: "social image", path: socialImagePath, types: ["image/svg+xml"] },
  ] as const;

  for (const asset of assets) {
    const current = await read(fetchImpl, resolveAsset(origin, asset.path, asset.label), asset.label);
    responseCount += 1;
    assertStatusAndType(asset.label, current.response, 200, asset.types);
    if (asset.label === "module entry" || asset.label === "CSS asset") {
      assert(
        current.response.headers.get("cache-control") === "public, max-age=31536000, immutable",
        `${asset.label} must use exact immutable caching.`,
      );
    }
  }

  const rootCache = rootResponse.headers.get("cache-control")?.toLowerCase() ?? "";
  assert(!rootCache.includes("immutable"), "HTML must not be immutable-cached.");
  assert(rootCache.includes("no-cache") || rootCache.includes("no-store") || rootCache.includes("max-age=0"), "HTML must revalidate.");

  const unknown = await read(
    fetchImpl,
    new URL(`/release-verifier-unknown-${createHash("sha256").update(origin.origin).digest("hex").slice(0, 12)}`, origin),
    "unknown SPA route",
  );
  responseCount += 1;
  assertStatusAndType("unknown SPA route", unknown.response, 200, ["text/html"]);
  assert(unknown.text.includes('id="root"') && unknown.text.includes("ProofRoom"), "Unknown route did not return the ProofRoom app shell.");

  const receiptAssets = {
    module: modulePath,
    css: cssPath,
    favicon: faviconPath,
    socialImage: socialImagePath,
  };
  const digest = computePublicVerificationReceiptDigest({
    origin: origin.origin,
    checkedRoutes,
    assets: receiptAssets,
  });
  return {
    schemaVersion: 1,
    kind: "public_http_verification",
    status: "passed",
    origin: origin.origin,
    checkedRoutes,
    assets: receiptAssets,
    responseCount,
    securityHeaders: {
      ...REQUIRED_SECURITY_HEADERS,
      "content-security-policy": rootResponse.headers.get("content-security-policy") ?? "",
    },
    digest,
  };
}

export function writeReceipt(repositoryRoot: string, outputPath: string, receipt: PublicVerificationReceipt): string {
  assert(!isAbsolute(outputPath), "Verification receipt output must be repository-relative.");
  const destination = resolve(repositoryRoot, outputPath);
  const fromRoot = relative(repositoryRoot, destination);
  assert(fromRoot !== "" && fromRoot !== ".." && !fromRoot.startsWith(`..${sep}`), "Verification receipt output must stay inside the repository.");
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, `${JSON.stringify(receipt, null, 2)}\n`);
  return fromRoot;
}

async function main(): Promise<void> {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const receipt = await verifyPublicRelease({
    baseUrl: process.env.PROOFROOM_BASE_URL ?? "",
    allowHttp: process.env.PROOFROOM_ALLOW_HTTP === "1",
  });
  const outputPath = process.env.PROOFROOM_VERIFY_OUTPUT;
  if (outputPath) {
    const written = writeReceipt(repositoryRoot, outputPath, receipt);
    console.log(`Public verification passed. Receipt: ${written}`);
  } else {
    console.log(JSON.stringify(receipt, null, 2));
  }
}

if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Public verification failed.");
    process.exitCode = 1;
  });
}
