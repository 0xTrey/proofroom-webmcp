import { createHash } from "node:crypto";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep, win32 } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { TOOL_NAMES } from "../src/webmcp/toolDefinitions.ts";
import { SECURITY_HEADERS } from "../worker/responseContract.ts";
import {
  CHROME_FEATURE_FLAGS,
  validateNativeReceipt,
  type NativeReceipt,
} from "./verify-webmcp-chrome.ts";
import {
  validatePublicVerificationReceipt,
  type PublicVerificationReceipt,
} from "./verify-public.ts";

const STATES = new Set(["prepared", "deployed", "verified", "failed"]);
const SHA256 = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const CHROME_VERSION = /^\d+(?:\.\d+){3}$/;
const UTC_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const FINGERPRINTED_MODULE_ENTRY = /^\/assets\/[^/?#]+-[A-Za-z0-9_-]{6,}\.js$/;
const PHASE_BOUND_NATIVE_CONTRACT = "phase-bound-entry-integrity-v1";
const LIVE_AGENT_SELECTION_STATUSES = new Set(["not_run", "passed", "blocked"]);
const RELEASE_SCHEMA_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../artifacts/release/release-receipt.schema.json",
);
const REQUIRED_RESPONSE_HEADERS = Object.fromEntries(
  SECURITY_HEADERS.map(([name, value]) => [name.toLowerCase(), value]),
);
const PREPARATION_KEYS = [
  "workerName",
  "compatibilityDate",
  "sourceCommit",
  "cleanTree",
  "githubRemote",
  "deterministicEvalReportDigest",
  "visualArtifactDigest",
] as const;
const DEPLOYMENT_KEYS = [
  "gitCommit",
  "cleanTreeProof",
  "githubRemote",
  "publicRepositoryUrl",
  "cloudflareAccountLabel",
  "workerName",
  "deploymentId",
  "deployedAt",
  "wranglerVersion",
  "build",
] as const;
const BUILD_KEYS = [
  "staticAssetCount",
  "staticAssetBytes",
  "clientJavaScriptGzipBytes",
  "clientCssGzipBytes",
  "workerBytes",
] as const;
const VERIFICATION_KEYS = [
  "verifiedAt",
  "deterministicEvalReportDigest",
  "responseHeaders",
  "httpVerifier",
  "publicPlaywright",
  "nativeChrome",
  "uiOnlyJourney",
  "applicationErrorCounts",
  "knownBrowserDiagnosticCount",
  "visualArtifactDigestBefore",
  "visualArtifactDigestAfter",
  "liveAgentSelectionStatus",
] as const;
const TOP_LEVEL_KEYS = new Set([
  "schemaVersion",
  "releaseId",
  "state",
  "preparedAt",
  "publicUrl",
  "preparation",
  "deployment",
  "verification",
  "failure",
  "knownLimitations",
]);
let compiledSchemaValidator: ValidateFunction | null = null;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function record(value: unknown, label: string): Record<string, unknown> {
  assert(value !== null && typeof value === "object" && !Array.isArray(value), `${label} must be an object.`);
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

function string(value: unknown, label: string): string {
  assert(typeof value === "string" && value.length > 0, `${label} must be a non-empty string.`);
  return value;
}

function utcDateTime(value: unknown, label: string): string {
  const text = string(value, label);
  assert(
    UTC_DATE_TIME.test(text) && Number.isFinite(Date.parse(text)),
    `${label} must be a valid UTC date-time ending in Z.`,
  );
  return text;
}

function repositoryRelativePath(value: unknown, label: string): string {
  const text = string(value, label);
  assert(
    !isAbsolute(text) &&
      !win32.isAbsolute(text) &&
      !text.includes("\\") &&
      !text.split("/").includes(".."),
    `${label} must be a repository-relative path without traversal.`,
  );
  return text;
}

function digest(value: unknown, label: string): string {
  const text = string(value, label);
  assert(SHA256.test(text), `${label} must be a lowercase SHA-256 digest.`);
  return text;
}

function httpsUrl(value: unknown, label: string): string {
  const text = string(value, label);
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }
  assert(url.protocol === "https:", `${label} must use HTTPS.`);
  return text;
}

