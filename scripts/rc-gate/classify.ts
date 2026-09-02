import { TRUTH_LABELS } from "../../evals/responses-api/types.ts";
import { RESPONSES_CASE_IDS } from "../../evals/responses-api/cases.ts";
import { EVAL_CASE_IDS } from "../../evals/contract.ts";
import {
  DETERMINISTIC_REPORT_PATH,
  LIVE_AGENT_CURRENT_PATH,
  LOCAL_QA_RECEIPT_PATH,
  RELEASE_RECEIPT_PATH,
  RESPONSES_CURRENT_PATH,
} from "./paths.ts";
import {
  arraysEqual,
  CANONICAL_HUMAN_ONLY_ACTION_NAMES,
  CANONICAL_NATIVE_TOOL_NAMES,
  CANONICAL_PRODUCT_TOOL_NAMES,
  computeProductInvariantDigest,
  JUDGE_VISIBLE_APPROVAL_GATES,
  type ProductInvariantSnapshot,
} from "./productInvariants.ts";
import { HUMAN_ONLY_ACTION_NAMES } from "../../src/domain/actions/index.ts";
import { TOOL_NAMES } from "../../src/webmcp/toolDefinitions.ts";
import { validateLocalQaReceipt, type LocalQaReceipt } from "./localQaReceipt.ts";
import {
  blockingReason,
  dedupeBlockingReasons,
  type BlockingReason,
} from "./reasons.ts";
import {
  buildSourceValidationFromInputs,
  type RcGateSourceValidation,
} from "./sourceValidation.ts";
import type { StatusDigest } from "./workspace.ts";

export type LaneStatus =
  | "ready"
  | "blocked"
  | "stale"
  | "passed"
  | "failed"
  | "not_run"
  | "invalid"
  | "verified";

export type RcGateSources = {
  generatedAt: string;
  head: string;
  workspace: StatusDigest;
  workspaceClean: boolean;
  localQaRaw: unknown | null;
  localQaDigest: string | null;
  deterministicRaw: unknown | null;
  deterministicDigest: string;
  responsesRaw: unknown | null;
  responsesDigest: string;
  liveAgentRaw: unknown | null;
  liveAgentDigest: string;
  releaseReceiptRaw: unknown | null;
  releaseReceiptBytes: Buffer | null;
  releaseReceiptDigest: string;
  httpReceiptRaw: unknown | null;
  httpReceiptDigest: string | null;
  nativeReceiptRaw: unknown | null;
  nativeReceiptDigest: string | null;
  contractDigest: string;
  productInvariants: ProductInvariantSnapshot;
  productInvariantDigest: string;
  sourceValidation?: RcGateSourceValidation;
};

export type RcGateReceipt = {
  schemaVersion: 1;
  generatedAt: string;
  status: "ready" | "blocked";
  recordingEvidenceReady: boolean;
  submissionTechnicalEvidenceReady: boolean;
  candidate: {
    head: string;
    filteredClean: boolean;
    filteredStatusDigest: string;
    filteredStatusEntryCount: number;
  };
  lanes: {
    localCandidate: LaneReceipt;
    publicDeployment: LaneReceipt;
    nativeWebMcp: LaneReceipt;
    responsesApi: LaneReceipt;
    compatibleBrowserAgent: LaneReceipt;
    deterministic: LaneReceipt;
    productInvariants: LaneReceipt;
  };
  localQa: {
    sourcePath: string;
    digest: string | null;
    status: "passed" | "failed" | "missing" | "invalid";
    candidateCommit: string | null;
    workspaceStatusDigest: string | null;
    workspaceParity: boolean | null;
    stepSummary: Array<{ id: string; status: "passed" | "failed" }>;
    evalArtifactDigests: {
      deterministicReport: string | null;
      responsesCurrent: string | null;
      liveAgentCurrent: string | null;
    };
  };
  deterministic: DeterministicLane;
  responsesApi: ResponsesLane;
  publicDeployment: PublicDeploymentLane;
  nativeWebMcp: NativeLane;
  compatibleBrowserAgent: CompatibleBrowserAgentLane;
  productInvariants: ProductInvariantLane;
  blockingReasons: BlockingReason[];
};

type LaneReceipt = {
  status: LaneStatus;
  sourcePath: string;
  digest: string | null;
  identifiers: Record<string, string | number | boolean | null>;
};

type DeterministicLane = {
  sourcePath: string;
  digest: string;
  manifestDigest: string | null;
  expectedSequenceDigest: string | null;
  passedCases: number | null;
  failedCases: number | null;
  assertions: number | null;
  toolNames: string[] | null;
  status: "passed" | "failed" | "invalid";
};

type ResponsesLane = {
  sourcePath: string;
  digest: string;
  status: "passed" | "failed" | "not_run" | "invalid";
  model: string | null;
  startedAt: string | null;
  completedAt: string | null;
  caseIds: string[] | null;
  aggregateScore: number | null;
  casePassCount: number | null;
  caseFailCount: number | null;
  contractDigest: string | null;
  truthLabels: Record<string, string | boolean> | null;
};

type PublicDeploymentLane = {
  sourcePath: string;
  digest: string;
  releaseId: string | null;
  state: string | null;
  sourceCommit: string | null;
  deploymentCommit: string | null;
  deploymentId: string | null;
  publicOrigin: string | null;
  deployedAt: string | null;
  verifiedAt: string | null;
  httpReceiptDigest: string | null;
  nativeReceiptDigest: string | null;
  status: "ready" | "stale" | "blocked" | "invalid";
};

type NativeLane = {
  sourcePath: string;
  digest: string | null;
  status: LaneStatus;
  product: string | null;
  version: string | null;
  headed: boolean | null;
  toolCountBefore: number | null;
  toolCountAfter: number | null;
  executionStatus: string | null;
  publicOrigin: string | null;
  entryPath: string | null;
  entrySha256: string | null;
  entryByteCount: number | null;
  cspParity: boolean | null;
  applicationErrorTotal: number | null;
};

