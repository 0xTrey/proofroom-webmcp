import { TRUTH_LABELS } from "../../../../evals/responses-api/types.ts";
import { RESPONSES_CASE_IDS } from "../../../../evals/responses-api/cases.ts";
import type { ValidatedResponsesRecord } from "../../../../evals/responses-api/validate.ts";
import { liveAgentRecordSchema } from "../../../../evals/live-agent/validate.ts";
import { LIVE_AGENT_PROMPT_DIGESTS } from "../../../../evals/live-agent/validate.ts";
import { EVAL_CASE_IDS } from "../../../../evals/contract.ts";
import {
  computeProductInvariantDigest,
  EXPECTED_DETERMINISTIC_ASSERTIONS,
  EXPECTED_MANIFEST_DIGEST,
  EXPECTED_SEQUENCE_DIGEST,
  buildProductInvariantSnapshot,
} from "../../../../scripts/rc-gate/productInvariants.ts";
import { sha256Hex } from "../../../../scripts/rc-gate/digest.ts";
import { validateDeterministicReportData } from "../../../../scripts/rc-gate/deterministicValidator.ts";
import type { RcGateSources } from "../../../../scripts/rc-gate/classify.ts";
import type { RcGateSourceValidation } from "../../../../scripts/rc-gate/sourceValidation.ts";
import { TOOL_NAMES } from "../../../../src/webmcp/toolDefinitions.ts";

export const HEAD = "c".repeat(40);
export const OTHER_HEAD = "d".repeat(40);
export const DIGEST = "a".repeat(64);
export const OTHER_DIGEST = "b".repeat(64);

function minimalDeterministicCase(id: string): Record<string, unknown> {
  return {
    id,
    family: "explicit",
    outcome: "pass",
    setup: { id: "canonical_reset", revision: 0, ledgerEventCount: 1 },
    expectedSequence: ["get_room_state"],
    observedSequence: ["get_room_state"],
    sequenceMatches: true,
    transitionContractMatches: true,
    executionCompleted: true,
    calls: [],
    assertions: [],
    cleanup: { registeredBeforeCleanup: [], registeredAfterCleanup: [], complete: true },
    terminal: { revision: 0, ledgerEventCount: 1 },
  };
}

export function releaseReceiptBytes(head = HEAD): Buffer {
  return Buffer.from(JSON.stringify(releaseReceipt(head)), "utf8");
}

export function deterministicReport(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    suiteId: "proofroom_deterministic_webmcp_eval",
    fixture: {
      roomId: "northstar_meridian_room",
      fixedClock: "2026-08-26T12:00:00.000Z",
    },
    contract: {
      manifestDigest: EXPECTED_MANIFEST_DIGEST,
      expectedSequenceDigest: EXPECTED_SEQUENCE_DIGEST,
    },
    tools: { count: 9, names: [...TOOL_NAMES] },
    totals: {
      total: 12,
      passed: 12,
      failed: 0,
      explicit: 4,
      ambiguous: 4,
      safety: 4,
      toolCalls: 41,
      assertions: EXPECTED_DETERMINISTIC_ASSERTIONS,
    },
    liveAgentSelection: {
      status: "not_run",
      includedInPassCount: false,
      explanation:
        "Live browser-agent selection was not run and is excluded from deterministic pass counts.",
    },
    cases: EVAL_CASE_IDS.map((id) => minimalDeterministicCase(id)),
    safety: {
      includesFullRoomState: false,
      includesRawBuyerContext: false,
      includesRawBriefText: false,
      includesRawUntrustedContent: false,
      includesStackTraces: false,
    },
    overallPass: true,
    ...overrides,
  };
}

export function responsesPassed(contractDigest: string): Record<string, unknown> {
  return {
    schemaVersion: 1,
    status: "passed",
    model: "gpt-5.6",
    startedAt: "2026-08-31T16:15:03.175Z",
    completedAt: "2026-08-31T16:15:52.038Z",
    caseIds: [...RESPONSES_CASE_IDS],
    aggregateScore: 100,
    casePassCount: 7,
    caseFailCount: 0,
    cases: [],
    knownDeviations: [],
    contractDigest,
    truthLabels: { ...TRUTH_LABELS },
  };
}

export function validatedResponsesPassed(contractDigest: string): ValidatedResponsesRecord {
  return {
    schemaVersion: 1,
    status: "passed",
    model: "gpt-5.6",
    startedAt: "2026-08-31T16:15:03.175Z",
    completedAt: "2026-08-31T16:15:52.038Z",
    caseIds: [...RESPONSES_CASE_IDS],
    aggregateScore: 100,
    casePassCount: 7,
    caseFailCount: 0,
    cases: [],
    knownDeviations: [],
    contractDigest,
    truthLabels: { ...TRUTH_LABELS },
  } as ValidatedResponsesRecord;
}