function httpsOrigin(value: unknown, label: string): string {
  const text = httpsUrl(value, label);
  const url = new URL(text);
  assert(
    url.username === "" &&
      url.password === "" &&
      url.pathname === "/" &&
      url.search === "" &&
      url.hash === "",
    `${label} must be a credential-free HTTPS origin without a path, query, or hash.`,
  );
  return url.origin;
}

function githubRepositoryIdentity(value: unknown, label: string): string {
  const text = httpsUrl(value, label);
  const url = new URL(text);
  assert(
    url.hostname.toLowerCase() === "github.com" &&
      url.port === "" &&
      url.username === "" &&
      url.password === "" &&
      url.search === "" &&
      url.hash === "",
    `${label} must identify a public HTTPS github.com repository.`,
  );
  const path = url.pathname.replace(/^\/+|\/+$/g, "").replace(/\.git$/i, "");
  const segments = path.split("/");
  assert(
    segments.length === 2 && segments.every((segment) => segment.length > 0),
    `${label} must identify exactly one GitHub owner and repository.`,
  );
  return `github.com/${segments.map((segment) => segment.toLowerCase()).join("/")}`;
}

function sameRecord(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): boolean {
  const leftEntries = Object.entries(left).sort(([leftKey], [rightKey]) =>
    leftKey.localeCompare(rightKey),
  );
  const rightEntries = Object.entries(right).sort(([leftKey], [rightKey]) =>
    leftKey.localeCompare(rightKey),
  );
  return JSON.stringify(leftEntries) === JSON.stringify(rightEntries);
}

function exactZero(value: unknown, label: string): void {
  assert(value === 0, `${label} must be zero.`);
}

function applicationErrorCounts(value: unknown, label: string): Record<string, unknown> {
  const counts = record(value, label);
  assertExactKeys(counts, ["console", "page", "request", "response"], label);
  for (const field of ["console", "page", "request", "response"]) {
    exactZero(counts[field], `${label}.${field}`);
  }
  return counts;
}

function knownDiagnosticCount(value: unknown, label: string): 0 | 2 {
  assert(value === 0 || value === 2, `${label} must be zero or exactly two.`);
  return value;
}

function validatePreparation(value: unknown): Record<string, unknown> {
  const preparation = record(value, "preparation");
  assertExactKeys(preparation, PREPARATION_KEYS, "preparation");
  assert(preparation.workerName === "proofroom-webmcp", "preparation.workerName is invalid.");
  assert(/^\d{4}-\d{2}-\d{2}$/.test(string(preparation.compatibilityDate, "preparation.compatibilityDate")), "preparation.compatibilityDate is invalid.");
  assert(COMMIT.test(string(preparation.sourceCommit, "preparation.sourceCommit")), "preparation.sourceCommit must be a full Git SHA.");
  assert(typeof preparation.cleanTree === "boolean", "preparation.cleanTree must be boolean.");
  string(preparation.githubRemote, "preparation.githubRemote");
  digest(preparation.deterministicEvalReportDigest, "preparation.deterministicEvalReportDigest");
  digest(preparation.visualArtifactDigest, "preparation.visualArtifactDigest");
  return preparation;
}

