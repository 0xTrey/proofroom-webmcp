import { describe, expect, it, vi } from "vitest";
import {
  assertNativeSurface,
  CHROME_FEATURE_FLAGS,
  classifyChromeWebMcpTestingDiagnostics,
  ENTRY_FORBIDDEN_MARKERS,
  KNOWN_BROWSER_DIAGNOSTIC_CODE,
  NATIVE_READ_ONLY_TOOLS,
  NATIVE_TOOL_NAMES,
  type EntryIntegrityEvidence,
  type NativeReceipt,
  resolveChromeExecutable,
  runNativeVerifier,
  validateNativeReceipt,
  validateNativeTools,
} from "../../scripts/verify-webmcp-chrome.ts";
import { CONTENT_SECURITY_POLICY } from "../../worker/responseContract.ts";

function discoveredTools() {
  return NATIVE_TOOL_NAMES.map((name) => ({
    name,
    description: `Native description for ${name}`,
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: NATIVE_READ_ONLY_TOOLS.has(name),
      untrustedContentHint: name === "search_product_evidence",
    },
  }));
}

const knownMessage =
  ' Hash of blocked script: "eval-sha256-+CsItOgDyYUV0cButNNF02fx9NeCL52rS31Mq6+jjQM=".';
const entryUrl = "http://127.0.0.1:8787/assets/index-CitHfJ6b.js";

function entryIntegrity(): EntryIntegrityEvidence {
  return {
    url: entryUrl,
    path: "/assets/index-CitHfJ6b.js",
    sha256: "a".repeat(64),
    byteCount: 321_456,
    fingerprinted: true,
    scannedForbiddenMarkers: [...ENTRY_FORBIDDEN_MARKERS],
    forbiddenMarkerMatches: [],
    passed: true,
  };
}

function knownDiagnostic(
  phase: "initial_registration" | "reload_registration" = "initial_registration",
) {
  return {
    code: KNOWN_BROWSER_DIAGNOSTIC_CODE,
    message: knownMessage,
    phase,
    location: { url: entryUrl, line: 8, column: 0 },
    chromeVersion: "151.0.7922.174",
    classificationReason:
      "Chrome 151.0.7922.174 attributed the blocked WebMCP testing registration script to the loaded module entry during initial and reload registration. Exact phase, source, entry-integrity, strict CSP, native execution, and count checks passed.",
  } as const;
}

function classifierContext() {
  return {
    browserProduct: "Google Chrome",
    chromeVersion: "151.0.7922.174",
    headed: true,
    flags: CHROME_FEATURE_FLAGS,
    functionalAssertionsPassed: true,
    initialToolNames: NATIVE_TOOL_NAMES,
    reloadToolNames: NATIVE_TOOL_NAMES,
    reloadRegistrationVerified: true,
    entryIntegrity: entryIntegrity(),
    effectiveCsp: CONTENT_SECURITY_POLICY,
  };
}

