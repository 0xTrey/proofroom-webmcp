import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  validateReleaseReceipt,
  validateReleaseReceiptDocument,
  validateReleaseReceiptFile,
  validateReleaseReceiptSchema,
} from "../../scripts/release-receipt.ts";
import {
  computePublicVerificationReceiptDigest,
  REQUIRED_CSP_DIRECTIVES,
  REQUIRED_SECURITY_HEADERS,
  type PublicVerificationReceipt,
} from "../../scripts/verify-public.ts";
import {
  CHROME_FEATURE_FLAGS,
  ENTRY_FORBIDDEN_MARKERS,
  NATIVE_TOOL_NAMES,
  type NativeReceipt,
} from "../../scripts/verify-webmcp-chrome.ts";
import { CONTENT_SECURITY_POLICY } from "../../worker/responseContract.ts";

const digest = "a".repeat(64);
const commit = "b".repeat(40);
const temporaryRoots: string[] = [];

function preparation(cleanTree: boolean) {
  return {
    workerName: "proofroom-webmcp",
    compatibilityDate: "2026-08-26",
    sourceCommit: commit,
    cleanTree,
    githubRemote: "https://github.com/0xTrey/proofroom-webmcp.git",
    deterministicEvalReportDigest: digest,
    visualArtifactDigest: digest,
  };
}

function completeVerifiedFixture() {
  return {
    schemaVersion: 1,
    releaseId: "proofroom-synthetic-schema-fixture",
    state: "verified",
    preparedAt: "2026-08-27T03:13:00.000Z",
    publicUrl: "https://proofroom.example",
    preparation: preparation(true),
    deployment: {
      gitCommit: commit,
      cleanTreeProof: "git status --porcelain returned no output",
      githubRemote: "https://github.com/0xTrey/proofroom-webmcp.git",
      publicRepositoryUrl: "https://github.com/0xTrey/proofroom-webmcp",
      cloudflareAccountLabel: "fixture-account",
      workerName: "proofroom-webmcp",
      deploymentId: "fixture-deployment-id",
      deployedAt: "2026-08-27T04:00:00.000Z",
      wranglerVersion: "4.126.0",
      build: {
        staticAssetCount: 8,
        staticAssetBytes: 500000,
        clientJavaScriptGzipBytes: 120000,
        clientCssGzipBytes: 25000,
        workerBytes: 3000,
      },
    },
    verification: {
      verifiedAt: "2026-08-27T05:00:00.000Z",
      deterministicEvalReportDigest: digest,
      responseHeaders: {
        "origin-agent-cluster": "?1",
        "referrer-policy": "strict-origin-when-cross-origin",
        "x-content-type-options": "nosniff",
        "cross-origin-opener-policy": "same-origin",
        "content-security-policy": CONTENT_SECURITY_POLICY,
        "strict-transport-security": "max-age=31536000; includeSubDomains",
      },
      httpVerifier: {
        result: "passed",
        receiptPath: "artifacts/release/http.json",
        receiptDigest: digest,
      },
      publicPlaywright: { result: "passed", passed: 2, failed: 0 },
      nativeChrome: {
        product: "Google Chrome",
        version: "151.0.7922.174",
        headed: true,
        diagnosticOnly: false,
        receiptSchemaVersion: 2,
        contract: "phase-bound-entry-integrity-v1",
        flags: [...CHROME_FEATURE_FLAGS],
        toolNames: [...NATIVE_TOOL_NAMES],
        executionResult: "passed",
        reloadRegistrationVerified: true,
        entryIntegrity: {
          path: "/assets/index-CitHfJ6b.js",
          sha256: digest,
          byteCount: 321_456,
        },
        effectiveCsp: CONTENT_SECURITY_POLICY,
        applicationErrorCounts: { console: 0, page: 0, request: 0, response: 0 },
        knownBrowserDiagnosticCount: 2,
        knownBrowserDiagnosticPhases: [
          "initial_registration",
          "reload_registration",
        ],
        knownBrowserDiagnosticLocation: {
          path: "/assets/index-CitHfJ6b.js",
          line: 8,
          column: 0,
        },
        evidencePath: "artifacts/release/native.json",
        evidenceDigest: digest,
      },
      uiOnlyJourney: "passed",
      applicationErrorCounts: { console: 0, page: 0, request: 0, response: 0 },
      knownBrowserDiagnosticCount: 2,
      visualArtifactDigestBefore: digest,
      visualArtifactDigestAfter: digest,
      liveAgentSelectionStatus: "not_run",
    },
    knownLimitations: ["Synthetic fixture used only to test the complete schema shape."],
  };
}