function validateDeployment(value: unknown): Record<string, unknown> {
  const deployment = record(value, "deployment");
  assertExactKeys(deployment, DEPLOYMENT_KEYS, "deployment");
  assert(COMMIT.test(string(deployment.gitCommit, "deployment.gitCommit")), "deployment.gitCommit must be a full Git SHA.");
  string(deployment.cleanTreeProof, "deployment.cleanTreeProof");
  string(deployment.githubRemote, "deployment.githubRemote");
  httpsUrl(deployment.publicRepositoryUrl, "deployment.publicRepositoryUrl");
  string(deployment.cloudflareAccountLabel, "deployment.cloudflareAccountLabel");
  assert(deployment.workerName === "proofroom-webmcp", "deployment.workerName is invalid.");
  string(deployment.deploymentId, "deployment.deploymentId");
  utcDateTime(deployment.deployedAt, "deployment.deployedAt");
  string(deployment.wranglerVersion, "deployment.wranglerVersion");
  const build = record(deployment.build, "deployment.build");
  assertExactKeys(build, BUILD_KEYS, "deployment.build");
  for (const field of BUILD_KEYS) {
    assert(Number.isInteger(build[field]) && Number(build[field]) > 0, `deployment.build.${field} must be a positive integer.`);
  }
  return deployment;
}

