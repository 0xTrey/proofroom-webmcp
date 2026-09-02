import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ActivityLedger } from "../../src/features/ledger/ActivityLedger.tsx";
import { MERIDIAN_CONTEXT_DRAFT } from "../../src/fixtures/buyer.ts";
import { createTestRoom } from "../support/room.ts";

describe("activity ledger workspace", () => {
  it("renders every required safe event field with exact readable labels", () => {
    const handle = createTestRoom();
    expect(handle.agentActions.getRoomState({ detail: "requirements" }).ok).toBe(true);
    const before = structuredClone(handle.room());
    render(<ActivityLedger room={handle.room()} />);

    const row = document.querySelector('[data-event-id="evt_0002"]');
    expect(row).not.toBeNull();
    expect(row).toHaveTextContent("#2");
    expect(row).toHaveTextContent("evt_0002");
    expect(row).toHaveTextContent("2026-08-26T12:00:00.000Z");
    expect(row).toHaveTextContent("Agent");
    expect(row).toHaveTextContent("get_room_state");
    expect(row).toHaveTextContent("product");
    expect(row).toHaveTextContent("Read");
    expect(row).toHaveTextContent("0 → 0");
    expect(row).toHaveTextContent("ok");
    expect(row).toHaveTextContent("Read room state with detail requirements.");
    expect(row).toHaveTextContent("northstar_meridian_room");
    expect(row?.textContent).toMatch(/[0-9a-f]{16}/);
    expect(handle.room()).toEqual(before);
  });

  it("combines filters and shows an honest empty state without room mutation", async () => {
    const handle = createTestRoom();
    expect(handle.agentActions.getRoomState().ok).toBe(true);
    expect(handle.actions.calculateRoi(handle.room().roiAssumptions).ok).toBe(true);
    const before = structuredClone(handle.room());
    const user = userEvent.setup();
    render(<ActivityLedger room={handle.room()} />);

    await user.selectOptions(screen.getByLabelText("Origin"), "ui");
    await user.selectOptions(screen.getByLabelText("Kind"), "read");
    await user.selectOptions(screen.getByLabelText("Panel"), "roi");

    expect(screen.getByText(/Showing 1 of 1 filtered events/)).toBeVisible();
    expect(screen.getAllByText("calculate_roi")).toHaveLength(2);
    expect(screen.queryByText("get_room_state")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Panel"), "briefs");
    expect(screen.getByRole("heading", { name: "No ledger events match these filters." })).toBeVisible();
    expect(screen.getByText(/Showing 0 of 0 filtered events/)).toBeVisible();
    expect(handle.room()).toEqual(before);
  });

  it("renders twenty-five rows, reveals the next page, and keeps accessible mobile labels", async () => {
    const handle = createTestRoom();
    for (let index = 0; index < 30; index += 1) {
      expect(handle.agentActions.getRoomState().ok).toBe(true);
    }
    const user = userEvent.setup();
    render(<ActivityLedger room={handle.room()} />);

    const table = screen.getByRole("table", {
      name: "Official room activity, newest event first",
    });
    expect(within(table).getAllByRole("row")).toHaveLength(26);
    expect(screen.getByText(/Showing 25 of 31 filtered events/)).toBeVisible();
    expect(table.querySelector('td[data-label="UTC timestamp"]')).not.toBeNull();
    expect(table.querySelector('td[data-label="Safe detail"]')).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Show 25 more" }));
    expect(within(table).getAllByRole("row")).toHaveLength(32);
    expect(screen.getByText(/Showing 31 of 31 filtered events/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Show 25 more" })).not.toBeInTheDocument();
  });

  it("never renders raw buyer or brief strings in a ledger row", () => {
    const handle = createTestRoom();
    const sensitiveBuyer = "Fictional Private Buyer Phrase 204";
    const sensitiveBrief = "Fictional Private Brief Phrase 991";
    expect(
      handle.agentActions.proposeBuyerContext({
        ...MERIDIAN_CONTEXT_DRAFT,
        companyName: sensitiveBuyer,
      }).ok,
    ).toBe(true);
    expect(
      handle.agentActions.saveStakeholderBrief({
        role: "cfo",
        summary: `${sensitiveBrief} is restricted fictional context.`,
        evidenceIds: [],
        risks: [],
        openQuestions: [],
        nextStep: `Review ${sensitiveBrief} with the fictional committee.`,
      }).ok,
    ).toBe(true);

    render(<ActivityLedger room={handle.room()} />);
    expect(screen.queryByText(sensitiveBuyer, { exact: false })).not.toBeInTheDocument();
    expect(screen.queryByText(sensitiveBrief, { exact: false })).not.toBeInTheDocument();
  });
});
