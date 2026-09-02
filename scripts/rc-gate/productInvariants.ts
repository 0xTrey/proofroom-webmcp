import { createCanonicalRoom } from "../../src/fixtures/demoScenario.ts";
import { HUMAN_ONLY_ACTION_NAMES } from "../../src/domain/actions/index.ts";
import { TOOL_NAMES } from "../../src/webmcp/toolDefinitions.ts";
import { sha256Hex } from "./digest.ts";

export const CANONICAL_PRODUCT_TOOL_NAMES = [
  "get_room_state",
  "search_product_evidence",
  "evaluate_requirement",
  "calculate_roi",
  "propose_buyer_context",
  "stage_requirement",
  "attach_evidence",
  "save_stakeholder_brief",
  "propose_decision_status",
] as const;

export const CANONICAL_HUMAN_ONLY_ACTION_NAMES = [
  "approve_buyer_context",
  "reject_buyer_context",
  "approve_decision",
  "reject_decision",
  "apply_roi_assumptions",
  "dismiss_recovery_notice",
  "reset_room",
] as const;

export const CANONICAL_NATIVE_TOOL_NAMES = [...CANONICAL_PRODUCT_TOOL_NAMES].sort((left, right) =>
  left.localeCompare(right),
) as readonly string[];

export const EXPECTED_MANIFEST_DIGEST =
  "1db51bfbafb2ee68543905300e2efaf6ef1d0970bf156eacb6edcfe7e1c1ee4e";
export const EXPECTED_SEQUENCE_DIGEST =
  "4be96767aca3f2604570e4a9b9ec3f89c1b77fcce71c2338d6582ab392fb8df2";
export const EXPECTED_DETERMINISTIC_CASES = 12;
export const EXPECTED_DETERMINISTIC_ASSERTIONS = 60;
export const EXPECTED_TOOL_COUNT = 9;
export const JUDGE_VISIBLE_APPROVAL_GATES = [
  "approve_buyer_context",
  "approve_decision",
] as const;

export type ProductInvariantSnapshot = {
  toolNames: readonly string[];
  humanOnlyActionNames: readonly string[];
  judgeVisibleApprovalGates: readonly string[];
  canonicalEuResidencyStatus: string;
};

export function buildProductInvariantSnapshot(nowIso = "2026-08-26T12:00:00.000Z"): ProductInvariantSnapshot {
  const canonical = createCanonicalRoom(nowIso);
  const euRequirement = canonical.requirements.find((entry) => entry.id === "req_eu_residency");
  return {
    toolNames: [...TOOL_NAMES],
    humanOnlyActionNames: [...HUMAN_ONLY_ACTION_NAMES],
    judgeVisibleApprovalGates: [...JUDGE_VISIBLE_APPROVAL_GATES],
    canonicalEuResidencyStatus: euRequirement?.status ?? "missing",
  };
}

export function arraysEqual<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function computeProductInvariantDigest(snapshot: ProductInvariantSnapshot): string {
  return sha256Hex(
    JSON.stringify({
      toolNames: snapshot.toolNames,
      humanOnlyActionNames: snapshot.humanOnlyActionNames,
      judgeVisibleApprovalGates: snapshot.judgeVisibleApprovalGates,
      canonicalEuResidencyStatus: snapshot.canonicalEuResidencyStatus,
    }),
  );
}