function validateVerification(value: unknown): Record<string, unknown> {
  const verification = record(value, "verification");
  assertExactKeys(verification, VERIFICATION_KEYS, "verification");
  utcDateTime(verification.verifiedAt, "verification.verifiedAt");
  digest(verification.deterministicEvalReportDigest, "verification.deterministicEvalReportDigest");

  const headers = record(verification.responseHeaders, "verification.responseHeaders");
  assertExactKeys(
    headers,
    Object.keys(REQUIRED_RESPONSE_HEADERS),
    "verification.responseHeaders",
  );
  for (const [name, expected] of Object.entries(REQUIRED_RESPONSE_HEADERS)) {
    assert(
      headers[name] === expected,
      `verification.responseHeaders.${name} must match the exact Worker response contract.`,
    );
  }
  const csp = string(
    headers["content-security-policy"],
    "verification.responseHeaders.content-security-policy",
  );
  assert(
    !csp.includes("unsafe-eval") && !csp.includes("eval-sha256"),
    "verification.responseHeaders.content-security-policy must not allow eval.",
  );

  const http = record(verification.httpVerifier, "verification.httpVerifier");
  assertExactKeys(
    http,
    ["result", "receiptPath", "receiptDigest"],
    "verification.httpVerifier",
  );
  assert(http.result === "passed", "verification.httpVerifier.result must be passed.");
  repositoryRelativePath(http.receiptPath, "verification.httpVerifier.receiptPath");
  digest(http.receiptDigest, "verification.httpVerifier.receiptDigest");

  const playwright = record(verification.publicPlaywright, "verification.publicPlaywright");
  assertExactKeys(
    playwright,
    ["result", "passed", "failed"],
    "verification.publicPlaywright",
  );
  assert(playwright.result === "passed", "verification.publicPlaywright.result must be passed.");
  assert(Number.isInteger(playwright.passed) && Number(playwright.passed) > 0, "verification.publicPlaywright.passed must be positive.");
  exactZero(playwright.failed, "verification.publicPlaywright.failed");

  const native = record(verification.nativeChrome, "verification.nativeChrome");
  assertExactKeys(
    native,
    [
      "product",
      "version",
      "headed",
      "diagnosticOnly",
      "receiptSchemaVersion",
      "contract",
      "flags",
      "toolNames",
      "executionResult",
      "reloadRegistrationVerified",
      "entryIntegrity",
      "effectiveCsp",
      "applicationErrorCounts",
      "knownBrowserDiagnosticCount",
      "knownBrowserDiagnosticPhases",
      "knownBrowserDiagnosticLocation",
      "evidencePath",
      "evidenceDigest",
    ],
    "verification.nativeChrome",
  );
  assert(native.product === "Google Chrome", "verification.nativeChrome.product must be Google Chrome.");
  assert(
    CHROME_VERSION.test(string(native.version, "verification.nativeChrome.version")),
    "verification.nativeChrome.version must be an exact numeric Chrome version.",
  );
  assert(native.headed === true, "verification.nativeChrome.headed must be true.");
  assert(
    native.diagnosticOnly === false,
    "verification.nativeChrome.diagnosticOnly must be false.",
  );
  assert(
    native.receiptSchemaVersion === 2,
    "verification.nativeChrome.receiptSchemaVersion must be 2.",
  );
  assert(
    native.contract === PHASE_BOUND_NATIVE_CONTRACT,
    "verification.nativeChrome.contract must identify the phase-bound entry-integrity contract.",
  );
  assert(Array.isArray(native.flags), "verification.nativeChrome.flags must be an array.");
  assert(
    JSON.stringify(native.flags) === JSON.stringify(CHROME_FEATURE_FLAGS),
    "verification.nativeChrome.flags must contain the exact required flags with no extras.",
  );
  assert(Array.isArray(native.toolNames), "verification.nativeChrome.toolNames must be an array.");
  const names = native.toolNames as unknown[];
  assert(names.every((name) => typeof name === "string"), "verification.nativeChrome.toolNames must contain strings.");
  assert(new Set(names).size === 9, "verification.nativeChrome.toolNames must contain nine unique names.");
  assert(
    JSON.stringify([...names].sort()) === JSON.stringify([...TOOL_NAMES].sort()),
    "verification.nativeChrome.toolNames do not match ProofRoom's exact nine tools.",
  );
  assert(native.executionResult === "passed", "verification.nativeChrome.executionResult must be passed.");
  assert(
    native.reloadRegistrationVerified === true,
    "verification.nativeChrome.reloadRegistrationVerified must be true.",
  );
  const entryIntegrity = record(
    native.entryIntegrity,
    "verification.nativeChrome.entryIntegrity",
  );
  assertExactKeys(
    entryIntegrity,
    ["path", "sha256", "byteCount"],
    "verification.nativeChrome.entryIntegrity",
  );
  const entryPath = string(
    entryIntegrity.path,
    "verification.nativeChrome.entryIntegrity.path",
  );
  assert(
    FINGERPRINTED_MODULE_ENTRY.test(entryPath),
    "verification.nativeChrome.entryIntegrity.path must be a fingerprinted module entry path.",
  );
  digest(
    entryIntegrity.sha256,
    "verification.nativeChrome.entryIntegrity.sha256",
  );
  assert(
    Number.isInteger(entryIntegrity.byteCount) && Number(entryIntegrity.byteCount) > 0,
    "verification.nativeChrome.entryIntegrity.byteCount must be a positive integer.",
  );
  assert(
    native.effectiveCsp === REQUIRED_RESPONSE_HEADERS["content-security-policy"],
    "verification.nativeChrome.effectiveCsp must match the exact Worker CSP.",
  );
  applicationErrorCounts(
    native.applicationErrorCounts,
    "verification.nativeChrome.applicationErrorCounts",
  );
  const nativeKnownDiagnosticCount = knownDiagnosticCount(
    native.knownBrowserDiagnosticCount,
    "verification.nativeChrome.knownBrowserDiagnosticCount",
  );
  assert(
    Array.isArray(native.knownBrowserDiagnosticPhases),
    "verification.nativeChrome.knownBrowserDiagnosticPhases must be an array.",
  );
  const diagnosticPhases = native.knownBrowserDiagnosticPhases as unknown[];
  if (nativeKnownDiagnosticCount === 0) {
    assert(
      diagnosticPhases.length === 0,
      "Zero known browser diagnostics require an empty phase list.",
    );
    assert(
      native.knownBrowserDiagnosticLocation === null,
      "Zero known browser diagnostics require a null diagnostic location.",
    );
  } else {
    assert(
      JSON.stringify(diagnosticPhases) ===
        JSON.stringify(["initial_registration", "reload_registration"]),
      "Two known browser diagnostics require exact initial and reload registration phases.",
    );
    const diagnosticLocation = record(
      native.knownBrowserDiagnosticLocation,
      "verification.nativeChrome.knownBrowserDiagnosticLocation",
    );
    assertExactKeys(
      diagnosticLocation,
      ["path", "line", "column"],
      "verification.nativeChrome.knownBrowserDiagnosticLocation",
    );
    assert(
      diagnosticLocation.path === entryPath,
      "Known browser diagnostic location path must equal the loaded module entry path.",
    );
    assert(
      Number.isInteger(diagnosticLocation.line) && Number(diagnosticLocation.line) > 0,
      "Known browser diagnostic location line must be a positive integer.",
    );
    assert(
      Number.isInteger(diagnosticLocation.column) && Number(diagnosticLocation.column) >= 0,
      "Known browser diagnostic location column must be a nonnegative integer.",
    );
  }
  repositoryRelativePath(native.evidencePath, "verification.nativeChrome.evidencePath");
  digest(native.evidenceDigest, "verification.nativeChrome.evidenceDigest");

  assert(verification.uiOnlyJourney === "passed", "verification.uiOnlyJourney must be passed.");
  applicationErrorCounts(
    verification.applicationErrorCounts,
    "verification.applicationErrorCounts",
  );
  const overallKnownDiagnosticCount = knownDiagnosticCount(
    verification.knownBrowserDiagnosticCount,
    "verification.knownBrowserDiagnosticCount",
  );
  assert(
    overallKnownDiagnosticCount === nativeKnownDiagnosticCount,
    "verification.knownBrowserDiagnosticCount must equal the native receipt count.",
  );
  digest(verification.visualArtifactDigestBefore, "verification.visualArtifactDigestBefore");
  digest(verification.visualArtifactDigestAfter, "verification.visualArtifactDigestAfter");
  assert(
    verification.visualArtifactDigestBefore === verification.visualArtifactDigestAfter,
    "Verified release visual artifact digests must match.",
  );
  assert(
    LIVE_AGENT_SELECTION_STATUSES.has(
      string(
        verification.liveAgentSelectionStatus,
        "verification.liveAgentSelectionStatus",
      ),
    ),
    "verification.liveAgentSelectionStatus must be not_run, passed, or blocked.",
  );
  return verification;
}

