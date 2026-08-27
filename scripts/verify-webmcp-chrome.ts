import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { MERIDIAN_CONTEXT_DRAFT } from "../src/fixtures/buyer.ts";
import { TOOL_NAMES } from "../src/webmcp/toolDefinitions.ts";
import { CONTENT_SECURITY_POLICY } from "../worker/responseContract.ts";
import { validateBaseUrl } from "./verify-public.ts";

export const CHROME_FEATURE_FLAGS = [
  "--enable-experimental-web-platform-features",
  "--enable-features=WebMCP,WebMCPTesting,DevToolsWebMCPSupport",
] as const;

export const NATIVE_TOOL_NAMES = [...TOOL_NAMES].sort((left, right) => left.localeCompare(right));
export const KNOWN_BROWSER_DIAGNOSTIC_CODE = "chrome_webmcp_testing_eval_hash_notice";
export const NATIVE_LIFECYCLE_PHASES = [
  "initial_registration",
  "native_discovery",
  "native_execution",
  "reload_registration",
  "cleanup",
  "other",
] as const;
export type NativeLifecyclePhase = (typeof NATIVE_LIFECYCLE_PHASES)[number];
export const ENTRY_FORBIDDEN_MARKERS = [
  "eval(",
  "new Function",
  "eval-sha256",
  "Hash of blocked script",
] as const;
const CHROME_VERSION = /^\d+(?:\.\d+){3}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const FINGERPRINTED_MODULE_ENTRY = /^\/assets\/[^/?#]+-[A-Za-z0-9_-]{6,}\.js$/;
const CHROME_WEBMCP_EVAL_HASH_NOTICE =
  /^\s*Hash of blocked script: "eval-sha256-[A-Za-z0-9+/]{43}="\.\s*$/;
export const NATIVE_READ_ONLY_TOOLS = new Set([
  "calculate_roi",
  "evaluate_requirement",
  "get_room_state",
  "search_product_evidence",
]);
const FORBIDDEN_TOOL_PARTS = [
  "approve",
  "reject",
  "reset",
  "recover",
  "apply_roi",
  "set_status",
  "author_status",
] as const;

type NativeTool = {
  name: string;
  description: string;
  inputSchema: unknown;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
};

export type ConsoleErrorEvent = {
  message: string;
  phase: NativeLifecyclePhase;
  location: {
    url: string;
    line: number;
    column: number;
  };
};

export type KnownBrowserDiagnostic = ConsoleErrorEvent & {
  code: typeof KNOWN_BROWSER_DIAGNOSTIC_CODE;
  chromeVersion: string;
  classificationReason: string;
};

export type EntryIntegrityEvidence = {
  url: string;
  path: string;
  sha256: string;
  byteCount: number;
  fingerprinted: true;
  scannedForbiddenMarkers: string[];
  forbiddenMarkerMatches: string[];
  passed: true;
};

export type NativeReceipt = {
  schemaVersion: 2;
  kind: "native_webmcp_chrome_verification";
  status: "passed";
  diagnosticOnly: boolean;
  localhostDiagnostic: boolean;
  browser: {
    product: "Google Chrome";
    version: string;
    headed: boolean;
    executable: string | "chrome-channel";
  };
  origin: string;
  flags: string[];
  toolNames: string[];
  reloadToolNames: string[];
  reloadRegistrationVerified: true;
  entryIntegrity: EntryIntegrityEvidence;
  effectiveCsp: string;
  inputMode: "object" | "json-string";
  executions: {
    getRoomState: {
      status: "succeeded";
      roomId: string;
      revision: number;
    };
    proposeBuyerContext: {
      status: "succeeded";
      proposalId: string;
      baseRevision: number;
    };
  };
  persistence: {
    revisionBeforeProposal: number;
    revisionAfterProposal: number;
    ledgerBeforeProposal: number;
    ledgerAfterProposal: number;
    pendingProposalVisible: boolean;
    approvedContextAbsent: boolean;
    persistedAfterReload: boolean;
    storageCleared: boolean;
  };
  applicationErrorCounts: {
    console: 0;
    page: 0;
    request: 0;
    response: 0;
  };
  applicationConsoleErrors: ConsoleErrorEvent[];
  pageErrors: string[];
  requestFailures: string[];
  responseFailures: string[];
  knownBrowserDiagnosticCount: 0 | 2;
  knownBrowserDiagnostics: KnownBrowserDiagnostic[];
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
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

function record(value: unknown, label: string): Record<string, unknown> {
  assert(
    value !== null && typeof value === "object" && !Array.isArray(value),
    `${label} must be an object.`,
  );
  return value as Record<string, unknown>;
}

function exactStringArray(value: unknown, label: string): string[] {
  assert(Array.isArray(value), `${label} must be an array.`);
  assert(value.every((entry) => typeof entry === "string"), `${label} must contain strings.`);
  return value;
}

function exactFlags(value: unknown, label: string): string[] {
  const flags = exactStringArray(value, label);
  assert(
    JSON.stringify(flags) === JSON.stringify(CHROME_FEATURE_FLAGS),
    `${label} must contain the exact required Chrome flags with no extras.`,
  );
  return flags;
}

function validChromeVersion(value: unknown, label: string): string {
  assert(typeof value === "string" && CHROME_VERSION.test(value), `${label} must be a numeric Chrome version.`);
  return value;
}

function exactToolNames(value: unknown, label: string): string[] {
  const names = exactStringArray(value, label);
  assert(
    JSON.stringify(names) === JSON.stringify(NATIVE_TOOL_NAMES),
    `${label} must match the exact ordered nine-tool contract.`,
  );
  return names;
}

function validLifecyclePhase(value: unknown, label: string): NativeLifecyclePhase {
  assert(
    typeof value === "string" &&
      NATIVE_LIFECYCLE_PHASES.includes(value as NativeLifecyclePhase),
    `${label} must be a recognized verifier lifecycle phase.`,
  );
  return value as NativeLifecyclePhase;
}

function knownBrowserDiagnosticReason(chromeVersion: string): string {
  return `Chrome ${chromeVersion} attributed the blocked WebMCP testing registration script to the loaded module entry during initial and reload registration. Exact phase, source, entry-integrity, strict CSP, native execution, and count checks passed.`;
}

export function validateEntryIntegrity(
  value: unknown,
  label = "Native entry integrity",
): EntryIntegrityEvidence {
  const entry = record(value, label);
  assertExactKeys(
    entry,
    [
      "url",
      "path",
      "sha256",
      "byteCount",
      "fingerprinted",
      "scannedForbiddenMarkers",
      "forbiddenMarkerMatches",
      "passed",
    ],
    label,
  );
  assert(typeof entry.url === "string" && entry.url.length > 0, `${label}.url is missing.`);
  let url: URL;
  try {
    url = new URL(entry.url);
  } catch {
    throw new Error(`${label}.url must be an absolute URL.`);
  }
  assert(
    url.protocol === "http:" || url.protocol === "https:",
    `${label}.url must use HTTP or HTTPS.`,
  );
  assert(url.search === "" && url.hash === "", `${label}.url must not contain a query or hash.`);
  assert(entry.path === url.pathname, `${label}.path must equal the loaded entry URL path.`);
  assert(
    typeof entry.path === "string" &&
      FINGERPRINTED_MODULE_ENTRY.test(entry.path) &&
      !entry.path.includes("\\") &&
      !entry.path.split("/").includes(".."),
    `${label}.path must be a repository-safe fingerprinted module entry path.`,
  );
  assert(
    typeof entry.sha256 === "string" && SHA256.test(entry.sha256),
    `${label}.sha256 must be a lowercase SHA-256 digest.`,
  );
  assert(
    Number.isInteger(entry.byteCount) && Number(entry.byteCount) > 0,
    `${label}.byteCount must be a positive integer.`,
  );
  assert(entry.fingerprinted === true, `${label}.fingerprinted must be true.`);
  assert(
    JSON.stringify(entry.scannedForbiddenMarkers) === JSON.stringify(ENTRY_FORBIDDEN_MARKERS),
    `${label}.scannedForbiddenMarkers must contain the exact forbidden marker set.`,
  );
  assert(
    Array.isArray(entry.forbiddenMarkerMatches) && entry.forbiddenMarkerMatches.length === 0,
    `${label} contains a forbidden application bundle marker.`,
  );
  assert(entry.passed === true, `${label}.passed must be true.`);
  return entry as EntryIntegrityEvidence;
}

function validateEffectiveCsp(value: unknown, label: string): string {
  assert(value === CONTENT_SECURITY_POLICY, `${label} must match the exact strict Worker CSP.`);
  assert(
    !CONTENT_SECURITY_POLICY.includes("unsafe-eval") &&
      !CONTENT_SECURITY_POLICY.includes("eval-sha256"),
    `${label} must not contain an eval allowance.`,
  );
  return value;
}

function asKnownBrowserDiagnostic(
  event: ConsoleErrorEvent,
  context: {
    chromeVersion: string;
    entryIntegrity: EntryIntegrityEvidence;
  },
): KnownBrowserDiagnostic | null {
  if (
    !CHROME_WEBMCP_EVAL_HASH_NOTICE.test(event.message) ||
    !new Set<NativeLifecyclePhase>(["initial_registration", "reload_registration"]).has(
      event.phase,
    ) ||
    event.location.url !== context.entryIntegrity.url ||
    !Number.isInteger(event.location.line) ||
    event.location.line <= 0 ||
    !Number.isInteger(event.location.column) ||
    event.location.column < 0
  ) {
    return null;
  }
  return {
    ...event,
    code: KNOWN_BROWSER_DIAGNOSTIC_CODE,
    chromeVersion: context.chromeVersion,
    classificationReason: knownBrowserDiagnosticReason(context.chromeVersion),
  };
}

export function classifyChromeWebMcpTestingDiagnostics(
  events: readonly ConsoleErrorEvent[],
  context: {
    browserProduct: string;
    chromeVersion: string;
    headed: boolean;
    flags: readonly string[];
    functionalAssertionsPassed: boolean;
    initialToolNames: readonly string[];
    reloadToolNames: readonly string[];
    reloadRegistrationVerified: boolean;
    entryIntegrity: EntryIntegrityEvidence;
    effectiveCsp: string;
  },
): {
  applicationConsoleErrors: ConsoleErrorEvent[];
  knownBrowserDiagnostics: KnownBrowserDiagnostic[];
} {
  assert(
    context.functionalAssertionsPassed,
    "Chrome testing diagnostics cannot be classified before all native functional assertions pass.",
  );
  assert(context.browserProduct === "Google Chrome", "Chrome testing diagnostics require Google Chrome.");
  validChromeVersion(context.chromeVersion, "Chrome testing diagnostic version");
  exactFlags(context.flags, "Chrome testing diagnostic flags");
  exactToolNames(context.initialToolNames, "Initial native registration tools");
  exactToolNames(context.reloadToolNames, "Reload native registration tools");
  assert(
    context.reloadRegistrationVerified === true,
    "Chrome testing diagnostics require verified reload registration.",
  );
  const entryIntegrity = validateEntryIntegrity(
    context.entryIntegrity,
    "Chrome testing diagnostic entry integrity",
  );
  validateEffectiveCsp(context.effectiveCsp, "Chrome testing diagnostic CSP");
  if (events.length === 0) {
    return { applicationConsoleErrors: [], knownBrowserDiagnostics: [] };
  }
  assert(context.headed, "Chrome testing diagnostics require a headed browser.");

  const applicationConsoleErrors: ConsoleErrorEvent[] = [];
  const knownBrowserDiagnostics: KnownBrowserDiagnostic[] = [];
  for (const event of events) {
    validLifecyclePhase(event.phase, "Chrome console event phase");
    const known = asKnownBrowserDiagnostic(event, {
      chromeVersion: context.chromeVersion,
      entryIntegrity,
    });
    if (known) {
      knownBrowserDiagnostics.push(known);
    } else {
      applicationConsoleErrors.push(event);
    }
  }
  assert(
    knownBrowserDiagnostics.length === 0 || knownBrowserDiagnostics.length === 2,
    `Known Chrome WebMCP testing diagnostic count must be zero or exactly two, received ${knownBrowserDiagnostics.length}.`,
  );
  if (knownBrowserDiagnostics.length === 2) {
    assert(
      knownBrowserDiagnostics[0]?.message === knownBrowserDiagnostics[1]?.message,
      "Known Chrome WebMCP testing diagnostic messages must be byte-for-byte identical.",
    );
    assert(
      new Set(knownBrowserDiagnostics.map((diagnostic) => diagnostic.phase)).size === 2 &&
        knownBrowserDiagnostics.some(
          (diagnostic) => diagnostic.phase === "initial_registration",
        ) &&
        knownBrowserDiagnostics.some(
          (diagnostic) => diagnostic.phase === "reload_registration",
        ),
      "Known Chrome WebMCP testing diagnostics must occur once during initial registration and once during reload registration.",
    );
    const [first, second] = knownBrowserDiagnostics;
    assert(
      first?.location.url === second?.location.url &&
        first?.location.line === second?.location.line &&
        first?.location.column === second?.location.column,
      "Known Chrome WebMCP testing diagnostic locations must match exactly.",
    );
  }
  return { applicationConsoleErrors, knownBrowserDiagnostics };
}

function parseSchema(value: unknown, name: string): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      throw new Error(`Native tool ${name} returned an invalid JSON input schema.`);
    }
  }
  assert(value !== null && typeof value === "object", `Native tool ${name} has no object input schema.`);
  return value as Record<string, unknown>;
}