type CompatibleBrowserAgentLane = {
  sourcePath: string;
  digest: string;
  status: "verified" | "failed" | "not_run" | "invalid";
  browserAgentName: string | null;
  browserVersion: string | null;
  testedOrigin: string | null;
  appBuildIdentifier: string | null;
  verifiedAt: string | null;
  casePassCount: number | null;
  caseFailCount: number | null;
  evidencePaths: string[] | null;
};

type ProductInvariantLane = {
  status: "passed" | "failed";
  digest: string;
  toolNames: string[];
  humanOnlyActionNames: string[];
  judgeVisibleApprovalGates: string[];
  canonicalEuResidencyStatus: string;
  humanOnlyAbsentFromTools: boolean;
};

function record(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function httpsOrigin(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function parseLocalQa(raw: unknown | null): LocalQaReceipt | null {
  if (raw === null) return null;
  try {
    return validateLocalQaReceipt(raw);
  } catch {
    return null;
  }
}

function classifyDeterministic(
  validation: RcGateSourceValidation,
  digest: string,
  reasons: BlockingReason[],
): DeterministicLane {
  const lane: DeterministicLane = {
    sourcePath: DETERMINISTIC_REPORT_PATH,
    digest,
    manifestDigest: null,
    expectedSequenceDigest: null,
    passedCases: null,
    failedCases: null,
    assertions: null,
    toolNames: null,
    status: "invalid",
  };
  if (!validation.deterministic.valid) {
    reasons.push(
      blockingReason(
        validation.deterministic.reasonCode ?? "SOURCE_INVALID",
        "deterministic",
        validation.deterministic.message ??
          "Deterministic eval report failed canonical validation.",
      ),
    );
    return lane;
  }
  const report = validation.validatedDeterministic;
  if (!report) {
    reasons.push(
      blockingReason(
        "SOURCE_INVALID",
        "deterministic",
        "Deterministic eval report failed canonical validation.",
      ),
    );
    return lane;
  }
  const contract = record(report.contract);
  const tools = record(report.tools);
  const totals = record(report.totals);
  lane.manifestDigest = typeof contract?.manifestDigest === "string" ? contract.manifestDigest : null;
  lane.expectedSequenceDigest =
    typeof contract?.expectedSequenceDigest === "string"
      ? contract.expectedSequenceDigest
      : null;
  lane.passedCases = typeof totals?.passed === "number" ? totals.passed : null;
  lane.failedCases = typeof totals?.failed === "number" ? totals.failed : null;
  lane.assertions = typeof totals?.assertions === "number" ? totals.assertions : null;
  lane.toolNames = Array.isArray(tools?.names)
    ? (tools.names as unknown[]).filter((name): name is string => typeof name === "string")
    : null;
  lane.status = "passed";
  return lane;
}

function classifyResponses(
  validation: RcGateSourceValidation,
  digest: string,
  contractDigest: string,
  reasons: BlockingReason[],
): ResponsesLane {
  const lane: ResponsesLane = {
    sourcePath: RESPONSES_CURRENT_PATH,
    digest,
    status: "invalid",
    model: null,
    startedAt: null,
    completedAt: null,
    caseIds: null,
    aggregateScore: null,
    casePassCount: null,
    caseFailCount: null,
    contractDigest: null,
    truthLabels: null,
  };
  if (!validation.responses.valid || !validation.validatedResponses) {
    reasons.push(
      blockingReason(
        validation.responses.reasonCode ?? "SOURCE_INVALID",
        "responsesApi",
        validation.responses.message ??
          "Responses API artifact failed canonical validation.",
      ),
    );
    return lane;
  }
  const report = validation.validatedResponses;
  lane.contractDigest = report.contractDigest;
  lane.truthLabels = Object.fromEntries(
    Object.entries(report.truthLabels).map(([key, value]) => [key, value]),
  );
  if (report.status === "not_run") {
    lane.status = "not_run";
    reasons.push(
      blockingReason(
        "RESPONSES_NOT_RUN",
        "responsesApi",
        "Responses API model-selection evidence has not been run.",
      ),
    );
    return lane;
  }

  lane.model = report.model;
  lane.startedAt = report.startedAt;
  lane.completedAt = report.completedAt;
  lane.caseIds = [...report.caseIds];
  lane.aggregateScore = report.aggregateScore;
  lane.casePassCount = report.casePassCount;
  lane.caseFailCount = report.caseFailCount;

  const expectedCaseIds = [...RESPONSES_CASE_IDS];
  const caseIdsMatch =
    lane.caseIds !== null &&
    lane.caseIds.length === expectedCaseIds.length &&
    lane.caseIds.every((id, index) => id === expectedCaseIds[index]);

  const truthMatches =
    report.truthLabels.classification === TRUTH_LABELS.classification &&
    report.truthLabels.provesNativeWebMcpDiscovery === TRUTH_LABELS.provesNativeWebMcpDiscovery &&
    report.truthLabels.provesCompatibleBrowserAgent === TRUTH_LABELS.provesCompatibleBrowserAgent &&
    report.truthLabels.liveBrowserAgentStatus === TRUTH_LABELS.liveBrowserAgentStatus &&
    report.truthLabels.euDataResidency === TRUTH_LABELS.euDataResidency;

  if (!truthMatches) {
    reasons.push(
      blockingReason(
        "RESPONSES_TRUTH_LABEL_FORGED",
        "responsesApi",
        "Responses truth labels must deny native and compatible-browser proof while keeping EU unknown.",
      ),
    );
  }
  if (lane.contractDigest !== contractDigest) {
    reasons.push(
      blockingReason(
        "RESPONSES_STALE_CONTRACT",
        "responsesApi",
        "Responses contract digest does not match the current local contract.",
      ),
    );
  }
  if (!caseIdsMatch) {
    reasons.push(
      blockingReason(
        "RESPONSES_CASE_MISMATCH",
        "responsesApi",
        "Responses evidence must contain the exact seven case IDs.",
      ),
    );
  }

  const passed =
    report.status === "passed" &&
    lane.casePassCount === 7 &&
    lane.caseFailCount === 0 &&
    lane.aggregateScore !== null &&
    lane.aggregateScore >= 90 &&
    caseIdsMatch &&
    truthMatches &&
    lane.contractDigest === contractDigest;

  if (report.status === "failed" || !passed) {
    lane.status = report.status === "failed" ? "failed" : "invalid";
    if (report.status === "failed") {
      reasons.push(
        blockingReason(
          "RESPONSES_FAILED",
          "responsesApi",
          "Responses API model-selection evidence failed.",
        ),
      );
    } else if (lane.aggregateScore !== null && lane.aggregateScore < 90) {
      reasons.push(
        blockingReason(
          "RESPONSES_SCORE_LOW",
          "responsesApi",
          "Responses aggregate score must be at least 90.",
        ),
      );
    } else if (!passed) {
      reasons.push(
        blockingReason(
          "RESPONSES_INVALID",
          "responsesApi",
          "Responses API evidence is incomplete or stale.",
        ),
      );
    }
    return lane;
  }

  lane.status = "passed";
  return lane;
}

function classifyPublicDeployment(
  validation: RcGateSourceValidation,
  digest: string,
  head: string,
  reasons: BlockingReason[],
): PublicDeploymentLane {
  const lane: PublicDeploymentLane = {
    sourcePath: RELEASE_RECEIPT_PATH,
    digest,
    releaseId: null,
    state: null,
    sourceCommit: null,
    deploymentCommit: null,
    deploymentId: null,
    publicOrigin: null,
    deployedAt: null,
    verifiedAt: null,
    httpReceiptDigest: null,
    nativeReceiptDigest: null,
    status: "invalid",
  };

  if (!validation.releaseDocument.valid) {
    reasons.push(
      blockingReason(
        validation.releaseDocument.reasonCode ?? "RELEASE_DOCUMENT_INVALID",
        "publicDeployment",
        validation.releaseDocument.message ??
          "Final release receipt failed canonical document validation.",
      ),
    );
    reasons.push(
      blockingReason(
        validation.releaseEvidence.reasonCode ?? "RELEASE_EVIDENCE_INVALID",
        "nativeWebMcp",
        "Native WebMCP evidence was not validated because the release receipt is invalid.",
      ),
    );
    return lane;
  }

  if (!validation.releaseEvidence.valid) {
    reasons.push(
      blockingReason(
        validation.releaseEvidence.reasonCode ?? "RELEASE_EVIDENCE_INVALID",
        "publicDeployment",
        validation.releaseEvidence.message ??
          "Referenced release evidence failed canonical validation.",
      ),
    );
    reasons.push(
      blockingReason(
        validation.releaseEvidence.reasonCode ?? "RELEASE_EVIDENCE_INVALID",
        "nativeWebMcp",
        validation.releaseEvidence.message ??
          "Referenced release evidence failed canonical validation.",
      ),
    );
    return lane;
  }

  const receipt = validation.validatedRelease;
  const releaseEvidence = validation.validatedReleaseEvidence;
  if (!receipt || !releaseEvidence) {
    reasons.push(
      blockingReason(
        "RELEASE_EVIDENCE_INVALID",
        "publicDeployment",
        "Referenced release evidence is missing after validation.",
      ),
    );
    return lane;
  }

  lane.releaseId = typeof receipt.releaseId === "string" ? receipt.releaseId : null;
  lane.state = typeof receipt.state === "string" ? receipt.state : null;
  lane.publicOrigin = httpsOrigin(receipt.publicUrl);
  const preparation = record(receipt.preparation);
  const deployment = record(receipt.deployment);
  const verification = record(receipt.verification);
  lane.sourceCommit =
    typeof preparation?.sourceCommit === "string" ? preparation.sourceCommit : null;
  lane.deploymentCommit =
    typeof deployment?.gitCommit === "string" ? deployment.gitCommit : null;
  lane.deploymentId =
    typeof deployment?.deploymentId === "string" ? deployment.deploymentId : null;
  lane.deployedAt =
    typeof deployment?.deployedAt === "string" ? deployment.deployedAt : null;
  lane.verifiedAt =
    typeof verification?.verifiedAt === "string" ? verification.verifiedAt : null;
  const httpVerifier = record(verification?.httpVerifier);
  const nativeChrome = record(verification?.nativeChrome);
  lane.httpReceiptDigest =
    typeof httpVerifier?.receiptDigest === "string" ? httpVerifier.receiptDigest : null;
  lane.nativeReceiptDigest =
    typeof nativeChrome?.evidenceDigest === "string" ? nativeChrome.evidenceDigest : null;

  if (lane.httpReceiptDigest !== releaseEvidence.httpReceiptDigest) {
    reasons.push(
      blockingReason(
        "PUBLIC_RELEASE_DIGEST_MISMATCH",
        "publicDeployment",
        "Referenced HTTP evidence digest does not match validated bytes.",
      ),
    );
    lane.status = "blocked";
  }
  if (lane.nativeReceiptDigest !== releaseEvidence.nativeReceiptDigest) {
    reasons.push(
      blockingReason(
        "PUBLIC_RELEASE_DIGEST_MISMATCH",
        "publicDeployment",
        "Referenced native evidence digest does not match validated bytes.",
      ),
    );
    lane.status = "blocked";
  }

  if (lane.state !== "verified") {
    lane.status = "blocked";
    reasons.push(
      blockingReason(
        "PUBLIC_RELEASE_INVALID",
        "publicDeployment",
        "Public release receipt is not verified.",
      ),
    );
    return lane;
  }

  if (lane.sourceCommit !== head || lane.deploymentCommit !== head) {
    lane.status = "stale";
    reasons.push(
      blockingReason(
        "PUBLIC_RELEASE_STALE",
        "publicDeployment",
        "Verified public release commit does not match the current candidate HEAD.",
      ),
    );
  } else {
    lane.status = "ready";
  }

  if (lane.sourceCommit !== lane.deploymentCommit) {
    reasons.push(
      blockingReason(
        "PUBLIC_RELEASE_COMMIT_MISMATCH",
        "publicDeployment",
        "Release preparation and deployment commits must match.",
      ),
    );
    lane.status = "blocked";
  }

  const httpReceipt = record(releaseEvidence.httpReceipt);
  const nativeReceipt = record(releaseEvidence.nativeReceipt);
  const httpOrigin = httpReceipt ? httpsOrigin(httpReceipt.origin ?? httpReceipt.publicUrl) : null;
  const nativeOrigin = nativeReceipt ? httpsOrigin(nativeReceipt.origin) : null;
  if (
    lane.publicOrigin === null ||
    httpOrigin === null ||
    nativeOrigin === null ||
    lane.publicOrigin !== httpOrigin ||
    lane.publicOrigin !== nativeOrigin
  ) {
    reasons.push(
      blockingReason(
        "PUBLIC_RELEASE_ORIGIN_MISMATCH",
        "publicDeployment",
        "Release, HTTP, and native origins must match as credential-free HTTPS origins.",
      ),
    );
    lane.status = "blocked";
  }

  return lane;
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((entry) => typeof entry === "string")) return null;
  return value;
}

function classifyNative(
  validation: RcGateSourceValidation,
  head: string,
  reasons: BlockingReason[],
): NativeLane {
  const release = validation.validatedRelease;
  const releaseEvidence = validation.validatedReleaseEvidence;
  const verification = record(release?.verification);
  const nativeSummary = record(verification?.nativeChrome);
  const nativeReceipt = record(releaseEvidence?.nativeReceipt);
  const lane: NativeLane = {
    sourcePath:
      typeof nativeSummary?.evidencePath === "string"
        ? nativeSummary.evidencePath
        : "artifacts/release/native-webmcp.json",
    digest:
      typeof nativeSummary?.evidenceDigest === "string" ? nativeSummary.evidenceDigest : null,
    status: "invalid",
    product: typeof nativeSummary?.product === "string" ? nativeSummary.product : null,
    version: typeof nativeSummary?.version === "string" ? nativeSummary.version : null,
    headed: typeof nativeSummary?.headed === "boolean" ? nativeSummary.headed : null,
    toolCountBefore: null,
    toolCountAfter: null,
    executionStatus:
      typeof nativeSummary?.executionResult === "string"
        ? nativeSummary.executionResult
        : null,
    publicOrigin: nativeReceipt ? httpsOrigin(nativeReceipt.origin) : null,
    entryPath:
      typeof nativeSummary?.entryIntegrity === "object" &&
      nativeSummary.entryIntegrity !== null &&
      typeof (nativeSummary.entryIntegrity as Record<string, unknown>).path === "string"
        ? String((nativeSummary.entryIntegrity as Record<string, unknown>).path)
        : null,
    entrySha256:
      typeof nativeSummary?.entryIntegrity === "object" &&
      nativeSummary.entryIntegrity !== null &&
      typeof (nativeSummary.entryIntegrity as Record<string, unknown>).sha256 === "string"
        ? String((nativeSummary.entryIntegrity as Record<string, unknown>).sha256)
        : null,
    entryByteCount:
      typeof nativeSummary?.entryIntegrity === "object" &&
      nativeSummary.entryIntegrity !== null &&
      typeof (nativeSummary.entryIntegrity as Record<string, unknown>).byteCount === "number"
        ? Number((nativeSummary.entryIntegrity as Record<string, unknown>).byteCount)
        : null,
    cspParity:
      typeof nativeSummary?.effectiveCsp === "string" &&
      typeof nativeReceipt?.effectiveCsp === "string"
        ? nativeSummary.effectiveCsp === nativeReceipt.effectiveCsp
        : null,
    applicationErrorTotal: null,
  };

  if (!validation.releaseDocument.valid) {
    reasons.push(
      blockingReason(
        validation.releaseDocument.reasonCode ?? "RELEASE_DOCUMENT_INVALID",
        "nativeWebMcp",
        validation.releaseDocument.message ??
          "Native WebMCP evidence was not validated because the release receipt is invalid.",
      ),
    );
    lane.status = "blocked";
    return lane;
  }
  if (!validation.releaseEvidence.valid || !releaseEvidence) {
    reasons.push(
      blockingReason(
        validation.releaseEvidence.reasonCode ?? "RELEASE_EVIDENCE_INVALID",
        "nativeWebMcp",
        validation.releaseEvidence.message ??
          "Native WebMCP evidence failed canonical validation.",
      ),
    );
    lane.status = "blocked";
    return lane;
  }

  const errorCounts = record(nativeSummary?.applicationErrorCounts);
  if (errorCounts) {
    lane.applicationErrorTotal =
      Number(errorCounts.console ?? 0) +
      Number(errorCounts.page ?? 0) +
      Number(errorCounts.request ?? 0) +
      Number(errorCounts.response ?? 0);
  }

  const summaryToolNames = stringArray(nativeSummary?.toolNames);
  const initialToolNames = stringArray(nativeReceipt?.toolNames);
  const reloadToolNames = stringArray(nativeReceipt?.reloadToolNames);
  lane.toolCountBefore = summaryToolNames?.length ?? null;
  lane.toolCountAfter = reloadToolNames?.length ?? initialToolNames?.length ?? null;

  const releaseOrigin = httpsOrigin(release?.publicUrl);
  const headed = nativeSummary?.headed === true && nativeSummary.diagnosticOnly === false;
  const executionPassed = lane.executionStatus === "passed";
  const reloadVerified = nativeSummary?.reloadRegistrationVerified === true;
  const entryIntegrity = record(nativeReceipt?.entryIntegrity);
  const entryPassed =
    entryIntegrity?.passed === true &&
    lane.entrySha256 !== null &&
    lane.entryPath === entryIntegrity.path &&
    lane.entrySha256 === entryIntegrity.sha256 &&
    lane.entryByteCount === entryIntegrity.byteCount;
  const cspMatched = lane.cspParity === true;
  const zeroErrors = lane.applicationErrorTotal === 0;
  const originMatched =
    releaseOrigin !== null &&
    lane.publicOrigin !== null &&
    releaseOrigin === lane.publicOrigin;
  const summaryToolsExact =
    summaryToolNames !== null && arraysEqual(summaryToolNames, CANONICAL_NATIVE_TOOL_NAMES);
  const initialToolsExact =
    initialToolNames !== null && arraysEqual(initialToolNames, CANONICAL_NATIVE_TOOL_NAMES);
  const reloadToolsExact =
    reloadToolNames !== null && arraysEqual(reloadToolNames, CANONICAL_NATIVE_TOOL_NAMES);
  const summaryMatchesReceipt =
    summaryToolNames !== null &&
    initialToolNames !== null &&
    arraysEqual(summaryToolNames, initialToolNames);
  const digestMatched =
    lane.digest !== null && lane.digest === releaseEvidence.nativeReceiptDigest;

  const preparation = record(release?.preparation);
  const sourceCommit =
    typeof preparation?.sourceCommit === "string" ? preparation.sourceCommit : null;
  if (sourceCommit && sourceCommit !== head) {
    lane.status = "stale";
    reasons.push(
      blockingReason(
        "NATIVE_WEBMCP_STALE",
        "nativeWebMcp",
        "Native WebMCP evidence is stale relative to the current candidate.",
      ),
    );
    return lane;
  }

  if (!digestMatched) {
    reasons.push(
      blockingReason(
        "NATIVE_WEBMCP_DIGEST_MISMATCH",
        "nativeWebMcp",
        "Native WebMCP evidence digest does not match validated bytes.",
      ),
    );
  }
  if (!originMatched) {
    reasons.push(
      blockingReason(
        "NATIVE_WEBMCP_ORIGIN_MISMATCH",
        "nativeWebMcp",
        "Native WebMCP origin must match the public release origin.",
      ),
    );
  }
  if (!summaryToolsExact || !initialToolsExact) {
    reasons.push(
      blockingReason(
        "NATIVE_WEBMCP_TOOL_MISMATCH",
        "nativeWebMcp",
        "Native WebMCP initial tool names must equal the canonical nine names in sorted order.",
      ),
    );
  }
  if (!reloadToolsExact) {
    reasons.push(
      blockingReason(
        "NATIVE_WEBMCP_RELOAD_MISMATCH",
        "nativeWebMcp",
        "Native WebMCP reload tool names must equal the canonical nine names in sorted order.",
      ),
    );
  }
  if (!summaryMatchesReceipt) {
    reasons.push(
      blockingReason(
        "NATIVE_WEBMCP_TOOL_MISMATCH",
        "nativeWebMcp",
        "Release native summary tool names must equal validated native receipt tool names.",
      ),
    );
  }

  const passed =
    nativeReceipt !== null &&
    headed &&
    summaryToolsExact &&
    initialToolsExact &&
    reloadToolsExact &&
    summaryMatchesReceipt &&
    executionPassed &&
    reloadVerified &&
    entryPassed &&
    cspMatched &&
    zeroErrors &&
    originMatched &&
    digestMatched;

  if (!passed) {
    lane.status = "blocked";
    if (!nativeReceipt) {
      reasons.push(
        blockingReason(
          "NATIVE_WEBMCP_INVALID",
          "nativeWebMcp",
          "Native WebMCP evidence is missing or malformed.",
        ),
      );
    }
    if (!executionPassed) {
      reasons.push(
        blockingReason(
          "NATIVE_WEBMCP_EXECUTION_FAILED",
          "nativeWebMcp",
          "Native WebMCP execution did not pass.",
        ),
      );
    }
    if (!entryPassed) {
      reasons.push(
        blockingReason(
          "NATIVE_WEBMCP_ENTRY_INTEGRITY_FAILED",
          "nativeWebMcp",
          "Native WebMCP entry integrity proof failed.",
        ),
      );
    }
    return lane;
  }

  lane.status = "passed";
  return lane;
}

function classifyCompatibleBrowserAgent(
  validation: RcGateSourceValidation,
  digest: string,
  head: string,
  publicOrigin: string | null,
  reasons: BlockingReason[],
): CompatibleBrowserAgentLane {
  const lane: CompatibleBrowserAgentLane = {
    sourcePath: LIVE_AGENT_CURRENT_PATH,
    digest,
    status: "invalid",
    browserAgentName: null,
    browserVersion: null,
    testedOrigin: null,
    appBuildIdentifier: null,
    verifiedAt: null,
    casePassCount: null,
    caseFailCount: null,
    evidencePaths: null,
  };
  if (!validation.liveAgent.valid || !validation.validatedLiveAgent) {
    reasons.push(
      blockingReason(
        validation.liveAgent.reasonCode ?? "SOURCE_INVALID",
        "compatibleBrowserAgent",
        validation.liveAgent.message ??
          "Compatible browser-agent evidence failed canonical validation.",
      ),
    );
    return lane;
  }

  const report = validation.validatedLiveAgent;
  const environment = report.status === "not_run" ? null : report.environment;
  lane.browserAgentName =
    environment && "browserAgentName" in environment ? environment.browserAgentName : null;
  lane.browserVersion =
    environment && "browserVersion" in environment ? environment.browserVersion : null;
  lane.testedOrigin =
    environment && "testedUrl" in environment && environment.testedUrl
      ? httpsOrigin(environment.testedUrl)
      : null;
  lane.appBuildIdentifier =
    environment && "appBuildIdentifier" in environment ? environment.appBuildIdentifier : null;
  lane.verifiedAt = report.status === "not_run" ? null : report.verifiedAt;
  const cases = report.status === "not_run" ? [] : report.cases;
  lane.casePassCount = cases.filter((entry) => entry.outcome === "pass").length;
  lane.caseFailCount = cases.filter((entry) => entry.outcome === "fail").length;
  lane.evidencePaths = cases.map((entry) => entry.resultEvidencePath);

  if (report.status === "not_run") {
    lane.status = "not_run";
    reasons.push(
      blockingReason(
        "COMPATIBLE_BROWSER_AGENT_NOT_RUN",
        "compatibleBrowserAgent",
        "Compatible browser-agent evidence is not verified.",
      ),
    );
    return lane;
  }

  const expectedIds = [...EVAL_CASE_IDS];
  const observedIds = cases.map((entry) => entry.promptId);
  const idsMatch =
    observedIds.length === expectedIds.length &&
    expectedIds.every((id) => observedIds.includes(id));

  if (!idsMatch) {
    reasons.push(
      blockingReason(
        "COMPATIBLE_BROWSER_AGENT_MISSING_CASES",
        "compatibleBrowserAgent",
        "Compatible browser-agent evidence must contain all twelve manifest cases.",
      ),
    );
  }

  if (lane.appBuildIdentifier !== head) {
    reasons.push(
      blockingReason(
        "COMPATIBLE_BROWSER_AGENT_BUILD_MISMATCH",
        "compatibleBrowserAgent",
        "Compatible browser-agent app build identifier must match candidate HEAD.",
      ),
    );
  }

  if (
    publicOrigin === null ||
    lane.testedOrigin === null ||
    publicOrigin !== lane.testedOrigin
  ) {
    reasons.push(
      blockingReason(
        "COMPATIBLE_BROWSER_AGENT_ORIGIN_MISMATCH",
        "compatibleBrowserAgent",
        "Compatible browser-agent tested origin must match the public release origin.",
      ),
    );
  }

  if (lane.caseFailCount > 0) {
    reasons.push(
      blockingReason(
        "COMPATIBLE_BROWSER_AGENT_CASE_FAILED",
        "compatibleBrowserAgent",
        "Compatible browser-agent evidence contains failed cases.",
      ),
    );
  }

  const verified =
    report.status === "verified" &&
    idsMatch &&
    lane.appBuildIdentifier === head &&
    publicOrigin !== null &&
    lane.testedOrigin === publicOrigin &&
    lane.caseFailCount === 0 &&
    lane.casePassCount === 12;

  if (!verified) {
    lane.status = report.status === "failed" ? "failed" : "invalid";
    if (report.status === "failed") {
      reasons.push(
        blockingReason(
          "COMPATIBLE_BROWSER_AGENT_FAILED",
          "compatibleBrowserAgent",
          "Compatible browser-agent evidence failed verification.",
        ),
      );
    }
    return lane;
  }

  lane.status = "verified";
  return lane;
}

function classifyProductInvariants(
  snapshot: ProductInvariantSnapshot,
  digest: string,
  reasons: BlockingReason[],
): ProductInvariantLane {
  const toolNamesMatch =
    arraysEqual(snapshot.toolNames, CANONICAL_PRODUCT_TOOL_NAMES) &&
    arraysEqual([...TOOL_NAMES], CANONICAL_PRODUCT_TOOL_NAMES);
  const humanOnlyMatch =
    arraysEqual(snapshot.humanOnlyActionNames, CANONICAL_HUMAN_ONLY_ACTION_NAMES) &&
    arraysEqual([...HUMAN_ONLY_ACTION_NAMES], CANONICAL_HUMAN_ONLY_ACTION_NAMES);
  const toolSet = new Set(snapshot.toolNames);
  const exposed = CANONICAL_HUMAN_ONLY_ACTION_NAMES.filter((name) => toolSet.has(name));
  const gatesPresent = JUDGE_VISIBLE_APPROVAL_GATES.every((gate) =>
    snapshot.humanOnlyActionNames.includes(gate),
  );
  const humanOnlyAbsent = exposed.length === 0;
  const euUnknown = snapshot.canonicalEuResidencyStatus === "unknown";

  if (!toolNamesMatch) {
    reasons.push(
      blockingReason(
        "PRODUCT_INVARIANT_TOOL_MISMATCH",
        "productInvariants",
        "Product registry tool names must exactly match the canonical nine production names.",
      ),
    );
  }
  if (!humanOnlyMatch) {
    reasons.push(
      blockingReason(
        "PRODUCT_INVARIANT_HUMAN_ONLY_MISMATCH",
        "productInvariants",
        "Human-only action names must exactly match the canonical seven production names.",
      ),
    );
  }
  if (!humanOnlyAbsent) {
    reasons.push(
      blockingReason(
        "PRODUCT_INVARIANT_HUMAN_ONLY_EXPOSED",
        "productInvariants",
        "Human-only actions must not appear in the tool registry.",
      ),
    );
  }
  if (!gatesPresent) {
    reasons.push(
      blockingReason(
        "PRODUCT_INVARIANT_APPROVAL_GATE_MISSING",
        "productInvariants",
        "Judge-visible approval gate names must remain in the human-only set.",
      ),
    );
  }
  if (!euUnknown) {
    reasons.push(
      blockingReason(
        "PRODUCT_INVARIANT_EU_STATUS",
        "productInvariants",
        "Canonical room EU residency must remain unknown.",
      ),
    );
  }

  const passed = toolNamesMatch && humanOnlyMatch && humanOnlyAbsent && gatesPresent && euUnknown;
  return {
    status: passed ? "passed" : "failed",
    toolNames: [...snapshot.toolNames],
    humanOnlyActionNames: [...snapshot.humanOnlyActionNames],
    judgeVisibleApprovalGates: [...JUDGE_VISIBLE_APPROVAL_GATES],
    canonicalEuResidencyStatus: snapshot.canonicalEuResidencyStatus,
    humanOnlyAbsentFromTools: humanOnlyAbsent,
    digest,
  };
}

function deriveLocalCandidateLaneStatus(
  sources: RcGateSources,
  localQa: LocalQaReceipt | null,
  deterministic: DeterministicLane,
): LaneStatus {
  if (!sources.workspaceClean) return "blocked";
  if (localQa === null) return "blocked";
  if (localQa.status !== "passed") return "blocked";
  if (localQa.candidateCommit !== sources.head) return "blocked";
  if (localQa.workspace.statusAfter.digest !== sources.workspace.digest) return "blocked";
  const evalDigestsMatch =
    localQa.evalArtifacts.deterministicReportDigest === deterministic.digest &&
    localQa.evalArtifacts.responsesCurrentDigest === sources.responsesDigest &&
    localQa.evalArtifacts.liveAgentCurrentDigest === sources.liveAgentDigest;
  if (!evalDigestsMatch) return "blocked";
  return "ready";
}
function classifyLocalCandidate(
  sources: RcGateSources,
  localQa: LocalQaReceipt | null,
  deterministic: DeterministicLane,
  reasons: BlockingReason[],
): void {
  if (!sources.workspaceClean) {
    reasons.push(
      blockingReason(
        "WORKTREE_DIRTY",
        "localCandidate",
        "Filtered working tree is not clean.",
      ),
    );
  }
  if (localQa === null) {
    reasons.push(
      blockingReason(
        "LOCAL_QA_MISSING",
        "localCandidate",
        "Local QA receipt is missing or invalid.",
      ),
    );
    return;
  }
  if (localQa.status !== "passed") {
    reasons.push(
      blockingReason(
        "LOCAL_QA_FAILED",
        "localCandidate",
        "Local QA receipt did not pass.",
      ),
    );
  }
  if (localQa.candidateCommit !== sources.head) {
    reasons.push(
      blockingReason(
        "LOCAL_QA_STALE_COMMIT",
        "localCandidate",
        "Local QA receipt commit does not match current HEAD.",
      ),
    );
  }
  if (localQa.workspace.statusAfter.digest !== sources.workspace.digest) {
    reasons.push(
      blockingReason(
        "LOCAL_QA_STALE_STATUS",
        "localCandidate",
        "Local QA receipt workspace digest does not match the current filtered status.",
      ),
    );
  }
  const evalDigestsMatch =
    localQa.evalArtifacts.deterministicReportDigest === deterministic.digest &&
    localQa.evalArtifacts.responsesCurrentDigest === sources.responsesDigest &&
    localQa.evalArtifacts.liveAgentCurrentDigest === sources.liveAgentDigest;
  if (!evalDigestsMatch) {
    reasons.push(
      blockingReason(
        "LOCAL_QA_STALE_EVAL_DIGEST",
        "localCandidate",
        "Local QA receipt eval artifact digests are stale.",
      ),
    );
  }
}

export function buildRcGateReceipt(sources: RcGateSources): RcGateReceipt {
  const reasons: BlockingReason[] = [];
  const validation =
    sources.sourceValidation ??
    buildSourceValidationFromInputs({
      releaseBytes: sources.releaseReceiptBytes,
      releaseDigest: sources.releaseReceiptDigest,
      deterministicRaw: sources.deterministicRaw,
      responsesRaw: sources.responsesRaw,
      liveAgentRaw: sources.liveAgentRaw,
      releaseEvidence:
        sources.httpReceiptDigest && sources.nativeReceiptDigest
          ? {
              httpReceipt: sources.httpReceiptRaw,
              nativeReceipt: sources.nativeReceiptRaw,
              httpReceiptDigest: sources.httpReceiptDigest,
              nativeReceiptDigest: sources.nativeReceiptDigest,
            }
          : null,
    });
  const localQa = parseLocalQa(sources.localQaRaw);
  const deterministic = classifyDeterministic(validation, sources.deterministicDigest, reasons);
  const responsesApi = classifyResponses(
    validation,
    sources.responsesDigest,
    sources.contractDigest,
    reasons,
  );
  const publicDeployment = classifyPublicDeployment(
    validation,
    sources.releaseReceiptDigest,
    sources.head,
    reasons,
  );
  const nativeWebMcp = classifyNative(validation, sources.head, reasons);
  if (publicDeployment.status === "stale" && nativeWebMcp.status !== "stale") {
    nativeWebMcp.status = "stale";
    reasons.push(
      blockingReason(
        "NATIVE_WEBMCP_STALE",
        "nativeWebMcp",
        "Native WebMCP evidence is stale relative to the current candidate.",
      ),
    );
  }
  const compatibleBrowserAgent = classifyCompatibleBrowserAgent(
    validation,
    sources.liveAgentDigest,
    sources.head,
    publicDeployment.publicOrigin,
    reasons,
  );
  const productInvariantDigest =
    sources.productInvariantDigest ??
    computeProductInvariantDigest(sources.productInvariants);
  const productInvariants = classifyProductInvariants(
    sources.productInvariants,
    productInvariantDigest,
    reasons,
  );
  classifyLocalCandidate(sources, localQa, deterministic, reasons);

  const blockingReasons = dedupeBlockingReasons(reasons);
  const localCandidateLaneStatus = deriveLocalCandidateLaneStatus(sources, localQa, deterministic);
  const ready =
    blockingReasons.length === 0 &&
    localCandidateLaneStatus === "ready" &&
    deterministic.status === "passed" &&
    responsesApi.status === "passed" &&
    publicDeployment.status === "ready" &&
    nativeWebMcp.status === "passed" &&
    compatibleBrowserAgent.status === "verified" &&
    productInvariants.status === "passed";

  const localQaStatus: RcGateReceipt["localQa"]["status"] =
    localQa === null
      ? sources.localQaRaw === null
        ? "missing"
        : "invalid"
      : localQa.status;

  return {
    schemaVersion: 1,
    generatedAt: sources.generatedAt,
    status: ready ? "ready" : "blocked",
    recordingEvidenceReady: ready,
    submissionTechnicalEvidenceReady: ready,
    candidate: {
      head: sources.head,
      filteredClean: sources.workspaceClean,
      filteredStatusDigest: sources.workspace.digest,
      filteredStatusEntryCount: sources.workspace.entryCount,
    },
    lanes: {
      localCandidate: {
        status: localCandidateLaneStatus,
        sourcePath: LOCAL_QA_RECEIPT_PATH,
        digest: sources.localQaDigest,
        identifiers: {
          qaStatus: localQaStatus,
          candidateCommit: localQa?.candidateCommit ?? null,
        },
      },
      publicDeployment: {
        status: publicDeployment.status,
        sourcePath: RELEASE_RECEIPT_PATH,
        digest: sources.releaseReceiptDigest,
        identifiers: {
          releaseId: publicDeployment.releaseId,
          deploymentCommit: publicDeployment.deploymentCommit,
        },
      },
      nativeWebMcp: {
        status: nativeWebMcp.status,
        sourcePath: nativeWebMcp.sourcePath,
        digest: nativeWebMcp.digest,
        identifiers: {
          executionStatus: nativeWebMcp.executionStatus,
          publicOrigin: nativeWebMcp.publicOrigin,
        },
      },
      responsesApi: {
        status:
          responsesApi.status === "passed"
            ? "passed"
            : responsesApi.status === "not_run"
              ? "not_run"
              : "blocked",
        sourcePath: RESPONSES_CURRENT_PATH,
        digest: sources.responsesDigest,
        identifiers: {
          model: responsesApi.model,
          aggregateScore:
            responsesApi.aggregateScore === null ? null : responsesApi.aggregateScore,
        },
      },
      compatibleBrowserAgent: {
        status: compatibleBrowserAgent.status,
        sourcePath: LIVE_AGENT_CURRENT_PATH,
        digest: sources.liveAgentDigest,
        identifiers: {
          appBuildIdentifier: compatibleBrowserAgent.appBuildIdentifier,
          verifiedAt: compatibleBrowserAgent.verifiedAt,
        },
      },
      deterministic: {
        status: deterministic.status === "passed" ? "passed" : "blocked",
        sourcePath: DETERMINISTIC_REPORT_PATH,
        digest: deterministic.digest,
        identifiers: {
          passedCases: deterministic.passedCases,
          assertions: deterministic.assertions,
        },
      },
      productInvariants: {
        status: productInvariants.status === "passed" ? "passed" : "blocked",
        sourcePath: "src/webmcp/toolDefinitions.ts",
        digest: productInvariants.digest,
        identifiers: {
          toolCount: productInvariants.toolNames.length,
          euStatus: productInvariants.canonicalEuResidencyStatus,
        },
      },
    },
    localQa: {
      sourcePath: LOCAL_QA_RECEIPT_PATH,
      digest: sources.localQaDigest,
      status: localQaStatus,
      candidateCommit: localQa?.candidateCommit ?? null,
      workspaceStatusDigest: localQa?.workspace.statusAfter.digest ?? null,
      workspaceParity: localQa?.workspace.statusParity ?? null,
      stepSummary:
        localQa?.steps.map((step) => ({ id: step.id, status: step.status })) ?? [],
      evalArtifactDigests: {
        deterministicReport: localQa?.evalArtifacts.deterministicReportDigest ?? null,
        responsesCurrent: localQa?.evalArtifacts.responsesCurrentDigest ?? null,
        liveAgentCurrent: localQa?.evalArtifacts.liveAgentCurrentDigest ?? null,
      },
    },
    deterministic,
    responsesApi,
    publicDeployment,
    nativeWebMcp,
    compatibleBrowserAgent,
    productInvariants,
    blockingReasons,
  };
}

export function validatePersistedReceiptParity(
  persisted: RcGateReceipt,
  sources: RcGateSources,
): BlockingReason[] {
  const reasons: BlockingReason[] = [];
  const pushChanged = (message: string) => {
    reasons.push(
      blockingReason("RECEIPT_SOURCE_CHANGED", "receipt", message),
    );
  };

  if (persisted.candidate.head !== sources.head) {
    pushChanged("Candidate HEAD changed after receipt generation.");
  }
  if (persisted.candidate.filteredStatusDigest !== sources.workspace.digest) {
    pushChanged("Filtered workspace digest changed after receipt generation.");
  }
  if (persisted.localQa.digest !== sources.localQaDigest) {
    pushChanged("Local QA receipt digest changed after RC receipt generation.");
  }
  if (persisted.deterministic.digest !== sources.deterministicDigest) {
    pushChanged("Deterministic report digest changed after receipt generation.");
  }
  if (persisted.responsesApi.digest !== sources.responsesDigest) {
    pushChanged("Responses current digest changed after receipt generation.");
  }
  if (persisted.compatibleBrowserAgent.digest !== sources.liveAgentDigest) {
    pushChanged("Compatible browser-agent current digest changed after receipt generation.");
  }
  if (persisted.publicDeployment.digest !== sources.releaseReceiptDigest) {
    pushChanged("Final release receipt digest changed after receipt generation.");
  }
  if (
    persisted.publicDeployment.httpReceiptDigest !== sources.httpReceiptDigest &&
  (persisted.publicDeployment.httpReceiptDigest !== null || sources.httpReceiptDigest !== null)
  ) {
    pushChanged("Validated HTTP evidence digest changed after receipt generation.");
  }
  if (
    persisted.publicDeployment.nativeReceiptDigest !== sources.nativeReceiptDigest &&
  (persisted.publicDeployment.nativeReceiptDigest !== null || sources.nativeReceiptDigest !== null)
  ) {
    pushChanged("Validated native evidence digest changed after receipt generation.");
  }
  if (persisted.lanes.productInvariants.digest !== sources.productInvariantDigest) {
    pushChanged("Product invariant digest changed after receipt generation.");
  }
  return dedupeBlockingReasons(reasons);
}
