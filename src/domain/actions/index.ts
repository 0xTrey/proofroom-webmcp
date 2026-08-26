/**
 * The shared action interface.
 *
 * `AgentActions` is exactly what WebMCP exposes. `RoomActions` adds the human
 * only approvals, reset, and recovery controls the visible page needs. Both React
 * and the WebMCP adapter call this interface, and neither one holds product
 * logic of its own.
 */
import type { z } from "zod";
import { success, type ActionResult } from "../errors.ts";
import { inputDigest } from "../hash.ts";
import type { RoomSummary } from "../summaries.ts";
import type { ActionOrigin, RoomState } from "../types.ts";
import {
  approveBuyerContextAction,
  getRoomStateAction,
  proposeBuyerContextAction,
  rejectBuyerContextAction,
  type ApprovalApplied,
  type ProposalRejected,
  type ProposalStaged,
} from "./context.ts";
import { saveStakeholderBriefAction, type BriefSaved } from "./briefs.ts";
import {
  approveDecisionAction,
  proposeDecisionStatusAction,
  rejectDecisionAction,
  type DecisionApproved,
  type DecisionStaged,
} from "./decision.ts";
import type {
  ApprovalInput,
  ApplyRoiAssumptionsInput,
  AttachEvidenceInput,
  CalculateRoiInput,
  EvaluateRequirementInput,
  GetRoomStateInput,
  ProposeBuyerContextInput,
  ProposeDecisionStatusInput,
  RejectionInput,
  SaveStakeholderBriefInput,
  SearchProductEvidenceInput,
  StageRequirementInput,
} from "./inputs.ts";
import {
  attachEvidenceAction,
  evaluateRequirementAction,
  searchProductEvidenceAction,
  stageRequirementAction,
  type EvidenceAttached,
  type EvidenceSearchResult,
  type RequirementEvaluationResult,
  type RequirementStaged,
} from "./requirements.ts";
import { applyRoiAssumptionsAction, calculateRoiAction, type RoiApplied, type RoiCalculation } from "./roi.ts";
import { buildResetResult, canonicalResetState, dismissRecoveryNoticeAction, type RoomReset } from "./reset.ts";
import { executeAction, type ActionDefinition, type ActionInvocation } from "./runtime.ts";

/** Port the state layer implements. Keeps the domain free of Zustand. */
export type RoomTransactor = {
  read(): RoomState;
  now(): string;
  transact<Value>(
    runner: (state: RoomState) => ActionResult<{ value: Value; state: RoomState }>,
  ): ActionResult<Value>;
};

/** The nine tool-backed actions. This interface is what WebMCP receives. */
export interface AgentActions {
  getRoomState(input?: GetRoomStateInput): ActionResult<RoomSummary>;
  searchProductEvidence(input: SearchProductEvidenceInput): ActionResult<EvidenceSearchResult>;
  evaluateRequirement(input: EvaluateRequirementInput): ActionResult<RequirementEvaluationResult>;
  calculateRoi(input: CalculateRoiInput): ActionResult<RoiCalculation>;
  proposeBuyerContext(input: ProposeBuyerContextInput): ActionResult<ProposalStaged>;
  stageRequirement(input: StageRequirementInput): ActionResult<RequirementStaged>;
  attachEvidence(input: AttachEvidenceInput): ActionResult<EvidenceAttached>;
  saveStakeholderBrief(input: SaveStakeholderBriefInput): ActionResult<BriefSaved>;
  proposeDecisionStatus(input: ProposeDecisionStatusInput): ActionResult<DecisionStaged>;
}

/** Actions that require a person. These are never registered as tools. */
export interface HumanActions {
  approveBuyerContext(input: ApprovalInput): ActionResult<ApprovalApplied>;
  rejectBuyerContext(input: RejectionInput): ActionResult<ProposalRejected>;
  approveDecision(input: ApprovalInput): ActionResult<DecisionApproved>;
  rejectDecision(input: RejectionInput): ActionResult<ProposalRejected>;
  applyRoiAssumptions(input: ApplyRoiAssumptionsInput): ActionResult<RoiApplied>;
  dismissRecoveryNotice(): ActionResult<{ revision: number }>;
  resetRoom(): ActionResult<RoomReset>;
}

export interface RoomActions extends AgentActions, HumanActions {
  readonly origin: ActionOrigin;
  getSnapshot(): RoomState;
}

/** Names of every action a WebMCP tool may call. Used by registry tests. */
export const AGENT_ACTION_NAMES = [
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

/** Names that must never appear in the WebMCP registry. */
export const HUMAN_ONLY_ACTION_NAMES = [
  "approve_buyer_context",
  "reject_buyer_context",
  "approve_decision",
  "reject_decision",
  "apply_roi_assumptions",
  "dismiss_recovery_notice",
  "reset_room",
] as const;

export function createRoomActions(
  transactor: RoomTransactor,
  origin: ActionOrigin,
): RoomActions {
  function run<Schema extends z.ZodType, Value>(
    definition: ActionDefinition<Schema, Value>,
    input: unknown,
  ): ActionResult<Value> {
    const invocation: ActionInvocation = { origin, nowIso: transactor.now() };
    return transactor.transact((state) =>
      executeAction(state, definition, input, invocation, inputDigest),
    );
  }

  return {
    origin,
    getSnapshot: () => transactor.read(),

    getRoomState: (input) => run(getRoomStateAction, input ?? {}),
    searchProductEvidence: (input) => run(searchProductEvidenceAction, input),
    evaluateRequirement: (input) => run(evaluateRequirementAction, input),
    calculateRoi: (input) => run(calculateRoiAction, input),
    proposeBuyerContext: (input) => run(proposeBuyerContextAction, input),
    stageRequirement: (input) => run(stageRequirementAction, input),
    attachEvidence: (input) => run(attachEvidenceAction, input),
    saveStakeholderBrief: (input) => run(saveStakeholderBriefAction, input),
    proposeDecisionStatus: (input) => run(proposeDecisionStatusAction, input),

    approveBuyerContext: (input) => run(approveBuyerContextAction, input),
    rejectBuyerContext: (input) => run(rejectBuyerContextAction, input),
    approveDecision: (input) => run(approveDecisionAction, input),
    rejectDecision: (input) => run(rejectDecisionAction, input),
    applyRoiAssumptions: (input) => run(applyRoiAssumptionsAction, input),
    dismissRecoveryNotice: () => run(dismissRecoveryNoticeAction, {}),

    resetRoom: () =>
      transactor.transact((state) => {
        const nowIso = transactor.now();
        const room = canonicalResetState(nowIso);
        return success({
          value: buildResetResult(room, nowIso),
          // Reset intentionally discards the previous room, including its ledger.
          state: { ...room, roomId: state.roomId },
        });
      }),
  };
}

export type { RoomSummary } from "../summaries.ts";
export type {
  ApprovalApplied,
  ProposalRejected,
  ProposalStaged,
  BriefSaved,
  DecisionApproved,
  DecisionStaged,
  EvidenceAttached,
  EvidenceSearchResult,
  RequirementEvaluationResult,
  RequirementStaged,
  RoiApplied,
  RoiCalculation,
  RoomReset,
};