export function validateNativeTools(value: unknown): NativeTool[] {
  assert(Array.isArray(value), "document.modelContext.getTools() did not return an array.");
  const tools = value as NativeTool[];
  const names = tools.map((tool) => tool.name);
  assert(new Set(names).size === names.length, "Native WebMCP discovery returned duplicate tool names.");
  assert(
    JSON.stringify(names) === JSON.stringify(NATIVE_TOOL_NAMES),
    `Native WebMCP discovery returned the wrong ordered tools: ${names.join(", ")}.`,
  );

  for (const tool of tools) {
    assert(
      typeof tool.description === "string" && tool.description.trim().length > 0,
      `Native tool ${tool.name} has no description.`,
    );
    const schema = parseSchema(tool.inputSchema, tool.name);
    assert(schema.type === "object", `Native tool ${tool.name} input schema is not an object.`);
    assert(
      schema.additionalProperties === false,
      `Native tool ${tool.name} input schema does not reject unknown keys.`,
    );
    assert(
      Boolean(tool.annotations?.readOnlyHint) === NATIVE_READ_ONLY_TOOLS.has(tool.name),
      `Native tool ${tool.name} has an incorrect read-only annotation.`,
    );
    assert(
      Boolean(tool.annotations?.untrustedContentHint) ===
        (tool.name === "search_product_evidence"),
      `Native tool ${tool.name} has an incorrect untrusted-content annotation.`,
    );
    assert(
      !FORBIDDEN_TOOL_PARTS.some((part) => tool.name.includes(part)),
      `Forbidden human-authority or direct-state tool discovered: ${tool.name}.`,
    );
  }
  return tools;
}