export function liveAgentVerified(head = HEAD): Record<string, unknown> {
  return {
    schemaVersion: 2,
    status: "verified",
    reason: "Verified against the public deployment with all twelve manifest prompts.",
    environment: {
      browserAgentName: "Example Agent",
      browserVersion: "1.2.3",
      testedUrl: "https://proofroom.example/",
      appBuildIdentifier: head,
    },
    toolDiscoveryEvidencePath: "evals/live-agent/tool-discovery.json",
    verifiedAt: "2026-08-31T16:00:00.000Z",
    verifierLabel: "fixture",
    knownDeviations: [],
    cases: EVAL_CASE_IDS.map((promptId: (typeof EVAL_CASE_IDS)[number]) => ({
      promptId,
      promptTextSha256: LIVE_AGENT_PROMPT_DIGESTS[promptId],
      outcome: "pass",
      observedToolSequence: ["get_room_state"],
      resultEvidencePath: `evals/live-agent/cases/${promptId}.json`,
    })),
  };
}

export function releaseReceipt(head = HEAD): Record<string, unknown> {
  return {
    schemaVersion: 1,
    releaseId: "proofroom-fixture",
    state: "verified",
    preparedAt: "2026-08-27T03:13:00.000Z",
    publicUrl: "https://proofroom.example/",
    preparation: {
      workerName: "proofroom-webmcp",
      compatibilityDate: "2026-08-26",
      sourceCommit: head,
      cleanTree: true,
      githubRemote: "https://github.com/0xTrey/proofroom-webmcp.git",
      deterministicEvalReportDigest: DIGEST,
      visualArtifactDigest: DIGEST,
    },
    deployment: {
      gitCommit: head,
      cleanTreeProof: "fixture",
      githubRemote: "https://github.com/0xTrey/proofroom-webmcp.git",
      publicRepositoryUrl: "https://github.com/0xTrey/proofroom-webmcp",
      cloudflareAccountLabel: "fixture",
      workerName: "proofroom-webmcp",
      deploymentId: "fixture-deployment",
      deployedAt: "2026-08-27T04:22:14.782Z",
      wranglerVersion: "4.126.0",
      build: {
        staticAssetCount: 71,
        staticAssetBytes: 3047832,
        clientJavaScriptGzipBytes: 125030,
        clientCssGzipBytes: 23219,
        workerBytes: 2371,
      },
    },
    verification: {
      verifiedAt: "2026-08-27T04:22:52.000Z",
      deterministicEvalReportDigest: DIGEST,
      responseHeaders: {
        "origin-agent-cluster": "?1",
        "referrer-policy": "strict-origin-when-cross-origin",
        "x-content-type-options": "nosniff",
        "cross-origin-opener-policy": "same-origin",
        "content-security-policy":
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
        "strict-transport-security": "max-age=31536000; includeSubDomains",
      },
      httpVerifier: {
        result: "passed",
        receiptPath: "artifacts/release/http-verification.json",
        receiptDigest: DIGEST,
      },
      publicPlaywright: { result: "passed", passed: 2, failed: 0 },
      nativeChrome: {
        product: "Google Chrome",
        version: "151.0.7922.174",
        headed: true,
        diagnosticOnly: false,
        receiptSchemaVersion: 2,
        contract: "phase-bound-entry-integrity-v1",
        flags: [
          "--enable-experimental-web-platform-features",
          "--enable-features=WebMCP,WebMCPTesting,DevToolsWebMCPSupport",
        ],
        toolNames: [...TOOL_NAMES].sort((left, right) => left.localeCompare(right)),
        executionResult: "passed",
        reloadRegistrationVerified: true,
        entryIntegrity: {
          path: "/assets/index-fixture.js",
          sha256: DIGEST,
          byteCount: 1000,
        },
        effectiveCsp:
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
        applicationErrorCounts: {
          console: 0,
          page: 0,
          request: 0,
          response: 0,
        },
        knownBrowserDiagnosticCount: 0,
        knownBrowserDiagnosticPhases: [],
        knownBrowserDiagnosticLocation: null,
        evidencePath: "artifacts/release/native-webmcp.json",
        evidenceDigest: DIGEST,
      },
      uiOnlyJourney: "passed",
      applicationErrorCounts: { console: 0, page: 0, request: 0, response: 0 },
      knownBrowserDiagnosticCount: 0,
      visualArtifactDigestBefore: DIGEST,
      visualArtifactDigestAfter: DIGEST,
      liveAgentSelectionStatus: "not_run",
    },
    knownLimitations: [],
  };
}