function validateDeploymentConsistency(
  receipt: Record<string, unknown>,
  preparation: Record<string, unknown>,
  deployment: Record<string, unknown>,
): void {
  assert(
    Date.parse(String(receipt.preparedAt)) <= Date.parse(String(deployment.deployedAt)),
    "preparedAt must be earlier than or equal to deployment.deployedAt.",
  );
  assert(
    preparation.sourceCommit === deployment.gitCommit,
    "preparation.sourceCommit must equal deployment.gitCommit.",
  );
  const preparationRepository = githubRepositoryIdentity(
    preparation.githubRemote,
    "preparation.githubRemote",
  );
  const deploymentRepository = githubRepositoryIdentity(
    deployment.githubRemote,
    "deployment.githubRemote",
  );
  assert(
    preparationRepository === deploymentRepository,
    "Normalized preparation.githubRemote must equal deployment.githubRemote.",
  );
  assert(
    deploymentRepository ===
      githubRepositoryIdentity(
        deployment.publicRepositoryUrl,
        "deployment.publicRepositoryUrl",
      ),
    "The GitHub remote repository identity must equal deployment.publicRepositoryUrl.",
  );
  assert(
    preparation.workerName === deployment.workerName,
    "Preparation and deployment worker names must match.",
  );
}

function validateVerificationConsistency(
  preparation: Record<string, unknown>,
  deployment: Record<string, unknown>,
  verification: Record<string, unknown>,
): void {
  assert(
    Date.parse(String(deployment.deployedAt)) <=
      Date.parse(String(verification.verifiedAt)),
    "deployment.deployedAt must be earlier than or equal to verification.verifiedAt.",
  );
  assert(
    preparation.deterministicEvalReportDigest ===
      verification.deterministicEvalReportDigest,
    "Preparation and verification deterministic eval digests must match.",
  );
  assert(
    preparation.visualArtifactDigest ===
      verification.visualArtifactDigestBefore &&
      preparation.visualArtifactDigest === verification.visualArtifactDigestAfter,
    "Preparation and verification visual artifact digests must all match.",
  );
}