export function assertNativeSurface(value: unknown): asserts value is {
  getTools: (...args: unknown[]) => Promise<unknown>;
  executeTool: (...args: unknown[]) => Promise<unknown>;
} {
  assert(value !== null && typeof value === "object", "Native WebMCP API unavailable: document.modelContext is absent.");
  const surface = value as Record<string, unknown>;
  assert(
    typeof surface.getTools === "function",
    "Native WebMCP API incompatible: document.modelContext.getTools() is unavailable.",
  );
  assert(
    typeof surface.executeTool === "function",
    "Native WebMCP API incompatible: document.modelContext.executeTool() is unavailable.",
  );
}

export function resolveChromeExecutable(override?: string): string | undefined {
  if (!override) return undefined;
  const absolute = resolve(override);
  assert(existsSync(absolute), `Google Chrome executable override does not exist: ${absolute}.`);
  return absolute;
}

function safeStructuredResult(result: unknown): Record<string, unknown> {
  let value = result;
  if (typeof result === "string") {
    try {
      value = JSON.parse(result);
    } catch {
      const jsonStart = result.indexOf("\n\n{");
      assert(jsonStart >= 0, "Native tool execution did not return a structured result.");
      value = JSON.parse(result.slice(jsonStart + 2));
    }
  }
  assert(value !== null && typeof value === "object", "Native tool execution result is not structured.");
  const record = value as Record<string, unknown>;
  if (record.structuredContent && typeof record.structuredContent === "object") {
    return record.structuredContent as Record<string, unknown>;
  }
  if (record.result && typeof record.result === "object") {
    return record.result as Record<string, unknown>;
  }
  return record;
}