export function nativeReceipt(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 2,
    origin: "https://proofroom.example/",
    toolNames: [...TOOL_NAMES].sort((left, right) => left.localeCompare(right)),
    reloadToolNames: [...TOOL_NAMES].sort((left, right) => left.localeCompare(right)),
    effectiveCsp:
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    entryIntegrity: {
      passed: true,
      sha256: DIGEST,
      path: "/assets/index-fixture.js",
      byteCount: 1000,
    },
    ...overrides,
  };
}

export function httpReceipt(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    origin: "https://proofroom.example/",
    securityHeaders: {
      "origin-agent-cluster": "?1",
      "referrer-policy": "strict-origin-when-cross-origin",
      "x-content-type-options": "nosniff",
      "cross-origin-opener-policy": "same-origin",
      "content-security-policy":
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      "strict-transport-security": "max-age=31536000; includeSubDomains",
    },
    ...overrides,
  };
}

export function localQaReceipt(head = HEAD, evalDigests = {
  deterministicReport: DIGEST,
  responsesCurrent: DIGEST,
  liveAgentCurrent: DIGEST,
}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    generatedAt: "2026-08-31T16:00:00.000Z",
    status: "passed",
    candidateCommit: head,
    workspace: {
      filteredClean: true,
      statusBefore: { algorithm: "sha256", digest: DIGEST, entryCount: 0 },
      statusAfter: { algorithm: "sha256", digest: DIGEST, entryCount: 0 },
      statusParity: true,
    },
    steps: [{ id: "lint", command: "npm", args: ["run", "lint"], exitCode: 0, status: "passed" }],
    visualArtifacts: {
      before: { algorithm: "sha256", digest: DIGEST, fileCount: 1, totalBytes: 1 },
      after: { algorithm: "sha256", digest: DIGEST, fileCount: 1, totalBytes: 1 },
      byteIdentical: true,
    },
    evalArtifacts: {
      deterministicReportDigest: evalDigests.deterministicReport,
      responsesCurrentDigest: evalDigests.responsesCurrent,
      liveAgentCurrentDigest: evalDigests.liveAgentCurrent,
    },
  };
}

export function readySourceValidation(
  contractDigest: string,
  head = HEAD,
  overrides: Partial<RcGateSourceValidation> = {},
): RcGateSourceValidation {
  const releaseRaw = releaseReceipt(head);
  const deterministicRaw = deterministicReport();
  return {
    releaseDocument: { valid: true, reasonCode: null, message: null },
    releaseEvidence: { valid: true, reasonCode: null, message: null },
    deterministic: { valid: true, reasonCode: null, message: null },
    responses: { valid: true, reasonCode: null, message: null },
    liveAgent: { valid: true, reasonCode: null, message: null },
    validatedRelease: releaseRaw,
    validatedReleaseEvidence: {
      httpReceipt: httpReceipt(),
      nativeReceipt: nativeReceipt(),
      httpReceiptDigest: DIGEST,
      nativeReceiptDigest: DIGEST,
    },
    validatedDeterministic: validateDeterministicReportData(deterministicRaw),
    validatedResponses: validatedResponsesPassed(contractDigest),
    validatedLiveAgent: liveAgentRecordSchema.parse(liveAgentVerified(head)),
    ...overrides,
  };
}

export function readySources(overrides: Partial<RcGateSources> = {}): RcGateSources {
  const contractDigest =
    typeof overrides.contractDigest === "string" ? overrides.contractDigest : "e".repeat(64);
  const head = overrides.head ?? HEAD;
  const productInvariants = overrides.productInvariants ?? buildProductInvariantSnapshot();
  const releaseReceiptBytesValue = overrides.releaseReceiptBytes ?? releaseReceiptBytes(head);
  const releaseReceiptDigestValue =
    overrides.releaseReceiptDigest ?? sha256Hex(releaseReceiptBytesValue);
  return {
    generatedAt: "2026-08-31T16:00:00.000Z",
    head,
    workspace: { algorithm: "sha256", digest: DIGEST, entryCount: 0 },
    workspaceClean: true,
    localQaRaw: localQaReceipt(head),
    localQaDigest: DIGEST,
    deterministicRaw: deterministicReport(),
    deterministicDigest: DIGEST,
    responsesRaw: responsesPassed(contractDigest),
    responsesDigest: DIGEST,
    liveAgentRaw: liveAgentVerified(head),
    liveAgentDigest: DIGEST,
    releaseReceiptRaw: releaseReceipt(head),
    releaseReceiptBytes: releaseReceiptBytesValue,
    releaseReceiptDigest: releaseReceiptDigestValue,
    httpReceiptRaw: httpReceipt(),
    httpReceiptDigest: DIGEST,
    nativeReceiptRaw: nativeReceipt(),
    nativeReceiptDigest: DIGEST,
    contractDigest,
    productInvariants,
    productInvariantDigest: computeProductInvariantDigest(productInvariants),
    ...overrides,
  };
}
