export const BLOCKING_REASON_CODES = [
  "WORKTREE_DIRTY",
  "LOCAL_QA_MISSING",
  "LOCAL_QA_FAILED",
  "LOCAL_QA_STALE_COMMIT",
  "LOCAL_QA_STALE_STATUS",
  "LOCAL_QA_STALE_EVAL_DIGEST",
  "DETERMINISTIC_INVALID",
  "DETERMINISTIC_COUNT_MISMATCH",
  "DETERMINISTIC_TOOL_MISMATCH",
  "DETERMINISTIC_MANIFEST_DIGEST_MISMATCH",
  "DETERMINISTIC_SEQUENCE_DIGEST_MISMATCH",
  "RESPONSES_NOT_RUN",
  "RESPONSES_FAILED",
  "RESPONSES_INVALID",
  "RESPONSES_STALE_CONTRACT",
  "RESPONSES_CASE_MISMATCH",
  "RESPONSES_SCORE_LOW",
  "RESPONSES_TRUTH_LABEL_FORGED",
  "PUBLIC_RELEASE_MISSING",
  "RELEASE_DOCUMENT_INVALID",
  "RELEASE_EVIDENCE_INVALID",
  "SOURCE_INVALID",
  "PUBLIC_RELEASE_INVALID",
  "PUBLIC_RELEASE_STALE",
  "PUBLIC_RELEASE_COMMIT_MISMATCH",
  "PUBLIC_RELEASE_DIGEST_MISMATCH",
  "PUBLIC_RELEASE_ORIGIN_MISMATCH",
  "NATIVE_WEBMCP_INVALID",
  "NATIVE_WEBMCP_DIGEST_MISMATCH",
  "NATIVE_WEBMCP_ORIGIN_MISMATCH",
  "NATIVE_WEBMCP_TOOL_MISMATCH",
  "NATIVE_WEBMCP_RELOAD_MISMATCH",
  "NATIVE_WEBMCP_EXECUTION_FAILED",
  "NATIVE_WEBMCP_ENTRY_INTEGRITY_FAILED",
  "NATIVE_WEBMCP_STALE",
  "COMPATIBLE_BROWSER_AGENT_NOT_RUN",
  "COMPATIBLE_BROWSER_AGENT_FAILED",
  "COMPATIBLE_BROWSER_AGENT_MISSING_CASES",
  "COMPATIBLE_BROWSER_AGENT_PROMPT_MISMATCH",
  "COMPATIBLE_BROWSER_AGENT_BUILD_MISMATCH",
  "COMPATIBLE_BROWSER_AGENT_ORIGIN_MISMATCH",
  "COMPATIBLE_BROWSER_AGENT_CASE_FAILED",
  "PRODUCT_INVARIANT_TOOL_COUNT",
  "PRODUCT_INVARIANT_TOOL_MISMATCH",
  "PRODUCT_INVARIANT_HUMAN_ONLY_MISMATCH",
  "PRODUCT_INVARIANT_HUMAN_ONLY_EXPOSED",
  "PRODUCT_INVARIANT_HUMAN_ONLY_SET",
  "PRODUCT_INVARIANT_APPROVAL_GATE_MISSING",
  "PRODUCT_INVARIANT_EU_STATUS",
  "RECEIPT_SOURCE_CHANGED",
  "RECEIPT_VALIDATION_ERROR",
] as const;

export type BlockingReasonCode = (typeof BLOCKING_REASON_CODES)[number];

export type BlockingReasonLane =
  | "localCandidate"
  | "publicDeployment"
  | "nativeWebMcp"
  | "responsesApi"
  | "compatibleBrowserAgent"
  | "deterministic"
  | "productInvariants"
  | "receipt";

export type BlockingReason = {
  code: BlockingReasonCode;
  lane: BlockingReasonLane;
  message: string;
};

/**
 * Canonical code-to-lane map. Some codes may appear in more than one lane when
 * one upstream failure must block both public deployment and native WebMCP.
 */
export const BLOCKING_REASON_CODE_TO_LANES: Record<
  BlockingReasonCode,
  readonly BlockingReasonLane[]