export function validateNativeReceipt(value: unknown): NativeReceipt {
  const receiptRecord = record(value, "Native receipt");
  assertExactKeys(
    receiptRecord,
    [
      "schemaVersion",
      "kind",
      "status",
      "diagnosticOnly",
      "localhostDiagnostic",
      "browser",
      "origin",
      "flags",
      "toolNames",
      "reloadToolNames",
      "reloadRegistrationVerified",
      "entryIntegrity",
      "effectiveCsp",
      "inputMode",
      "executions",
      "persistence",
      "applicationErrorCounts",
      "applicationConsoleErrors",
      "pageErrors",
      "requestFailures",
      "responseFailures",
      "knownBrowserDiagnosticCount",
      "knownBrowserDiagnostics",
    ],
    "Native receipt",
  );
  const receipt = receiptRecord as NativeReceipt;
  assert(receipt.schemaVersion === 2, "Native receipt schemaVersion must be 2.");
  assert(receipt.kind === "native_webmcp_chrome_verification", "Native receipt kind is invalid.");
  assert(receipt.status === "passed", "Native receipt does not represent a passing run.");
  assert(typeof receipt.diagnosticOnly === "boolean", "Native receipt diagnosticOnly must be boolean.");
  assert(
    typeof receipt.localhostDiagnostic === "boolean",
    "Native receipt localhostDiagnostic must be boolean.",
  );
  let origin: URL;
  try {
    origin = new URL(receipt.origin);
  } catch {
    throw new Error("Native receipt origin must be a valid URL origin.");
  }
  assert(
    origin.pathname === "/" && origin.search === "" && origin.hash === "",
    "Native receipt origin must not contain a path, query, or hash.",
  );
  if (origin.protocol === "https:") {
    assert(!receipt.localhostDiagnostic, "HTTPS native evidence cannot be marked as a localhost diagnostic.");
  } else {
    assert(
      receipt.localhostDiagnostic &&
        origin.protocol === "http:" &&
        new Set(["localhost", "127.0.0.1", "[::1]"]).has(origin.hostname),
      "Non-HTTPS native evidence must be explicitly marked as a localhost diagnostic.",
    );
  }
  const browser = record(receipt.browser, "Native receipt browser");
  assertExactKeys(browser, ["product", "version", "headed", "executable"], "Native receipt browser");
  assert(receipt.browser.product === "Google Chrome", "Native receipt must identify Google Chrome.");
  validChromeVersion(receipt.browser.version, "Native receipt Chrome version");
  assert(typeof receipt.browser.headed === "boolean", "Native receipt browser.headed must be boolean.");
  assert(
    receipt.browser.headed ? receipt.diagnosticOnly === false : receipt.diagnosticOnly === true,
    "Headed native evidence must not be diagnostic-only, and headless evidence must be diagnostic-only.",
  );
  assert(
    typeof receipt.browser.executable === "string" && receipt.browser.executable.length > 0,
    "Native receipt browser executable is missing.",
  );
  exactFlags(receipt.flags, "Native receipt flags");
  exactToolNames(receipt.toolNames, "Native receipt initial tool names");
  exactToolNames(receipt.reloadToolNames, "Native receipt reload tool names");
  assert(
    receipt.reloadRegistrationVerified === true,
    "Native receipt must prove exact reload registration.",
  );
  const entryIntegrity = validateEntryIntegrity(
    receipt.entryIntegrity,
    "Native receipt entryIntegrity",
  );
  assert(
    new URL(entryIntegrity.url).origin === origin.origin,
    "Native receipt module entry must be same-origin.",
  );
  validateEffectiveCsp(receipt.effectiveCsp, "Native receipt effectiveCsp");
  assert(
    receipt.inputMode === "object" || receipt.inputMode === "json-string",
    "Native receipt inputMode must be object or json-string.",
  );
  const executions = record(receipt.executions, "Native receipt executions");
  assertExactKeys(executions, ["getRoomState", "proposeBuyerContext"], "Native receipt executions");
  const getRoomState = record(executions.getRoomState, "Native get_room_state execution");
  assertExactKeys(getRoomState, ["status", "roomId", "revision"], "Native get_room_state execution");
  assert(getRoomState.status === "succeeded", "Native get_room_state execution did not succeed.");
  assert(
    typeof getRoomState.roomId === "string" && getRoomState.roomId.length > 0,
    "Native get_room_state execution has no safe room ID summary.",
  );
  assert(
    Number.isInteger(getRoomState.revision) && Number(getRoomState.revision) >= 0,
    "Native get_room_state execution has no safe revision summary.",
  );
  const proposeBuyerContext = record(
    executions.proposeBuyerContext,
    "Native propose_buyer_context execution",
  );
  assertExactKeys(
    proposeBuyerContext,
    ["status", "proposalId", "baseRevision"],
    "Native propose_buyer_context execution",
  );
  assert(
    proposeBuyerContext.status === "succeeded",
    "Native propose_buyer_context execution did not succeed.",
  );
  assert(
    typeof proposeBuyerContext.proposalId === "string" &&
      proposeBuyerContext.proposalId.length > 0,
    "Native propose_buyer_context execution has no safe proposal ID summary.",
  );
  assert(
    Number.isInteger(proposeBuyerContext.baseRevision),
    "Native propose_buyer_context execution has no safe base revision summary.",
  );
  const persistence = record(receipt.persistence, "Native receipt persistence");
  assertExactKeys(
    persistence,
    [
      "revisionBeforeProposal",
      "revisionAfterProposal",
      "ledgerBeforeProposal",
      "ledgerAfterProposal",
      "pendingProposalVisible",
      "approvedContextAbsent",
      "persistedAfterReload",
      "storageCleared",
    ],
    "Native receipt persistence",
  );
  for (const field of [
    "revisionBeforeProposal",
    "revisionAfterProposal",
    "ledgerBeforeProposal",
    "ledgerAfterProposal",
  ] as const) {
    assert(
      Number.isInteger(receipt.persistence[field]) && receipt.persistence[field] >= 0,
      `Native receipt persistence.${field} must be a nonnegative integer.`,
    );
  }
  assert(
    getRoomState.revision === receipt.persistence.revisionBeforeProposal,
    "Native get_room_state summary does not match the pre-proposal revision.",
  );
  assert(
    proposeBuyerContext.baseRevision === receipt.persistence.revisionAfterProposal,
    "Native proposal summary does not match the post-proposal revision.",
  );
  assert(receipt.persistence.revisionAfterProposal === receipt.persistence.revisionBeforeProposal + 1, "Native proposal did not advance revision exactly once.");
  assert(receipt.persistence.ledgerAfterProposal === receipt.persistence.ledgerBeforeProposal + 1, "Native proposal did not append exactly one ledger event.");
  assert(receipt.persistence.pendingProposalVisible, "Native proposal was not visible.");
  assert(receipt.persistence.approvedContextAbsent, "Native proposal incorrectly approved buyer context.");
  assert(receipt.persistence.persistedAfterReload, "Native proposal did not persist across reload.");
  assert(receipt.persistence.storageCleared, "Native verifier did not clear site storage.");
  const applicationErrorCounts = record(
    receipt.applicationErrorCounts,
    "Native receipt applicationErrorCounts",
  );
  assertExactKeys(
    applicationErrorCounts,
    ["console", "page", "request", "response"],
    "Native receipt applicationErrorCounts",
  );
  assert(
    Array.isArray(receipt.applicationConsoleErrors),
    "Native receipt applicationConsoleErrors must be an array.",
  );
  const applicationConsoleErrors = receipt.applicationConsoleErrors;
  const pageErrors = exactStringArray(receipt.pageErrors, "Native receipt pageErrors");
  const requestFailures = exactStringArray(
    receipt.requestFailures,
    "Native receipt requestFailures",
  );
  const responseFailures = exactStringArray(
    receipt.responseFailures,
    "Native receipt responseFailures",
  );
  assert(
    receipt.applicationErrorCounts.console === applicationConsoleErrors.length &&
      receipt.applicationErrorCounts.page === pageErrors.length &&
      receipt.applicationErrorCounts.request === requestFailures.length &&
      receipt.applicationErrorCounts.response === responseFailures.length,
    "Native application error counts must equal their backing array lengths.",
  );
  assert(
    applicationConsoleErrors.length === 0 &&
      pageErrors.length === 0 &&
      requestFailures.length === 0 &&
      responseFailures.length === 0,
    "Native receipt contains an application console, page, request, or response error.",
  );
  assert(
    Array.isArray(receipt.knownBrowserDiagnostics),
    "Native receipt knownBrowserDiagnostics must be an array.",
  );
  assert(
    receipt.knownBrowserDiagnosticCount === receipt.knownBrowserDiagnostics.length,
    "Native known browser diagnostic count must equal its backing array length.",
  );
  assert(
    receipt.knownBrowserDiagnosticCount === 0 || receipt.knownBrowserDiagnosticCount === 2,
    "Native known browser diagnostic count must be zero or exactly two.",
  );
  for (const [index, diagnosticValue] of receipt.knownBrowserDiagnostics.entries()) {
    const diagnostic = record(
      diagnosticValue,
      `Native known browser diagnostic ${index}`,
    );
    assertExactKeys(
      diagnostic,
      [
        "code",
        "message",
        "phase",
        "location",
        "chromeVersion",
        "classificationReason",
      ],
      `Native known browser diagnostic ${index}`,
    );
    assert(
      typeof diagnostic.message === "string" && diagnostic.message.length <= 512,
      `Native known browser diagnostic ${index}.message is invalid.`,
    );
    validLifecyclePhase(
      diagnostic.phase,
      `Native known browser diagnostic ${index}.phase`,
    );
    const location = record(
      diagnostic.location,
      `Native known browser diagnostic ${index}.location`,
    );
    assertExactKeys(
      location,
      ["url", "line", "column"],
      `Native known browser diagnostic ${index}.location`,
    );
  }
  const classified = classifyChromeWebMcpTestingDiagnostics(
    receipt.knownBrowserDiagnostics.map((diagnostic) => ({
      message: diagnostic.message,
      phase: diagnostic.phase,
      location: diagnostic.location,
    })),
    {
      browserProduct: receipt.browser.product,
      chromeVersion: receipt.browser.version,
      headed: receipt.browser.headed,
      flags: receipt.flags,
      functionalAssertionsPassed: true,
      initialToolNames: receipt.toolNames,
      reloadToolNames: receipt.reloadToolNames,
      reloadRegistrationVerified: receipt.reloadRegistrationVerified,
      entryIntegrity,
      effectiveCsp: receipt.effectiveCsp,
    },
  );
  assert(
    classified.knownBrowserDiagnostics.length === receipt.knownBrowserDiagnostics.length,
    "Native receipt contains an invalid known browser diagnostic.",
  );
  for (const diagnostic of receipt.knownBrowserDiagnostics) {
    assert(
      diagnostic.code === KNOWN_BROWSER_DIAGNOSTIC_CODE &&
        diagnostic.chromeVersion === receipt.browser.version &&
        diagnostic.classificationReason ===
          knownBrowserDiagnosticReason(receipt.browser.version),
      "Native receipt known browser diagnostic metadata is invalid.",
    );
  }
  return receipt;
}

