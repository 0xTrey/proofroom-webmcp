import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import {
  computePublicVerificationReceiptDigest,
  REQUIRED_CSP_DIRECTIVES,
  REQUIRED_SECURITY_HEADERS,
  validateBaseUrl,
  validatePublicVerificationReceipt,
  verifyPublicRelease,
  type PublicVerificationReceipt,
} from "../../scripts/verify-public.ts";

type FixtureMode =
  | "pass"
  | "missing-header"
  | "blocking-tools"
  | "bad-asset-type"
  | "provider-error"
  | "immutable-html";

const servers: Server[] = [];

function releaseReceipt(): PublicVerificationReceipt {
  const origin = "https://proofroom.example";
  const assets = {
    module: "/assets/index-AbCdEf12.js",
    css: "/assets/index-Xyz12345.css",
    favicon: "/favicon.svg",
    socialImage: "/og-image.svg",
  };
  const checkedRoutes = ["/", "/#product", "/#evaluation", "/#decision"];
  return {
    schemaVersion: 1,
    kind: "public_http_verification",
    status: "passed",
    origin,
    checkedRoutes,
    assets,
    responseCount: 9,
    securityHeaders: {
      ...REQUIRED_SECURITY_HEADERS,
      "content-security-policy": REQUIRED_CSP_DIRECTIVES.join("; "),
    },
    digest: computePublicVerificationReceiptDigest({
      origin,
      checkedRoutes,
      assets,
    }),
  };
}

function html(): string {
  return `<!doctype html>
<html><head>
<title>ProofRoom, the Northstar evaluation room</title>
<meta name="description" content="Fictional demo content only.">
<meta property="og:image" content="/og-image.svg">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="stylesheet" href="/assets/index-Xyz12345.css">
</head><body><div id="root">ProofRoom fictional demonstration</div>
<script type="module" src="/assets/index-AbCdEf12.js"></script></body></html>`;
}

async function fixture(mode: FixtureMode): Promise<string> {
  const server = createServer((request, response) => {
    const path = request.url ?? "/";
    const securityHeaders: Record<string, string> = {
      ...REQUIRED_SECURITY_HEADERS,
      "content-security-policy": REQUIRED_CSP_DIRECTIVES.join("; "),
    };
    if (mode === "missing-header") {
      delete securityHeaders["x-content-type-options"];
    }
    if (mode === "blocking-tools") {
      securityHeaders["permissions-policy"] = "camera=(), tools=()";
    }
    for (const [name, value] of Object.entries(securityHeaders)) {
      response.setHeader(name, value);
    }

    if (path === "/assets/index-AbCdEf12.js") {
      response.statusCode = 200;
      response.setHeader(
        "content-type",
        mode === "bad-asset-type" ? "text/plain" : "text/javascript; charset=utf-8",
      );
      response.setHeader("cache-control", "public, max-age=31536000, immutable");
      response.end('export const proofroom = "sk__prior-notice";');
      return;
    }
    if (path === "/assets/index-Xyz12345.css") {
      response.statusCode = 200;
      response.setHeader("content-type", "text/css; charset=utf-8");
      response.setHeader("cache-control", "public, max-age=31536000, immutable");
      response.end("body{display:block}");
      return;
    }
    if (path === "/favicon.svg" || path === "/og-image.svg") {
      response.statusCode = 200;
      response.setHeader("content-type", "image/svg+xml");
      response.setHeader("cache-control", "public, max-age=3600");
      response.end("<svg xmlns=\"http://www.w3.org/2000/svg\" />");
      return;
    }

    response.statusCode = 200;
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.setHeader(
      "cache-control",
      mode === "immutable-html" ? "public, max-age=31536000, immutable" : "no-cache",
    );
    response.end(
      mode === "provider-error" && path.startsWith("/release-verifier-unknown-")
        ? "<html><title>Cloudflare Error 1101</title><body>Worker threw exception</body></html>"
        : html(),
    );
  });
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Fixture server did not expose a TCP address.");
  }
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        }),
    ),
  );
});

describe("public release HTTP verifier", () => {
  it("passes a complete local release fixture", async () => {
    const receipt = await verifyPublicRelease({
      baseUrl: await fixture("pass"),
      allowHttp: true,
    });

    expect(receipt.status).toBe("passed");
    expect(receipt.responseCount).toBe(9);
    expect(receipt.assets.module).toBe("/assets/index-AbCdEf12.js");
    expect(receipt.assets.css).toBe("/assets/index-Xyz12345.css");
  });

  it.each([
    ["missing required header", "missing-header"],
    ["blocking tools policy", "blocking-tools"],
    ["bad asset content type", "bad-asset-type"],
    ["provider error page", "provider-error"],
    ["immutable HTML", "immutable-html"],
  ] as const)("fails closed for %s", async (_label, mode) => {
    await expect(
      verifyPublicRelease({
        baseUrl: await fixture(mode),
        allowHttp: true,
      }),
    ).rejects.toThrow();
  });

  it("rejects a non-HTTPS public origin", () => {
    expect(() => validateBaseUrl("http://proofroom.example")).toThrow(
      /Public verification requires HTTPS/,
    );
  });

  it("validates the exact public release receipt contract", () => {
    expect(validatePublicVerificationReceipt(releaseReceipt()).status).toBe(
      "passed",
    );
  });

  it.each([
    [
      "top-level key",
      (receipt: PublicVerificationReceipt) => {
        Object.assign(receipt, { extra: true });
      },
    ],
    [
      "asset key",
      (receipt: PublicVerificationReceipt) => {
        Object.assign(receipt.assets, { extra: true });
      },
    ],
    [
      "security header key",
      (receipt: PublicVerificationReceipt) => {
        receipt.securityHeaders.extra = "unreviewed";
      },
    ],
  ])("rejects an unknown %s in a public receipt", (_label, mutate) => {
    const receipt = releaseReceipt();
    mutate(receipt);
    expect(() => validatePublicVerificationReceipt(receipt)).toThrow(
      /must contain exactly/,
    );
  });

  it("rejects a public receipt with a stale internal digest", () => {
    const receipt = releaseReceipt();
    receipt.assets.module = "/assets/index-Changed123.js";
    expect(() => validatePublicVerificationReceipt(receipt)).toThrow(
      /digest does not match/,
    );
  });

  it("rejects a public receipt with a different route contract", () => {
    const receipt = releaseReceipt();
    receipt.checkedRoutes = ["/"];
    expect(() => validatePublicVerificationReceipt(receipt)).toThrow(
      /exact four release routes/,
    );
  });
});
