import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RoomGuide } from "../../src/app/RoomGuide.tsx";
import { deriveRoomGuideState } from "../../src/app/roomGuideState.ts";
import type {
  ApprovedDecision,
  DecisionProposal,
  StakeholderBrief,
} from "../../src/domain/types.ts";
import { MERIDIAN_CONTEXT_DRAFT } from "../../src/fixtures/buyer.ts";
import { createTestRoom } from "../support/room.ts";

describe("room guide", () => {
  it("derives the next move from canonical room state", () => {
    const handle = createTestRoom();
    expect(deriveRoomGuideState(handle.room())).toMatchObject({
      completedCount: 0,
      nextTitle: "Set the buying priorities",
      nextRoute: "product",
    });

    const staged = handle.actions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT);
    expect(staged.ok).toBe(true);
    if (!staged.ok) {
      return;
    }
    expect(handle.actions.approveBuyerContext({ proposalId: staged.value.proposalId }).ok).toBe(
      true,
    );

    expect(deriveRoomGuideState(handle.room())).toMatchObject({
      completedCount: 1,
      nextTitle: "Check the vendor's evidence",
      nextRoute: "evaluation",
    });
  });

  it("exposes all four moves as keyboard-operable route controls", async () => {
    const handle = createTestRoom();
    const onNavigate = vi.fn();
    const onNavigateTask = vi.fn();
    const user = userEvent.setup();
    render(
      <RoomGuide
        room={handle.room()}
        onNavigate={onNavigate}
        onNavigateTask={onNavigateTask}
      />,
    );

    expect(screen.getByText("0 of 4 steps complete")).toBeVisible();
    const nextMove = screen.getByRole("button", { name: /Go to: Set the buying priorities/ });
    nextMove.focus();
    await user.keyboard("{Enter}");
    expect(onNavigateTask).toHaveBeenCalledWith("product", "buyer-context-task");
    expect(within(screen.getByRole("list", { name: "Room steps" })).getAllByRole("button")).toHaveLength(
      4,
    );
    expect(screen.getByText("All four steps").closest("details")).not.toHaveAttribute("open");
  });

  it("never treats preparation artifacts as proof of human review", () => {
    const handle = createTestRoom();
    const withBriefs = structuredClone(handle.room());
    withBriefs.stakeholderBriefs.cfo = {} as StakeholderBrief;
    withBriefs.stakeholderBriefs.ciso = {} as StakeholderBrief;

    expect(deriveRoomGuideState(withBriefs).stepStates[2]).not.toBe("done");

    const withProposal = structuredClone(handle.room());
    withProposal.decisionProposal = { status: "pending" } as DecisionProposal;
    expect(deriveRoomGuideState(withProposal)).toMatchObject({
      nextTitle: "Review the recommendation",
      nextRoute: "decision",
      nextTargetId: "decision-review-task",
    });
    expect(deriveRoomGuideState(withProposal).stepStates).toEqual([
      "next",
      "open",
      "review",
      "ready",
    ]);
  });

  it("marks human review and decision done only after final approval", () => {
    const handle = createTestRoom();
    const approved = structuredClone(handle.room());
    approved.approvedDecision = {} as ApprovedDecision;

    expect(deriveRoomGuideState(approved).stepStates.slice(2)).toEqual(["done", "done"]);
  });

  it("renders the orientation line without changing guide state derivation", () => {
    const handle = createTestRoom();
    const before = deriveRoomGuideState(handle.room());

    render(
      <RoomGuide
        room={handle.room()}
        onNavigate={() => undefined}
        onNavigateTask={() => undefined}
      />,
    );

    expect(screen.getByText("Priorities -> evidence -> person decides")).toBeInTheDocument();
    expect(deriveRoomGuideState(handle.room())).toEqual(before);
  });
});