async function resolveLoadedEntryIntegrity(
  page: Page,
  context: BrowserContext,
  origin: string,
): Promise<EntryIntegrityEvidence> {
  const moduleEntries = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]'),
      (script) => script.src,
    ),
  );
  assert(
    moduleEntries.length === 1,
    `Expected exactly one loaded module entry, received ${moduleEntries.length}.`,
  );
  const entryUrl = new URL(moduleEntries[0] ?? "");
  assert(
    entryUrl.origin === origin,
    "Loaded module entry must be same-origin with the verified document.",
  );
  assert(
    entryUrl.search === "" && entryUrl.hash === "",
    "Loaded module entry URL must not contain a query or hash.",
  );
  assert(
    FINGERPRINTED_MODULE_ENTRY.test(entryUrl.pathname),
    "Loaded module entry path must be fingerprinted.",
  );

  const response = await context.request.get(entryUrl.href);
  assert(
    response.ok(),
    `Loaded module entry fetch failed with HTTP ${response.status()}.`,
  );
  const bytes = await response.body();
  assert(bytes.byteLength > 0, "Loaded module entry is empty.");
  const source = bytes.toString("utf8");
  const forbiddenMarkerMatches = ENTRY_FORBIDDEN_MARKERS.filter((marker) =>
    source.includes(marker),
  );
  assert(
    forbiddenMarkerMatches.length === 0,
    `Loaded module entry contains forbidden markers: ${forbiddenMarkerMatches.join(", ")}.`,
  );
  const evidence: EntryIntegrityEvidence = {
    url: entryUrl.href,
    path: entryUrl.pathname,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    byteCount: bytes.byteLength,
    fingerprinted: true,
    scannedForbiddenMarkers: [...ENTRY_FORBIDDEN_MARKERS],
    forbiddenMarkerMatches,
    passed: true,
  };
  return validateEntryIntegrity(evidence);
}