type VerifiedFixture = ReturnType<typeof completeVerifiedFixture>;

function temporaryRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "proofroom-release-receipt-"));
  temporaryRoots.push(root);
  return root;
}

function writeJson(root: string, path: string, value: unknown): string {
  const destination = join(root, path);
  mkdirSync(dirname(destination), { recursive: true });
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  writeFileSync(destination, bytes);
  return createHash("sha256").update(bytes).digest("hex");
}

function publicEvidence(origin: string): PublicVerificationReceipt {
  const assets = {
    module: "/assets/index-CitHfJ6b.js",
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

function nativeEvidence(origin: string): NativeReceipt {
  return {
    schemaVersion: 2,
    kind: "native_webmcp_chrome_verification",
    status: "passed",
    diagnosticOnly: false,
    localhostDiagnostic: false,
    browser: {
      product: "Google Chrome",
      version: "151.0.7922.174",
      headed: true,
      executable: "chrome-channel",
    },
    origin,
    flags: [...CHROME_FEATURE_FLAGS],
    toolNames: [...NATIVE_TOOL_NAMES],
    reloadToolNames: [...NATIVE_TOOL_NAMES],
    reloadRegistrationVerified: true,
    entryIntegrity: {
      url: `${origin}/assets/index-CitHfJ6b.js`,
      path: "/assets/index-CitHfJ6b.js",
      sha256: digest,
      byteCount: 321_456,
      fingerprinted: true,
      scannedForbiddenMarkers: [...ENTRY_FORBIDDEN_MARKERS],
      forbiddenMarkerMatches: [],
      passed: true,
    },
    effectiveCsp: CONTENT_SECURITY_POLICY,
    inputMode: "object",
    executions: {
      getRoomState: {
        status: "succeeded",
        roomId: "northstar_meridian_room",
        revision: 0,
      },
      proposeBuyerContext: {
        status: "succeeded",
        proposalId: "pcx_0001",
        baseRevision: 1,
      },
    },
    persistence: {
      revisionBeforeProposal: 0,
      revisionAfterProposal: 1,
      ledgerBeforeProposal: 2,
      ledgerAfterProposal: 3,
      pendingProposalVisible: true,
      approvedContextAbsent: true,
      persistedAfterReload: true,
      storageCleared: true,
    },
    applicationErrorCounts: { console: 0, page: 0, request: 0, response: 0 },
    applicationConsoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    responseFailures: [],
    knownBrowserDiagnosticCount: 0,
    knownBrowserDiagnostics: [],
  };
}

function materializeEvidence(
  root: string,
  receipt: VerifiedFixture,
  publicReceipt = publicEvidence(receipt.publicUrl),
  nativeReceipt = nativeEvidence(receipt.publicUrl),
): void {
  receipt.verification.httpVerifier.receiptDigest = writeJson(
    root,
    receipt.verification.httpVerifier.receiptPath,
    publicReceipt,
  );
  const finalNative = receipt.verification.nativeChrome as Record<string, unknown>;
  finalNative.product = nativeReceipt.browser.product;
  finalNative.version = nativeReceipt.browser.version;
  finalNative.headed = nativeReceipt.browser.headed;
  finalNative.diagnosticOnly = nativeReceipt.diagnosticOnly;
  finalNative.receiptSchemaVersion = nativeReceipt.schemaVersion;
  finalNative.flags = [...nativeReceipt.flags];
  finalNative.toolNames = [...nativeReceipt.toolNames];
  finalNative.reloadRegistrationVerified =
    nativeReceipt.reloadRegistrationVerified;
  finalNative.entryIntegrity = {
    path: nativeReceipt.entryIntegrity.path,
    sha256: nativeReceipt.entryIntegrity.sha256,
    byteCount: nativeReceipt.entryIntegrity.byteCount,
  };
  finalNative.effectiveCsp = nativeReceipt.effectiveCsp;
  finalNative.applicationErrorCounts = {
    ...nativeReceipt.applicationErrorCounts,
  };
  finalNative.knownBrowserDiagnosticCount =
    nativeReceipt.knownBrowserDiagnosticCount;
  finalNative.knownBrowserDiagnosticPhases = [];
  finalNative.knownBrowserDiagnosticLocation = null;
  (receipt.verification as Record<string, unknown>).knownBrowserDiagnosticCount =
    nativeReceipt.knownBrowserDiagnosticCount;
  finalNative.evidenceDigest = writeJson(
    root,
    String(finalNative.evidencePath),
    nativeReceipt,
  );
}

function writeReleaseReceipt(root: string, receipt: VerifiedFixture): void {
  writeJson(root, "release.json", receipt);
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("release receipt contract", () => {
  it("accepts the honest prepared receipt without deployment claims", () => {
    const prepared = JSON.parse(
      readFileSync("artifacts/release/prepared-receipt.json", "utf8"),
    ) as unknown;

    expect(validateReleaseReceipt(prepared).state).toBe("prepared");
    expect(prepared).not.toHaveProperty("publicUrl");
    expect(prepared).not.toHaveProperty("deployment");
    expect(prepared).not.toHaveProperty("verification");
  });

  it("fails closed when a verified claim is missing proof", () => {
    const receipt = completeVerifiedFixture();
    const verification = receipt.verification as {
      nativeChrome: Record<string, unknown>;
    };
    delete verification.nativeChrome.evidencePath;

    expect(() => validateReleaseReceipt(receipt)).toThrow(
      /verification\.nativeChrome must contain exactly/,
    );
  });

  it("accepts a complete synthetic verified fixture shape", () => {
    const fixture = completeVerifiedFixture();
    expect(validateReleaseReceipt(fixture).state).toBe("verified");
    expect(validateReleaseReceiptSchema(fixture).state).toBe("verified");
  });

  it("runs JSON Schema validation after handwritten validation", () => {
    const fixture = completeVerifiedFixture();
    fixture.knownLimitations = Array.from(
      { length: 21 },
      (_, index) => `Schema-only limitation ${index}`,
    );

    expect(validateReleaseReceipt(fixture).state).toBe("verified");
    expect(() => validateReleaseReceiptDocument(fixture)).toThrow(
      /JSON Schema validation failed/,
    );
  });

  it.each([
    [
      "preparation",
      (receipt: VerifiedFixture) => {
        Object.assign(receipt.preparation, { extra: true });
      },
    ],
    [
      "deployment",
      (receipt: VerifiedFixture) => {
        Object.assign(receipt.deployment, { extra: true });
      },
    ],
    [
      "deployment.build",
      (receipt: VerifiedFixture) => {
        Object.assign(receipt.deployment.build, { extra: true });
      },
    ],
    [
      "verification",
      (receipt: VerifiedFixture) => {
        Object.assign(receipt.verification, { extra: true });
      },
    ],
    [
      "verification.responseHeaders",
      (receipt: VerifiedFixture) => {
        Object.assign(receipt.verification.responseHeaders, { extra: true });
      },
    ],
    [
      "verification.httpVerifier",
      (receipt: VerifiedFixture) => {
        Object.assign(receipt.verification.httpVerifier, { extra: true });
      },
    ],
    [
      "verification.publicPlaywright",
      (receipt: VerifiedFixture) => {
        Object.assign(receipt.verification.publicPlaywright, { extra: true });
      },
    ],
    [
      "verification.nativeChrome",
      (receipt: VerifiedFixture) => {
        Object.assign(receipt.verification.nativeChrome, { extra: true });
      },
    ],
    [
      "verification.nativeChrome.entryIntegrity",
      (receipt: VerifiedFixture) => {
        Object.assign(receipt.verification.nativeChrome.entryIntegrity, {
          extra: true,
        });
      },
    ],
    [
      "verification.nativeChrome.applicationErrorCounts",
      (receipt: VerifiedFixture) => {
        Object.assign(
          receipt.verification.nativeChrome.applicationErrorCounts,
          { extra: true },
        );
      },
    ],
    [
      "verification.nativeChrome.knownBrowserDiagnosticLocation",
      (receipt: VerifiedFixture) => {
        Object.assign(
          receipt.verification.nativeChrome.knownBrowserDiagnosticLocation,
          { extra: true },
        );
      },
    ],
    [
      "verification.applicationErrorCounts",
      (receipt: VerifiedFixture) => {
        Object.assign(receipt.verification.applicationErrorCounts, {
          extra: true,
        });
      },
    ],
  ])("rejects an extra key in %s in both validators", (_label, mutate) => {
    const receipt = completeVerifiedFixture();
    mutate(receipt);
    expect(() => validateReleaseReceipt(receipt)).toThrow(/must contain exactly/);
    expect(() => validateReleaseReceiptSchema(receipt)).toThrow(
      /JSON Schema validation failed/,
    );
  });

  it("rejects an extra failure key in both validators", () => {
    const receipt = {
      schemaVersion: 1,
      releaseId: "proofroom-failed-fixture",
      state: "failed",
      preparedAt: "2026-08-27T03:13:00.000Z",
      preparation: preparation(false),
      failure: {
        stage: "verification",
        message: "Synthetic failure.",
        extra: true,
      },
      knownLimitations: [],
    };
    expect(() => validateReleaseReceipt(receipt)).toThrow(/must contain exactly/);
    expect(() => validateReleaseReceiptSchema(receipt)).toThrow(
      /JSON Schema validation failed/,
    );
  });

  it.each([
    [
      "prepared after deployment",
      (receipt: VerifiedFixture) => {
        receipt.preparedAt = "2026-08-27T04:30:00.000Z";
      },
      /preparedAt/,
    ],
    [
      "deployment after verification",
      (receipt: VerifiedFixture) => {
        receipt.verification.verifiedAt = "2026-08-27T03:30:00.000Z";
      },
      /deployedAt/,
    ],
    [
      "invalid verification timestamp",
      (receipt: VerifiedFixture) => {
        receipt.verification.verifiedAt = "2026-99-99T99:99:99Z";
      },
      /valid UTC date-time/,
    ],
    [
      "source commit mismatch",
      (receipt: VerifiedFixture) => {
        receipt.deployment.gitCommit = "c".repeat(40);
      },
      /sourceCommit/,
    ],
    [
      "GitHub remote mismatch",
      (receipt: VerifiedFixture) => {
        receipt.deployment.githubRemote =
          "https://github.com/0xTrey/other-repository.git";
      },
      /githubRemote/,
    ],
    [
      "public repository mismatch",
      (receipt: VerifiedFixture) => {
        receipt.deployment.publicRepositoryUrl =
          "https://github.com/0xTrey/other-repository";
      },
      /publicRepositoryUrl/,
    ],
    [
      "worker name mismatch",
      (receipt: VerifiedFixture) => {
        receipt.deployment.workerName = "other-worker";
      },
      /workerName/,
    ],
    [
      "deterministic eval digest mismatch",
      (receipt: VerifiedFixture) => {
        receipt.verification.deterministicEvalReportDigest = "c".repeat(64);
      },
      /deterministic eval digests/,
    ],
    [
      "preparation visual digest mismatch",
      (receipt: VerifiedFixture) => {
        receipt.preparation.visualArtifactDigest = "c".repeat(64);
      },
      /visual artifact digests/,
    ],
    [
      "visual digest before mismatch",
      (receipt: VerifiedFixture) => {
        receipt.verification.visualArtifactDigestBefore = "c".repeat(64);
      },
      /visual artifact digests|must match/,
    ],
    [
      "visual digest after mismatch",
      (receipt: VerifiedFixture) => {
        receipt.verification.visualArtifactDigestAfter = "c".repeat(64);
      },
      /visual artifact digests|must match/,
    ],
    [
      "free-form live agent status",
      (receipt: VerifiedFixture) => {
        receipt.verification.liveAgentSelectionStatus =
          "Natural-language selection was not run.";
      },
      /not_run, passed, or blocked/,
    ],
    [
      "public URL path",
      (receipt: VerifiedFixture) => {
        receipt.publicUrl = "https://proofroom.example/private";
      },
      /credential-free HTTPS origin/,
    ],
    [
      "public URL credentials",
      (receipt: VerifiedFixture) => {
        receipt.publicUrl = "https://user:secret@proofroom.example";
      },
      /credential-free HTTPS origin/,
    ],
  ])("rejects %s", (_label, mutate, pattern) => {
    const receipt = completeVerifiedFixture();
    mutate(receipt);
    expect(() => validateReleaseReceiptDocument(receipt)).toThrow(pattern);
  });

  it.each([
    "https://proofroom.example/private",
    "https://user:secret@proofroom.example",
  ])("rejects non-origin public URL %s in both validators", (publicUrl) => {
    const receipt = completeVerifiedFixture();
    receipt.publicUrl = publicUrl;
    expect(() => validateReleaseReceipt(receipt)).toThrow(
      /credential-free HTTPS origin/,
    );
    expect(() => validateReleaseReceiptSchema(receipt)).toThrow(
      /JSON Schema validation failed/,
    );
  });

  it("declares all four lifecycle states in the machine schema", () => {
    const lifecycleSchema = JSON.parse(
      readFileSync("artifacts/release/release-receipt.schema.json", "utf8"),
    ) as { properties: { state: { enum: string[] } } };
    expect(lifecycleSchema.properties.state.enum).toEqual([
      "prepared",
      "deployed",
      "verified",
      "failed",
    ]);
  });

  it.each([
    [
      "wrong tool name",
      (receipt: VerifiedFixture) => {
        (receipt.verification.nativeChrome.toolNames as string[])[0] = "approve_context";
      },
      /exact nine tools/,
    ],
    [
      "wrong header value",
      (receipt: VerifiedFixture) => {
        receipt.verification.responseHeaders["x-content-type-options"] = "sniff";
      },
      /exact Worker response contract/,
    ],
    [
      "unsafe CSP",
      (receipt: VerifiedFixture) => {
        receipt.verification.responseHeaders["content-security-policy"] =
          `${CONTENT_SECURITY_POLICY}; script-src 'self' 'unsafe-eval'`;
      },
      /exact Worker response contract|must not allow eval/,
    ],
    [
      "absolute evidence path",
      (receipt: VerifiedFixture) => {
        receipt.verification.nativeChrome.evidencePath = "/tmp/native.json";
      },
      /repository-relative path/,
    ],
    [
      "traversing evidence path",
      (receipt: VerifiedFixture) => {
        receipt.verification.httpVerifier.receiptPath = "artifacts/../outside.json";
      },
      /repository-relative path/,
    ],
    [
      "invalid timestamp",
      (receipt: VerifiedFixture) => {
        receipt.deployment.deployedAt = "2026-99-99T99:99:99Z";
      },
      /valid UTC date-time/,
    ],
    [
      "headless native evidence",
      (receipt: VerifiedFixture) => {
        receipt.verification.nativeChrome.headed = false;
      },
      /headed must be true/,
    ],
    [
      "missing native entry digest",
      (receipt: VerifiedFixture) => {
        delete (receipt.verification.nativeChrome.entryIntegrity as {
          sha256?: string;
        }).sha256;
      },
      /entryIntegrity must contain exactly/,
    ],
    [
      "missing reload registration proof",
      (receipt: VerifiedFixture) => {
        receipt.verification.nativeChrome.reloadRegistrationVerified = false;
      },
      /reloadRegistrationVerified must be true/,
    ],
    [
      "wrong diagnostic phases",
      (receipt: VerifiedFixture) => {
        receipt.verification.nativeChrome.knownBrowserDiagnosticPhases = [
          "reload_registration",
          "initial_registration",
        ];
      },
      /exact initial and reload registration phases/,
    ],
    [
      "nonzero application errors",
      (receipt: VerifiedFixture) => {
        receipt.verification.applicationErrorCounts.page = 1;
      },
      /must be zero/,
    ],
    [
      "inconsistent known diagnostic count",
      (receipt: VerifiedFixture) => {
        receipt.verification.knownBrowserDiagnosticCount = 0;
      },
      /must equal the native receipt count/,
    ],
  ])("rejects %s in both TypeScript and JSON Schema validation", (_name, mutate, error) => {
    const receipt = completeVerifiedFixture();
    mutate(receipt);
    expect(() => validateReleaseReceipt(receipt)).toThrow(error);
    expect(() => validateReleaseReceiptSchema(receipt)).toThrow(
      /JSON Schema validation failed/,
    );
  });

  it("rejects a diagnostic source path that contradicts the entry path", () => {
    const receipt = completeVerifiedFixture();
    receipt.verification.nativeChrome.knownBrowserDiagnosticLocation.path =
      "/assets/other-AbCdEf12.js";
    expect(() => validateReleaseReceipt(receipt)).toThrow(
      /location path must equal the loaded module entry path/,
    );
  });

  it("validates a verified receipt against real referenced evidence bytes", () => {
    const root = temporaryRoot();
    const receipt = completeVerifiedFixture();
    materializeEvidence(root, receipt);
    writeReleaseReceipt(root, receipt);

    expect(validateReleaseReceiptFile("release.json", root).state).toBe(
      "verified",
    );
  });

  it("fails when referenced evidence is missing", () => {
    const root = temporaryRoot();
    const receipt = completeVerifiedFixture();
    materializeEvidence(root, receipt);
    rmSync(join(root, receipt.verification.httpVerifier.receiptPath));
    writeReleaseReceipt(root, receipt);

    expect(() => validateReleaseReceiptFile("release.json", root)).toThrow(
      /missing or unreadable/,
    );
  });

  it("fails when a referenced evidence digest differs from its bytes", () => {
    const root = temporaryRoot();
    const receipt = completeVerifiedFixture();
    materializeEvidence(root, receipt);
    receipt.verification.httpVerifier.receiptDigest = "c".repeat(64);
    writeReleaseReceipt(root, receipt);

    expect(() => validateReleaseReceiptFile("release.json", root)).toThrow(
      /digest does not match/,
    );
  });

  it("fails when public evidence describes another origin", () => {
    const root = temporaryRoot();
    const receipt = completeVerifiedFixture();
    materializeEvidence(
      root,
      receipt,
      publicEvidence("https://other.example"),
      nativeEvidence(receipt.publicUrl),
    );
    writeReleaseReceipt(root, receipt);

    expect(() => validateReleaseReceiptFile("release.json", root)).toThrow(
      /Public HTTP evidence origin/,
    );
  });

  it("fails when the native evidence summary differs from the final receipt", () => {
    const root = temporaryRoot();
    const receipt = completeVerifiedFixture();
    materializeEvidence(root, receipt);
    const changedNative = nativeEvidence(receipt.publicUrl);
    changedNative.entryIntegrity.byteCount += 1;
    receipt.verification.nativeChrome.evidenceDigest = writeJson(
      root,
      receipt.verification.nativeChrome.evidencePath,
      changedNative,
    );
    writeReleaseReceipt(root, receipt);

    expect(() => validateReleaseReceiptFile("release.json", root)).toThrow(
      /entry-integrity summary/,
    );
  });
});