function passingReceipt(): NativeReceipt {
  return {
    schemaVersion: 2,
    kind: "native_webmcp_chrome_verification",
    status: "passed",
    diagnosticOnly: false,
    localhostDiagnostic: true,
    browser: {
      product: "Google Chrome",
      version: "151.0.7922.174",
      headed: true,
      executable: "chrome-channel",
    },
    origin: "http://127.0.0.1:8787",
    flags: [...CHROME_FEATURE_FLAGS],
    toolNames: [...NATIVE_TOOL_NAMES],
    reloadToolNames: [...NATIVE_TOOL_NAMES],
    reloadRegistrationVerified: true,
    entryIntegrity: entryIntegrity(),
    effectiveCsp: CONTENT_SECURITY_POLICY,
    inputMode: "object",
    executions: {
      getRoomState: { status: "succeeded", roomId: "proofroom-demo", revision: 0 },
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
    knownBrowserDiagnosticCount: 2,
    knownBrowserDiagnostics: [
      knownDiagnostic("initial_registration"),
      knownDiagnostic("reload_registration"),
    ],
  };
}

describe("native flagged Chrome verifier", () => {
  it("validates the exact discovered names, strict schemas, and annotations", () => {
    expect(validateNativeTools(discoveredTools()).map((tool) => tool.name)).toEqual(
      NATIVE_TOOL_NAMES,
    );

    const wrongAnnotation = discoveredTools();
    const search = wrongAnnotation.find((tool) => tool.name === "search_product_evidence");
    if (search) search.annotations.untrustedContentHint = false;
    expect(() => validateNativeTools(wrongAnnotation)).toThrow(/untrusted-content annotation/);
  });

  it("fails precisely when the browser executable override is unavailable", () => {
    expect(() =>
      resolveChromeExecutable("/definitely/missing/proofroom-google-chrome"),
    ).toThrow(/executable override does not exist/);
  });

  it("fails precisely when the native testing API is unavailable", () => {
    expect(() => assertNativeSurface(undefined)).toThrow(/document\.modelContext is absent/);
    expect(() => assertNativeSurface({ getTools() {} })).toThrow(/executeTool\(\) is unavailable/);
  });

  it("accepts complete headed localhost evidence with two bounded diagnostics", () => {
    expect(validateNativeReceipt(passingReceipt()).status).toBe("passed");
  });

  it("classifies only exact phase-bound loaded-entry diagnostics after functional proof", () => {
    expect(
      classifyChromeWebMcpTestingDiagnostics(
        [
          {
            message: knownMessage,
            phase: "initial_registration",
            location: { url: entryUrl, line: 8, column: 0 },
          },
          {
            message: knownMessage,
            phase: "reload_registration",
            location: { url: entryUrl, line: 8, column: 0 },
          },
        ],
        classifierContext(),
      ).knownBrowserDiagnostics,
    ).toHaveLength(2);

    expect(() =>
      classifyChromeWebMcpTestingDiagnostics([], {
        ...classifierContext(),
        functionalAssertionsPassed: false,
      }),
    ).toThrow(/before all native functional assertions pass/);
  });

  it.each([
    ["wrong flags", (receipt: NativeReceipt) => receipt.flags.push("--extra"), /exact required Chrome flags/],
    ["extra tool", (receipt: NativeReceipt) => receipt.toolNames.push("approve_context"), /exact ordered nine-tool contract/],
    [
      "headless accepted evidence",
      (receipt: NativeReceipt) => {
        receipt.browser.headed = false;
      },
      /headless evidence must be diagnostic-only/,
    ],
    [
      "nonzero application error",
      (receipt: NativeReceipt) => {
        receipt.applicationErrorCounts.page = 1 as 0;
        receipt.pageErrors.push("page exploded");
      },
      /contains an application console, page, request, or response error/,
    ],
    [
      "missing execution proof",
      (receipt: NativeReceipt) => {
        delete (receipt.executions as Partial<NativeReceipt["executions"]>).getRoomState;
      },
      /Native receipt executions must contain exactly/,
    ],
  ])("rejects %s", (_label, mutate, pattern) => {
    const receipt = passingReceipt();
    mutate(receipt);
    expect(() => validateNativeReceipt(receipt)).toThrow(pattern);
  });

  it.each([1, 3])("rejects %i known browser diagnostics", (count) => {
    const receipt = passingReceipt();
    receipt.knownBrowserDiagnostics = Array.from({ length: count }, (_, index) =>
      knownDiagnostic(index === 0 ? "initial_registration" : "reload_registration"),
    );
    receipt.knownBrowserDiagnosticCount = count as 0 | 2;
    expect(() => validateNativeReceipt(receipt)).toThrow(/zero or exactly two/);
  });

  it("rejects a diagnostic in the wrong lifecycle phase", () => {
    const receipt = passingReceipt();
    receipt.knownBrowserDiagnostics[0] = {
      ...knownDiagnostic(),
      phase: "native_discovery",
    };
    expect(() => validateNativeReceipt(receipt)).toThrow(/diagnostic count must be zero or exactly two/);
  });

  it("rejects two diagnostics in one registration phase", () => {
    const receipt = passingReceipt();
    receipt.knownBrowserDiagnostics[1] = knownDiagnostic("initial_registration");
    expect(() => validateNativeReceipt(receipt)).toThrow(/once during initial registration/);
  });

  it("rejects a source URL other than the loaded module entry", () => {
    const receipt = passingReceipt();
    receipt.knownBrowserDiagnostics[0] = {
      ...knownDiagnostic(),
      location: {
        url: "http://127.0.0.1:8787/assets/other-AbCdEf12.js",
        line: 8,
        column: 0,
      },
    };
    expect(() => validateNativeReceipt(receipt)).toThrow(/diagnostic count must be zero or exactly two/);
  });

  it("rejects mismatched diagnostic messages", () => {
    const receipt = passingReceipt();
    receipt.knownBrowserDiagnostics[1] = {
      ...knownDiagnostic("reload_registration"),
      message:
        ' Hash of blocked script: "eval-sha256-/CsItOgDyYUV0cButNNF02fx9NeCL52rS31Mq6+jjQM=".',
    };
    expect(() => validateNativeReceipt(receipt)).toThrow(/byte-for-byte identical/);
  });

  it("rejects mismatched diagnostic locations", () => {
    const receipt = passingReceipt();
    receipt.knownBrowserDiagnostics[1] = {
      ...knownDiagnostic("reload_registration"),
      location: { url: entryUrl, line: 9, column: 0 },
    };
    expect(() => validateNativeReceipt(receipt)).toThrow(/locations must match exactly/);
  });

  it.each([
    ["zero", 0],
    ["nonnumeric", "8"],
  ])("rejects a %s source line", (_label, line) => {
    const receipt = passingReceipt();
    receipt.knownBrowserDiagnostics[0] = {
      ...knownDiagnostic(),
      location: { url: entryUrl, line: line as number, column: 0 },
    };
    expect(() => validateNativeReceipt(receipt)).toThrow(/diagnostic count must be zero or exactly two/);
  });

  it("rejects an entry scan containing a forbidden marker", () => {
    const receipt = passingReceipt();
    receipt.entryIntegrity.forbiddenMarkerMatches = ["eval("];
    expect(() => validateNativeReceipt(receipt)).toThrow(/forbidden application bundle marker/);
  });

  it("rejects a non-fingerprinted module entry", () => {
    const receipt = passingReceipt();
    receipt.entryIntegrity.url = "http://127.0.0.1:8787/assets/index.js";
    receipt.entryIntegrity.path = "/assets/index.js";
    expect(() => validateNativeReceipt(receipt)).toThrow(/fingerprinted module entry path/);
  });

  it("rejects an effective CSP mismatch", () => {
    const receipt = passingReceipt();
    receipt.effectiveCsp = `${CONTENT_SECURITY_POLICY}; script-src 'self' 'unsafe-eval'`;
    expect(() => validateNativeReceipt(receipt)).toThrow(/exact strict Worker CSP/);
  });

  it("rejects missing reload registration proof", () => {
    const receipt = passingReceipt();
    delete (receipt as Partial<NativeReceipt>).reloadRegistrationVerified;
    expect(() => validateNativeReceipt(receipt)).toThrow(/must contain exactly/);
  });

  it("rejects a missing entry digest", () => {
    const receipt = passingReceipt();
    delete (receipt.entryIntegrity as Partial<NativeReceipt["entryIntegrity"]>).sha256;
    expect(() => validateNativeReceipt(receipt)).toThrow(/must contain exactly/);
  });

  it("rejects a generic CSP error as an application error", () => {
    const receipt = passingReceipt();
    receipt.knownBrowserDiagnostics[0] = {
      ...knownDiagnostic(),
      message: "Refused to evaluate a string as JavaScript because unsafe-eval is not allowed.",
    };
    expect(() => validateNativeReceipt(receipt)).toThrow(/diagnostic count must be zero or exactly two/);
  });

  it("cleans the temporary profile after a launch failure", async () => {
    const removed: string[] = [];
    const launchContext = vi.fn(async () => {
      throw new Error("browser unavailable fixture");
    });

    await expect(
      runNativeVerifier({
        baseUrl: "http://127.0.0.1:8787",
        allowHttp: true,
        launchContext,
        removeProfile: (path) => removed.push(path),
      }),
    ).rejects.toThrow(/could not launch/);
    expect(launchContext).toHaveBeenCalledOnce();
    expect(removed).toHaveLength(1);
    expect(removed[0]).toContain("proofroom-webmcp-chrome-");
  });
});