async function discoverNativeTools(page: Page): Promise<NativeTool[]> {
  await page.waitForFunction(
    async (expectedCount) => {
      const modelContext = document.modelContext as unknown as {
        getTools?: () => Promise<unknown[]>;
      };
      if (typeof modelContext?.getTools !== "function") return false;
      try {
        return (await modelContext.getTools()).length === expectedCount;
      } catch {
        return false;
      }
    },
    NATIVE_TOOL_NAMES.length,
    { timeout: 15_000 },
  );
  const discovered = await page.evaluate(async () => {
    const modelContext = document.modelContext as unknown as {
      getTools(): Promise<unknown[]>;
    };
    return modelContext.getTools();
  });
  return validateNativeTools(discovered);
}

async function readPersistedRoom(page: Page): Promise<{
  revision: number;
  ledgerCount: number;
  proposalId: string | null;
  approvedContextPresent: boolean;
}> {
  return page.evaluate(() => {
    const raw = localStorage.getItem("proofroom.room.v1");
    if (!raw) {
      throw new Error("ProofRoom did not persist room state after native tool execution.");
    }
    const room = (JSON.parse(raw) as {
      room: {
        revision: number;
        activityLedger: unknown[];
        buyerContextProposal: { id: string } | null;
        approvedBuyerContext: unknown;
      };
    }).room;
    return {
      revision: room.revision,
      ledgerCount: room.activityLedger.length,
      proposalId: room.buyerContextProposal?.id ?? null,
      approvedContextPresent: room.approvedBuyerContext !== null,
    };
  });
}

async function executeNative(
  page: Page,
  toolName: string,
  input: Record<string, unknown>,
  mode: "object" | "json-string",
): Promise<unknown> {
  return page.evaluate(
    async ({ name, args, inputMode }) => {
      const modelContext = document.modelContext as unknown as {
        getTools(): Promise<Array<{ name: string }>>;
        executeTool(tool: { name: string }, input: unknown): Promise<unknown>;
      };
      const tools = await modelContext.getTools();
      const tool = tools.find((candidate) => candidate.name === name);
      if (!tool) throw new Error(`Native tool not found: ${name}`);
      return modelContext.executeTool(tool, inputMode === "json-string" ? JSON.stringify(args) : args);
    },
    { name: toolName, args: input, inputMode: mode },
  );
}

async function executeReadWithDetectedMode(
  page: Page,
): Promise<{ result: unknown; mode: "object" | "json-string" }> {
  try {
    return {
      result: await executeNative(page, "get_room_state", { detail: "requirements" }, "object"),
      mode: "object",
    };
  } catch (objectError) {
    try {
      return {
        result: await executeNative(page, "get_room_state", { detail: "requirements" }, "json-string"),
        mode: "json-string",
      };
    } catch (stringError) {
      const first = objectError instanceof Error ? objectError.message : "object input failed";
      const second = stringError instanceof Error ? stringError.message : "JSON string input failed";
      throw new Error(`Native executeTool is incompatible. Object input: ${first}. JSON string input: ${second}.`);
    }
  }
}