export function validateReleaseReceipt(value: unknown): Record<string, unknown> {
  const receipt = record(value, "release receipt");
  for (const key of Object.keys(receipt)) {
    assert(TOP_LEVEL_KEYS.has(key), `Unknown release receipt key: ${key}.`);
  }
  assert(receipt.schemaVersion === 1, "schemaVersion must be 1.");
  assert(/^[a-z0-9][a-z0-9._-]{5,79}$/.test(string(receipt.releaseId, "releaseId")), "releaseId is invalid.");
  assert(STATES.has(String(receipt.state)), "state must be prepared, deployed, verified, or failed.");
  utcDateTime(receipt.preparedAt, "preparedAt");
  const preparation = validatePreparation(receipt.preparation);
  assert(Array.isArray(receipt.knownLimitations), "knownLimitations must be an array.");
  assert((receipt.knownLimitations as unknown[]).every((entry) => typeof entry === "string"), "knownLimitations must contain strings.");

  if (receipt.state === "prepared") {
    for (const forbidden of ["publicUrl", "deployment", "verification", "failure"]) {
      assert(!(forbidden in receipt), `A prepared receipt cannot contain ${forbidden}.`);
    }
  } else if (receipt.state === "deployed") {
    httpsOrigin(receipt.publicUrl, "publicUrl");
    const deployment = validateDeployment(receipt.deployment);
    validateDeploymentConsistency(receipt, preparation, deployment);
    assert(!("verification" in receipt), "A deployed receipt cannot claim verification.");
    assert(!("failure" in receipt), "A deployed receipt cannot contain failure.");
  } else if (receipt.state === "verified") {
    assert(preparation.cleanTree === true, "A verified receipt requires clean-tree preparation proof.");
    httpsOrigin(receipt.publicUrl, "publicUrl");
    const deployment = validateDeployment(receipt.deployment);
    const verification = validateVerification(receipt.verification);
    validateDeploymentConsistency(receipt, preparation, deployment);
    validateVerificationConsistency(
      preparation,
      deployment,
      verification,
    );
    assert(!("failure" in receipt), "A verified receipt cannot contain failure.");
  } else {
    const failure = record(receipt.failure, "failure");
    assertExactKeys(failure, ["stage", "message"], "failure");
    string(failure.stage, "failure.stage");
    string(failure.message, "failure.message");
  }

  return receipt;
}

function schemaValidator(): ValidateFunction {
  if (compiledSchemaValidator) return compiledSchemaValidator;
  const schema = JSON.parse(readFileSync(RELEASE_SCHEMA_PATH, "utf8")) as object;
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    strictRequired: false,
  });
  addFormats(ajv);
  compiledSchemaValidator = ajv.compile(schema);
  return compiledSchemaValidator;
}

export function validateReleaseReceiptSchema(
  value: unknown,
): Record<string, unknown> {
  const validate = schemaValidator();
  if (!validate(value)) {
    const details = (validate.errors ?? [])
      .slice(0, 8)
      .map((error) => {
        const path = error.instancePath || "/";
        return `${path} ${error.message ?? error.keyword}`.slice(0, 240);
      })
      .join(" | ");
    throw new Error(
      `Release receipt JSON Schema validation failed: ${details || "unknown schema error"}`,
    );
  }
  return value as Record<string, unknown>;
}

export function validateReleaseReceiptDocument(
  value: unknown,
): Record<string, unknown> {
  const receipt = validateReleaseReceipt(value);
  validateReleaseReceiptSchema(value);
  return receipt;
}

