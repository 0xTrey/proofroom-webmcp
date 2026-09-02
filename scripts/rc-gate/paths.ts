/** Repository-relative paths used by the release-candidate gate. */
export const RC_GATE_DIR = "artifacts/rc-gate";
export const LOCAL_QA_RECEIPT_PATH = "artifacts/rc-gate/local-qa.json";
export const CURRENT_RECEIPT_PATH = "artifacts/rc-gate/current.json";
export const RC_GATE_SCHEMA_PATH = "artifacts/rc-gate/rc-gate.schema.json";
export const RELEASE_RECEIPT_PATH = "artifacts/release/release-receipt.json";
export const DETERMINISTIC_REPORT_PATH = "evals/results/deterministic-report.json";
export const RESPONSES_CURRENT_PATH = "evals/responses-api/results/current.json";
export const LIVE_AGENT_CURRENT_PATH = "evals/live-agent/current.json";
export const MANIFEST_PATH = "evals/manifest.json";

/** Generated RC artifacts excluded from filtered workspace cleanliness checks. */
export const RC_GATE_WORKSPACE_EXCLUSIONS = [
  LOCAL_QA_RECEIPT_PATH,
  CURRENT_RECEIPT_PATH,
] as const;