function writeNativeReceipt(repositoryRoot: string, outputPath: string, receipt: NativeReceipt): string {
  assert(!isAbsolute(outputPath), "Native evidence output must be repository-relative.");
  const destination = resolve(repositoryRoot, outputPath);
  const fromRoot = relative(repositoryRoot, destination);
  assert(fromRoot !== "" && fromRoot !== ".." && !fromRoot.startsWith(`..${sep}`), "Native evidence output must stay inside the repository.");
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, `${JSON.stringify(receipt, null, 2)}\n`);
  return fromRoot;
}

export async function runNativeVerifier(options: {
  baseUrl: string;
  allowHttp?: boolean;
  executablePath?: string;
  headless?: boolean;
  outputPath?: string;
  repositoryRoot?: string;
  launchContext?: (
    profileDirectory: string,
    options: Parameters<typeof chromium.launchPersistentContext>[1],
  ) => Promise<BrowserContext>;
  removeProfile?: (path: string) => void;
}): Promise<NativeReceipt> {
  const origin = validateBaseUrl(options.baseUrl, options.allowHttp);
  const executablePath = resolveChromeExecutable(options.executablePath);
  const headless = options.headless === true;
  const profileDirectory = mkdtempSync(join(tmpdir(), "proofroom-webmcp-chrome-"));
  const removeProfile = options.removeProfile ?? ((path: string) => rmSync(path, { recursive: true, force: true }));
  let context: BrowserContext | null = null;

  try {
    const launchContext =
      options.launchContext ?? chromium.launchPersistentContext.bind(chromium);
    try {
      context = await launchContext(profileDirectory, {
        channel: executablePath ? undefined : "chrome",
        executablePath,
        headless,
        args: [...CHROME_FEATURE_FLAGS],
        viewport: { width: 1440, height: 1000 },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown launch failure";
      throw new Error(`Google Chrome could not launch with native WebMCP flags: ${message}`);
    }

    const page = context.pages()[0] ?? (await context.newPage());
    const consoleEvents: ConsoleErrorEvent[] = [];
    const pageErrors: string[] = [];
    const requestFailures: string[] = [];
    const responseFailures: string[] = [];
    let lifecyclePhase: NativeLifecyclePhase = "other";
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const location = message.location();
      consoleEvents.push({
        message: message.text().slice(0, 512),
        phase: lifecyclePhase,
        location: {
          url: location.url,
          line: location.lineNumber,
          column: location.columnNumber,
        },
      });
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => {
      requestFailures.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
    });
    page.on("response", (response) => {
      if (response.status() >= 400) responseFailures.push(`${response.status()} ${response.url()}`);
    });

    lifecyclePhase = "initial_registration";
    const navigationResponse = await page.goto(origin.origin, { waitUntil: "networkidle" });
    assert(navigationResponse !== null, "Initial navigation returned no browser response.");
    const effectiveCsp = navigationResponse.headers()["content-security-policy"] ?? "";
    validateEffectiveCsp(effectiveCsp, "Initial navigation effective CSP");
    const entryIntegrity = await resolveLoadedEntryIntegrity(page, context, origin.origin);

    lifecyclePhase = "native_discovery";
    const surface = await page.evaluate(() => {
      const modelContext = document.modelContext as unknown as Record<string, unknown> | undefined;
      return modelContext
        ? {
            present: true,
            getTools: typeof modelContext.getTools,
            executeTool: typeof modelContext.executeTool,
          }
        : { present: false, getTools: "undefined", executeTool: "undefined" };
    });
    assert(
      surface.present,
      "Native WebMCP API unavailable: document.modelContext is absent after launching flagged Chrome.",
    );
    assert(
      surface.getTools === "function" && surface.executeTool === "function",
      `Native WebMCP API incompatible: getTools=${surface.getTools}, executeTool=${surface.executeTool}.`,
    );

    const tools = await discoverNativeTools(page);

    lifecyclePhase = "native_execution";
    const read = await executeReadWithDetectedMode(page);
    const getRoomState = safeStructuredResult(read.result);
    assert(typeof getRoomState.roomId === "string", "Native get_room_state result has no room ID.");
    assert(typeof getRoomState.revision === "number", "Native get_room_state result has no numeric revision.");
    const beforeProposal = await readPersistedRoom(page);

    const proposalResult = await executeNative(
      page,
      "propose_buyer_context",
      MERIDIAN_CONTEXT_DRAFT,
      read.mode,
    );
    const proposeBuyerContext = safeStructuredResult(proposalResult);
    assert(typeof proposeBuyerContext.proposalId === "string", "Native context proposal result has no proposal ID.");
    assert(
      typeof proposeBuyerContext.baseRevision === "number",
      "Native context proposal result has no numeric base revision.",
    );
    const afterProposal = await readPersistedRoom(page);
    assert(afterProposal.revision === beforeProposal.revision + 1, "Native context proposal did not advance revision exactly once.");
    assert(afterProposal.ledgerCount === beforeProposal.ledgerCount + 1, "Native context proposal did not append exactly one ledger event.");
    assert(!afterProposal.approvedContextPresent, "Native context proposal changed authoritative approved context.");
    const pendingProposalVisible = await page.locator("[data-proposal-status='pending']").isVisible();
    assert(pendingProposalVisible, "Native context proposal is not visible in the page.");

    lifecyclePhase = "reload_registration";
    const reloadResponse = await page.reload({ waitUntil: "networkidle" });
    assert(reloadResponse !== null, "Reload navigation returned no browser response.");
    const reloadCsp = reloadResponse.headers()["content-security-policy"] ?? "";
    assert(
      reloadCsp === effectiveCsp,
      "Reload effective CSP does not match the initial strict CSP.",
    );
    const reloadEntryIntegrity = await resolveLoadedEntryIntegrity(
      page,
      context,
      origin.origin,
    );
    assert(
      JSON.stringify(reloadEntryIntegrity) === JSON.stringify(entryIntegrity),
      "Reload module entry integrity does not match the initial loaded entry.",
    );

    lifecyclePhase = "native_discovery";
    const reloadTools = await discoverNativeTools(page);
    const reloadRegistrationVerified =
      JSON.stringify(reloadTools.map((tool) => tool.name)) ===
      JSON.stringify(NATIVE_TOOL_NAMES);
    assert(
      reloadRegistrationVerified,
      "Native reload registration did not preserve the exact nine tools.",
    );
    const reloaded = await readPersistedRoom(page);
    const persistedAfterReload =
      reloaded.proposalId === afterProposal.proposalId &&
      reloaded.revision === afterProposal.revision &&
      !reloaded.approvedContextPresent;
    assert(persistedAfterReload, "Native staged context did not persist across reload.");

    lifecyclePhase = "cleanup";
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    const storageCleared = await page.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0);
    assert(storageCleared, "Native verifier could not clear site storage.");
    lifecyclePhase = "other";
    const chromeVersion = context.browser()?.version() ?? "unknown";
    const classifiedConsole = classifyChromeWebMcpTestingDiagnostics(consoleEvents, {
      browserProduct: "Google Chrome",
      chromeVersion,
      headed: !headless,
      flags: CHROME_FEATURE_FLAGS,
      functionalAssertionsPassed: true,
      initialToolNames: tools.map((tool) => tool.name),
      reloadToolNames: reloadTools.map((tool) => tool.name),
      reloadRegistrationVerified,
      entryIntegrity,
      effectiveCsp,
    });
    assert(
      classifiedConsole.applicationConsoleErrors.length === 0,
      `Native Chrome application console errors: ${JSON.stringify(
        classifiedConsole.applicationConsoleErrors,
      )}`,
    );
    assert(pageErrors.length === 0, `Native Chrome page errors: ${pageErrors.join(" | ")}`);
    assert(requestFailures.length === 0, `Native Chrome request failures: ${requestFailures.join(" | ")}`);
    assert(responseFailures.length === 0, `Native Chrome HTTP failures: ${responseFailures.join(" | ")}`);

    const receipt: NativeReceipt = {
      schemaVersion: 2,
      kind: "native_webmcp_chrome_verification",
      status: "passed",
      diagnosticOnly: headless,
      localhostDiagnostic: origin.protocol === "http:",
      browser: {
        product: "Google Chrome",
        version: chromeVersion,
        headed: !headless,
        executable: executablePath ?? "chrome-channel",
      },
      origin: origin.origin,
      flags: [...CHROME_FEATURE_FLAGS],
      toolNames: tools.map((tool) => tool.name),
      reloadToolNames: reloadTools.map((tool) => tool.name),
      reloadRegistrationVerified: true,
      entryIntegrity,
      effectiveCsp,
      inputMode: read.mode,
      executions: {
        getRoomState: {
          status: "succeeded",
          roomId: getRoomState.roomId,
          revision: getRoomState.revision,
        },
        proposeBuyerContext: {
          status: "succeeded",
          proposalId: proposeBuyerContext.proposalId,
          baseRevision: proposeBuyerContext.baseRevision,
        },
      },
      persistence: {
        revisionBeforeProposal: beforeProposal.revision,
        revisionAfterProposal: afterProposal.revision,
        ledgerBeforeProposal: beforeProposal.ledgerCount,
        ledgerAfterProposal: afterProposal.ledgerCount,
        pendingProposalVisible,
        approvedContextAbsent: !afterProposal.approvedContextPresent,
        persistedAfterReload,
        storageCleared,
      },
      applicationErrorCounts: {
        console: 0,
        page: 0,
        request: 0,
        response: 0,
      },
      applicationConsoleErrors: classifiedConsole.applicationConsoleErrors,
      pageErrors,
      requestFailures,
      responseFailures,
      knownBrowserDiagnosticCount: classifiedConsole.knownBrowserDiagnostics.length as 0 | 2,
      knownBrowserDiagnostics: classifiedConsole.knownBrowserDiagnostics,
    };
    validateNativeReceipt(receipt);

    if (options.outputPath) {
      writeNativeReceipt(options.repositoryRoot ?? process.cwd(), options.outputPath, receipt);
    }
    return receipt;
  } finally {
    await context?.close().catch(() => undefined);
    removeProfile(profileDirectory);
  }
}

async function main(): Promise<void> {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const receipt = await runNativeVerifier({
    baseUrl: process.env.PROOFROOM_BASE_URL ?? "",
    allowHttp: process.env.PROOFROOM_ALLOW_HTTP === "1",
    executablePath: process.env.PROOFROOM_CHROME_EXECUTABLE,
    headless: process.env.PROOFROOM_NATIVE_HEADLESS === "1",
    outputPath: process.env.PROOFROOM_NATIVE_OUTPUT,
    repositoryRoot,
  });
  console.log(JSON.stringify(receipt, null, 2));
}

if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Native Chrome WebMCP verification failed.");
    process.exitCode = 1;
  });
}