function readRepositoryFile(
  repositoryRoot: string,
  pathValue: unknown,
  label: string,
): Buffer {
  const safePath = repositoryRelativePath(pathValue, label);
  let root: string;
  try {
    root = realpathSync(repositoryRoot);
  } catch {
    throw new Error(`${label} repository root is missing or unreadable.`);
  }
  const candidate = resolve(root, safePath);
  const lexicalRelative = relative(root, candidate);
  assert(
    lexicalRelative !== "" &&
      lexicalRelative !== ".." &&
      !lexicalRelative.startsWith(`..${sep}`) &&
      !isAbsolute(lexicalRelative),
    `${label} must resolve inside the repository root.`,
  );
  let realPath: string;
  try {
    realPath = realpathSync(candidate);
  } catch {
    throw new Error(`${label} is missing or unreadable: ${safePath}.`);
  }
  const physicalRelative = relative(root, realPath);
  assert(
    physicalRelative !== "" &&
      physicalRelative !== ".." &&
      !physicalRelative.startsWith(`..${sep}`) &&
      !isAbsolute(physicalRelative),
    `${label} must not resolve outside the repository root.`,
  );
  try {
    assert(statSync(realPath).isFile(), `${label} must reference a regular file.`);
    return readFileSync(realPath);
  } catch (error) {
    if (error instanceof Error && error.message.includes("regular file")) throw error;
    throw new Error(`${label} is unreadable: ${safePath}.`);
  }
}

function parseEvidence(bytes: Buffer, label: string): unknown {
  try {
    return JSON.parse(bytes.toString("utf8")) as unknown;
  } catch {
    throw new Error(`${label} must contain valid JSON.`);
  }
}

function assertEvidenceDigest(
  bytes: Buffer,
  expected: unknown,
  label: string,
): void {
  const declared = digest(expected, `${label} declared digest`);
  const actual = createHash("sha256").update(bytes).digest("hex");
  assert(actual === declared, `${label} SHA-256 digest does not match the referenced bytes.`);
}

function assertPublicEvidenceMatches(
  finalVerification: Record<string, unknown>,
  publicReceipt: PublicVerificationReceipt,
  publicOrigin: string,
): void {
  assert(
    publicReceipt.origin === publicOrigin,
    "Public HTTP evidence origin must equal the release publicUrl origin.",
  );
  const finalHeaders = record(
    finalVerification.responseHeaders,
    "verification.responseHeaders",
  );
  assert(
    sameRecord(finalHeaders, publicReceipt.securityHeaders),
    "Public HTTP evidence security headers must equal verification.responseHeaders.",
  );
}

function nativeDiagnosticSummary(
  receipt: NativeReceipt,
): {
  phases: string[];
  location: { path: string; line: number; column: number } | null;
} {
  if (receipt.knownBrowserDiagnosticCount === 0) {
    return { phases: [], location: null };
  }
  const first = receipt.knownBrowserDiagnostics[0];
  assert(first, "Native evidence is missing its first known browser diagnostic.");
  return {
    phases: receipt.knownBrowserDiagnostics.map((diagnostic) => diagnostic.phase),
    location: {
      path: new URL(first.location.url).pathname,
      line: first.location.line,
      column: first.location.column,
    },
  };
}

