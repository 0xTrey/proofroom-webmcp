import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BUNDLE_BUDGETS, inspectBundle } from "../../scripts/check-bundle.ts";

const temporaryDirectories: string[] = [];

function fixtureDist(): string {
  const root = mkdtempSync(join(tmpdir(), "proofroom-bundle-"));
  temporaryDirectories.push(root);
  mkdirSync(join(root, "client", "assets"), { recursive: true });
  mkdirSync(join(root, "proofroom_webmcp", ".vite"), { recursive: true });
  writeFileSync(join(root, "client", "index.html"), "<main>ProofRoom</main>");
  writeFileSync(join(root, "client", "assets", "index.js"), "export const ready = true;");
  writeFileSync(join(root, "client", "assets", "index.css"), "main{display:block}");
  writeFileSync(join(root, "proofroom_webmcp", "index.js"), "export default {};");
  writeFileSync(join(root, "proofroom_webmcp", "wrangler.json"), "{}");
  writeFileSync(join(root, "proofroom_webmcp", ".vite", "manifest.json"), "{}");
  return root;
}

function deterministicNoise(size: number): Buffer {
  const chunks: Buffer[] = [];
  let written = 0;
  for (let index = 0; written < size; index += 1) {
    const chunk = createHash("sha256").update(`proofroom-bundle-fixture-${index}`).digest();
    chunks.push(chunk);
    written += chunk.length;
  }
  return Buffer.concat(chunks).subarray(0, size);
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("production bundle budget", () => {
  it("accepts the required client and Worker output within every budget", () => {
    const root = fixtureDist();
    writeFileSync(join(root, "client", "assets", "index.js.map"), "{}");
    writeFileSync(join(root, "client", "assets", "newsreader.woff2"), "font fixture");
    const report = inspectBundle(root);

    expect(report.status).toBe("pass");
    expect(Object.values(report.requiredOutputs).every(Boolean)).toBe(true);
    expect(report.reportedExcludedAssets.sourceMaps.files).toEqual([
      expect.objectContaining({ path: "client/assets/index.js.map" }),
    ]);
    expect(report.reportedExcludedAssets.selfHostedFonts.files).toEqual([
      expect.objectContaining({ path: "client/assets/newsreader.woff2" }),
    ]);
  });

  it("fails when a required output is missing", () => {
    const root = fixtureDist();
    rmSync(join(root, "client", "index.html"));

    const report = inspectBundle(root);

    expect(report.status).toBe("fail");
    expect(report.requiredOutputs.clientHtml).toBe(false);
  });

  it("fails when total client JavaScript gzip exceeds 150 KiB", () => {
    const root = fixtureDist();
    writeFileSync(
      join(root, "client", "assets", "index.js"),
      deterministicNoise(BUNDLE_BUDGETS.totalClientJsGzipBytes + 24 * 1024),
    );

    const report = inspectBundle(root);

    expect(report.status).toBe("fail");
    expect(report.metrics.totalClientJsGzip.pass).toBe(false);
  });

  it("fails when total client CSS gzip exceeds 40 KiB", () => {
    const root = fixtureDist();
    writeFileSync(
      join(root, "client", "assets", "index.css"),
      deterministicNoise(BUNDLE_BUDGETS.totalClientCssGzipBytes + 12 * 1024),
    );

    const report = inspectBundle(root);

    expect(report.status).toBe("fail");
    expect(report.metrics.totalClientCssGzip.pass).toBe(false);
  });

  it("fails with the exact path and size for an oversized JavaScript asset", () => {
    const root = fixtureDist();
    const path = join(root, "client", "assets", "oversized.js");
    const measuredBytes = BUNDLE_BUDGETS.individualClientJsRawBytes + 1;
    writeFileSync(path, Buffer.alloc(measuredBytes, "a"));

    const report = inspectBundle(root);

    expect(report.status).toBe("fail");
    expect(report.metrics.individualClientJsRaw).toContainEqual(
      expect.objectContaining({
        path: "client/assets/oversized.js",
        rawBytes: measuredBytes,
        pass: false,
      }),
    );
    expect(report.errors).toContain(
      `client/assets/oversized.js is ${measuredBytes} bytes, budget is ${BUNDLE_BUDGETS.individualClientJsRawBytes} bytes.`,
    );
  });
});
