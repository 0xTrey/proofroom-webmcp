import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { computeContractDigest } from "../../evals/responses-api/contractDigest.ts";
import {
  buildRcGateReceipt,
  validatePersistedReceiptParity,
  type RcGateReceipt,
  type RcGateSources,
} from "./classify.ts";
import { sha256File } from "./digest.ts";
import {
  buildSourceValidation,
  readBoundedReleaseReceipt,
} from "./sourceValidation.ts";
import { computeProductInvariantDigest, buildProductInvariantSnapshot } from "./productInvariants.ts";
import {
  CURRENT_RECEIPT_PATH,
  DETERMINISTIC_REPORT_PATH,
  LIVE_AGENT_CURRENT_PATH,
  LOCAL_QA_RECEIPT_PATH,
  RELEASE_RECEIPT_PATH,
  RESPONSES_CURRENT_PATH,
} from "./paths.ts";
import { readFilteredGitStatus, readHeadCommit } from "./workspace.ts";
import { dedupeBlockingReasons } from "./reasons.ts";
import { validateRcGateReceiptDocument } from "./receiptSchema.ts";

function readJsonOptional(path: string): unknown | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    return null;
  }
}

function sha256Optional(path: string): string | null {
  try {
    return sha256File(path);
  } catch {
    return null;
  }
}

export function loadRcGateSources(repositoryRoot: string): RcGateSources {
  const resolvePath = (relativePath: string) => resolve(repositoryRoot, relativePath);
  const workspace = readFilteredGitStatus(repositoryRoot);
  const { releaseRaw, releaseDigest, releaseBytes } = readBoundedReleaseReceipt(repositoryRoot);
  const sourceValidation = buildSourceValidation(repositoryRoot, {
    releaseBytes,
    releaseDigest,
    deterministicRaw: readJsonOptional(resolvePath(DETERMINISTIC_REPORT_PATH)),
    responsesRaw: readJsonOptional(resolvePath(RESPONSES_CURRENT_PATH)),
    liveAgentRaw: readJsonOptional(resolvePath(LIVE_AGENT_CURRENT_PATH)),
  });
  const productInvariants = buildProductInvariantSnapshot();
  const releaseEvidence = sourceValidation.validatedReleaseEvidence;

  return {
    generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, ".000Z"),
    head: readHeadCommit(repositoryRoot),
    workspace,
    workspaceClean: workspace.entryCount === 0,
    localQaRaw: readJsonOptional(resolvePath(LOCAL_QA_RECEIPT_PATH)),
    localQaDigest: sha256Optional(resolvePath(LOCAL_QA_RECEIPT_PATH)),
    deterministicRaw: readJsonOptional(resolvePath(DETERMINISTIC_REPORT_PATH)),
    deterministicDigest: sha256File(resolvePath(DETERMINISTIC_REPORT_PATH)),
    responsesRaw: readJsonOptional(resolvePath(RESPONSES_CURRENT_PATH)),
    responsesDigest: sha256File(resolvePath(RESPONSES_CURRENT_PATH)),
    liveAgentRaw: readJsonOptional(resolvePath(LIVE_AGENT_CURRENT_PATH)),
    liveAgentDigest: sha256File(resolvePath(LIVE_AGENT_CURRENT_PATH)),
    releaseReceiptRaw: releaseRaw,
    releaseReceiptBytes: releaseBytes,
    releaseReceiptDigest:
      releaseDigest ?? sha256Optional(resolvePath(RELEASE_RECEIPT_PATH)) ?? "0".repeat(64),
    httpReceiptRaw: releaseEvidence?.httpReceipt ?? null,
    httpReceiptDigest: releaseEvidence?.httpReceiptDigest ?? null,
    nativeReceiptRaw: releaseEvidence?.nativeReceipt ?? null,
    nativeReceiptDigest: releaseEvidence?.nativeReceiptDigest ?? null,
    contractDigest: computeContractDigest(),
    productInvariants,
    productInvariantDigest: computeProductInvariantDigest(productInvariants),
    sourceValidation,
  };
}

export function refreshRcGateReceipt(repositoryRoot: string): RcGateReceipt {
  const sources = loadRcGateSources(repositoryRoot);
  return validateRcGateReceiptDocument(buildRcGateReceipt(sources));
}

export function validateRcGateReceipt(
  repositoryRoot: string,
  persisted: RcGateReceipt,
): RcGateReceipt {
  const sources = loadRcGateSources(repositoryRoot);
  const parityReasons = validatePersistedReceiptParity(persisted, sources);
  const fresh = buildRcGateReceipt(sources);
  if (parityReasons.length > 0) {
    return validateRcGateReceiptDocument({
      ...fresh,
      status: "blocked",
      recordingEvidenceReady: false,
      submissionTechnicalEvidenceReady: false,
      blockingReasons: dedupeBlockingReasons([...fresh.blockingReasons, ...parityReasons]),
    });
  }
  return validateRcGateReceiptDocument(fresh);
}

export { validateReleaseReceiptForGate } from "./runtimeRelease.ts";

export { validateRcGateReceiptDocument } from "./receiptSchema.ts";

export function printLaneSummary(receipt: RcGateReceipt): void {
  const lines = [
    `RC gate: ${receipt.status.toUpperCase()}`,
    `candidate ${receipt.candidate.head.slice(0, 12)} clean=${receipt.candidate.filteredClean}`,
    `localCandidate ${receipt.lanes.localCandidate.status}`,
    `publicDeployment ${receipt.lanes.publicDeployment.status}`,
    `nativeWebMcp ${receipt.lanes.nativeWebMcp.status}`,
    `responsesApi ${receipt.lanes.responsesApi.status}`,
    `compatibleBrowserAgent ${receipt.lanes.compatibleBrowserAgent.status}`,
    `deterministic ${receipt.lanes.deterministic.status}`,
    `productInvariants ${receipt.lanes.productInvariants.status}`,
  ];
  if (receipt.blockingReasons.length > 0) {
    lines.push(
      `blockers ${receipt.blockingReasons.map((reason) => reason.code).join(", ")}`,
    );
  }
  console.log(lines.join("\n"));
}

export const RC_GATE_ARTIFACT_PATH = CURRENT_RECEIPT_PATH;