function assertNativeEvidenceMatches(
  finalNative: Record<string, unknown>,
  nativeReceipt: NativeReceipt,
  publicOrigin: string,
): void {
  assert(
    nativeReceipt.origin === publicOrigin,
    "Native Chrome evidence origin must equal the release publicUrl origin.",
  );
  assert(
    finalNative.product === nativeReceipt.browser.product &&
      finalNative.version === nativeReceipt.browser.version &&
      finalNative.headed === nativeReceipt.browser.headed &&
      finalNative.diagnosticOnly === nativeReceipt.diagnosticOnly,
    "Native Chrome browser summary must match the referenced native receipt.",
  );
  assert(
    finalNative.receiptSchemaVersion === nativeReceipt.schemaVersion,
    "Native Chrome receipt schema version must match the referenced native receipt.",
  );
  assert(
    JSON.stringify(finalNative.flags) === JSON.stringify(nativeReceipt.flags),
    "Native Chrome flags must match the referenced native receipt.",
  );
  assert(
    JSON.stringify(finalNative.toolNames) === JSON.stringify(nativeReceipt.toolNames),
    "Native Chrome tool names must match the referenced native receipt.",
  );
  assert(
    finalNative.reloadRegistrationVerified ===
      nativeReceipt.reloadRegistrationVerified,
    "Native Chrome reload registration summary must match the referenced native receipt.",
  );
  const finalEntry = record(
    finalNative.entryIntegrity,
    "verification.nativeChrome.entryIntegrity",
  );
  assert(
    finalEntry.path === nativeReceipt.entryIntegrity.path &&
      finalEntry.sha256 === nativeReceipt.entryIntegrity.sha256 &&
      finalEntry.byteCount === nativeReceipt.entryIntegrity.byteCount,
    "Native Chrome entry-integrity summary must match the referenced native receipt.",
  );
  assert(
    finalNative.effectiveCsp === nativeReceipt.effectiveCsp,
    "Native Chrome effective CSP must match the referenced native receipt.",
  );
  assert(
    sameRecord(
      record(
        finalNative.applicationErrorCounts,
        "verification.nativeChrome.applicationErrorCounts",
      ),
      nativeReceipt.applicationErrorCounts,
    ),
    "Native Chrome application error counts must match the referenced native receipt.",
  );
  assert(
    finalNative.knownBrowserDiagnosticCount ===
      nativeReceipt.knownBrowserDiagnosticCount,
    "Native Chrome known diagnostic count must match the referenced native receipt.",
  );
  const diagnosticSummary = nativeDiagnosticSummary(nativeReceipt);
  assert(
    JSON.stringify(finalNative.knownBrowserDiagnosticPhases) ===
      JSON.stringify(diagnosticSummary.phases),
    "Native Chrome known diagnostic phases must match the referenced native receipt.",
  );
  assert(
    JSON.stringify(finalNative.knownBrowserDiagnosticLocation) ===
      JSON.stringify(diagnosticSummary.location),
    "Native Chrome known diagnostic location must match the referenced native receipt.",
  );
}

export function validateReleaseReceiptEvidence(
  receipt: Record<string, unknown>,
  repositoryRoot: string,
): void {
  if (receipt.state !== "verified") return;
  const publicOrigin = httpsOrigin(receipt.publicUrl, "publicUrl");
  const verification = record(receipt.verification, "verification");
  const http = record(verification.httpVerifier, "verification.httpVerifier");
  const native = record(verification.nativeChrome, "verification.nativeChrome");

  const publicBytes = readRepositoryFile(
    repositoryRoot,
    http.receiptPath,
    "verification.httpVerifier.receiptPath",
  );
  assertEvidenceDigest(
    publicBytes,
    http.receiptDigest,
    "Public HTTP evidence",
  );
  const publicReceipt = validatePublicVerificationReceipt(
    parseEvidence(publicBytes, "Public HTTP evidence"),
  );
  assertPublicEvidenceMatches(verification, publicReceipt, publicOrigin);

  const nativeBytes = readRepositoryFile(
    repositoryRoot,
    native.evidencePath,
    "verification.nativeChrome.evidencePath",
  );
  assertEvidenceDigest(
    nativeBytes,
    native.evidenceDigest,
    "Native Chrome evidence",
  );
  const nativeReceipt = validateNativeReceipt(
    parseEvidence(nativeBytes, "Native Chrome evidence"),
  );
  assertNativeEvidenceMatches(native, nativeReceipt, publicOrigin);
}

export function validateReleaseReceiptFile(
  supplied: string,
  repositoryRoot = process.cwd(),
): Record<string, unknown> {
  const bytes = readRepositoryFile(repositoryRoot, supplied, "Release receipt path");
  const parsed = parseEvidence(bytes, "Release receipt");
  const receipt = validateReleaseReceiptDocument(parsed);
  validateReleaseReceiptEvidence(receipt, repositoryRoot);
  return receipt;
}

function main(): void {
  const supplied = process.argv[2] ?? process.env.PROOFROOM_RELEASE_RECEIPT ?? "artifacts/release/prepared-receipt.json";
  const receipt = validateReleaseReceiptFile(supplied);
  console.log(`Release receipt valid: ${receipt.state} (${receipt.releaseId})`);
}

if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Release receipt validation failed.");
    process.exitCode = 1;
  }
}
