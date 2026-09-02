import type { RoomState } from "../domain/types.ts";
import { hasCanonicalReviewSet } from "../features/evaluation/reviewSet.ts";
import type { RoomRouteId } from "./routes.ts";

export const GUIDE_STEPS = [
  { title: "Set the buying priorities", route: "product", targetId: "buyer-context-task" },
  { title: "Check the vendor's evidence", route: "evaluation", targetId: "requirements-proof-task" },
  { title: "Review the missing answers", route: "evaluation", targetId: "requirements-proof-task" },
  { title: "Make the final decision", route: "decision", targetId: "decision-review-task" },
] as const satisfies ReadonlyArray<{
  title: string;
  route: RoomRouteId;
  targetId: string;
}>;

export type RoomGuideStepState = "done" | "next" | "review" | "ready" | "open";

export type RoomGuideState = {
  completed: readonly boolean[];
  stepStates: readonly RoomGuideStepState[];
  currentIndex: number;
  completedCount: number;
  nextTitle: string;
  nextRoute: RoomRouteId;
  nextTargetId: string;
};

export function deriveRoomGuideState(room: RoomState): RoomGuideState {
  const contextDone = room.approvedBuyerContext !== null;
  const proofDone = hasCanonicalReviewSet(room.requirements);
  const decisionDone = room.approvedDecision !== null;
  const proposalReady = room.decisionProposal?.status === "pending";
  const stepStates: RoomGuideStepState[] = [
    contextDone ? "done" : "next",
    proofDone ? "done" : contextDone ? "next" : "open",
    decisionDone ? "done" : proposalReady ? "review" : proofDone ? "next" : "open",
    decisionDone ? "done" : proposalReady ? "ready" : "open",
  ];
  const completed = stepStates.map((state) => state === "done");
  const currentIndex = stepStates.findIndex((state) =>
    ["next", "review", "ready"].includes(state),
  );
  const current =
    GUIDE_STEPS[currentIndex === -1 ? GUIDE_STEPS.length - 1 : currentIndex] ?? GUIDE_STEPS[0];
  const next =
    proposalReady && !decisionDone
      ? {
          title: "Review the recommendation",
          route: "decision" as const,
          targetId: "decision-review-task",
        }
      : decisionDone
        ? {
            title: "View the recorded decision",
            route: "decision" as const,
            targetId: "decision-review-task",
          }
        : current;

  return {
    completed,
    stepStates,
    currentIndex: currentIndex === -1 ? GUIDE_STEPS.length - 1 : currentIndex,
    completedCount: completed.filter(Boolean).length,
    nextTitle: next.title,
    nextRoute: next.route,
    nextTargetId: next.targetId,
  };
}