> = {
  WORKTREE_DIRTY: ["localCandidate"],
  LOCAL_QA_MISSING: ["localCandidate"],
  LOCAL_QA_FAILED: ["localCandidate"],
  LOCAL_QA_STALE_COMMIT: ["localCandidate"],
  LOCAL_QA_STALE_STATUS: ["localCandidate"],
  LOCAL_QA_STALE_EVAL_DIGEST: ["localCandidate"],
  DETERMINISTIC_INVALID: ["deterministic"],
  DETERMINISTIC_COUNT_MISMATCH: ["deterministic"],
  DETERMINISTIC_TOOL_MISMATCH: ["deterministic"],
  DETERMINISTIC_MANIFEST_DIGEST_MISMATCH: ["deterministic"],
  DETERMINISTIC_SEQUENCE_DIGEST_MISMATCH: ["deterministic"],
  RESPONSES_NOT_RUN: ["responsesApi"],
  RESPONSES_FAILED: ["responsesApi"],
  RESPONSES_INVALID: ["responsesApi"],
  RESPONSES_STALE_CONTRACT: ["responsesApi"],
  RESPONSES_CASE_MISMATCH: ["responsesApi"],
  RESPONSES_SCORE_LOW: ["responsesApi"],
  RESPONSES_TRUTH_LABEL_FORGED: ["responsesApi"],
  PUBLIC_RELEASE_MISSING: ["publicDeployment"],
  RELEASE_DOCUMENT_INVALID: ["publicDeployment", "nativeWebMcp"],
  RELEASE_EVIDENCE_INVALID: ["publicDeployment", "nativeWebMcp"],
  SOURCE_INVALID: ["deterministic", "responsesApi", "compatibleBrowserAgent"],
  PUBLIC_RELEASE_INVALID: ["publicDeployment"],
  PUBLIC_RELEASE_STALE: ["publicDeployment"],
  PUBLIC_RELEASE_COMMIT_MISMATCH: ["publicDeployment"],
  PUBLIC_RELEASE_DIGEST_MISMATCH: ["publicDeployment"],
  PUBLIC_RELEASE_ORIGIN_MISMATCH: ["publicDeployment"],
  NATIVE_WEBMCP_INVALID: ["nativeWebMcp"],
  NATIVE_WEBMCP_DIGEST_MISMATCH: ["nativeWebMcp"],
  NATIVE_WEBMCP_ORIGIN_MISMATCH: ["nativeWebMcp"],
  NATIVE_WEBMCP_TOOL_MISMATCH: ["nativeWebMcp"],
  NATIVE_WEBMCP_RELOAD_MISMATCH: ["nativeWebMcp"],
  NATIVE_WEBMCP_EXECUTION_FAILED: ["nativeWebMcp"],
  NATIVE_WEBMCP_ENTRY_INTEGRITY_FAILED: ["nativeWebMcp"],
  NATIVE_WEBMCP_STALE: ["nativeWebMcp"],
  COMPATIBLE_BROWSER_AGENT_NOT_RUN: ["compatibleBrowserAgent"],
  COMPATIBLE_BROWSER_AGENT_FAILED: ["compatibleBrowserAgent"],
  COMPATIBLE_BROWSER_AGENT_MISSING_CASES: ["compatibleBrowserAgent"],
  COMPATIBLE_BROWSER_AGENT_PROMPT_MISMATCH: ["compatibleBrowserAgent"],
  COMPATIBLE_BROWSER_AGENT_BUILD_MISMATCH: ["compatibleBrowserAgent"],
  COMPATIBLE_BROWSER_AGENT_ORIGIN_MISMATCH: ["compatibleBrowserAgent"],
  COMPATIBLE_BROWSER_AGENT_CASE_FAILED: ["compatibleBrowserAgent"],
  PRODUCT_INVARIANT_TOOL_COUNT: ["productInvariants"],
  PRODUCT_INVARIANT_TOOL_MISMATCH: ["productInvariants"],
  PRODUCT_INVARIANT_HUMAN_ONLY_MISMATCH: ["productInvariants"],
  PRODUCT_INVARIANT_HUMAN_ONLY_EXPOSED: ["productInvariants"],
  PRODUCT_INVARIANT_HUMAN_ONLY_SET: ["productInvariants"],
  PRODUCT_INVARIANT_APPROVAL_GATE_MISSING: ["productInvariants"],
  PRODUCT_INVARIANT_EU_STATUS: ["productInvariants"],
  RECEIPT_SOURCE_CHANGED: ["receipt"],
  RECEIPT_VALIDATION_ERROR: ["receipt"],
};

const CODE_SET = new Set<string>(BLOCKING_REASON_CODES);

export type CanonicalBlockingReasonPair = {
  code: BlockingReasonCode;
  lane: BlockingReasonLane;
};

export const CANONICAL_BLOCKING_REASON_PAIRS: readonly CanonicalBlockingReasonPair[] =
  Object.entries(BLOCKING_REASON_CODE_TO_LANES).flatMap(([code, lanes]) =>
    lanes.map((lane) => ({
      code: code as BlockingReasonCode,
      lane,
    })),
  );

export function blockingReason(
  code: BlockingReasonCode,
  lane: BlockingReasonLane,
  message: string,
): BlockingReason {
  const allowedLanes = BLOCKING_REASON_CODE_TO_LANES[code];
  if (!allowedLanes.includes(lane)) {
    throw new Error(`Blocking reason code ${code} is not valid for lane ${lane}.`);
  }
  const bounded = message.slice(0, 240);
  return { code, lane, message: bounded };
}

export function dedupeBlockingReasons(reasons: BlockingReason[]): BlockingReason[] {
  const seen = new Set<string>();
  const output: BlockingReason[] = [];
  for (const reason of reasons) {
    if (!CODE_SET.has(reason.code)) {
      throw new Error(`Unknown blocking reason code: ${reason.code}`);
    }
    const key = `${reason.code}|${reason.lane}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(reason);
  }
  return output;
}
