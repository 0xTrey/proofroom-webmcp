import { act, render, screen, within } from "@testing-library/react";
import { useStore } from "zustand";
import { describe, expect, it } from "vitest";
import { EvaluationSurface } from "../../src/features/evaluation/EvaluationSurface.tsx";
import { registerRoomTools } from "../../src/webmcp/registerTools.ts";
import { createToolDefinitions } from "../../src/webmcp/toolDefinitions.ts";
import { createModelContextShim } from "../../src/webmcp/testShim.ts";
import { createTestRoom, type TestRoom } from "../support/room.ts";

function EvaluationHarness({ handle }: { handle: TestRoom }) {
  const room = useStore(handle.store, (value) => value.room);
  const lastError = useStore(handle.store, (value) => value.lastError);

  return (
    <EvaluationSurface room={room} actions={handle.actions} lastError={lastError} />
  );
}

describe("WebMCP evaluation projection", () => {
  it("updates the visible dossier when the real attach tool mutates the shared room", async () => {
    const handle = createTestRoom();
    const shim = createModelContextShim();
    await registerRoomTools(createToolDefinitions(handle.agentActions), {
      modelContext: shim.modelContext,
      signal: new AbortController().signal,
    });
    render(<EvaluationHarness handle={handle} />);

    const salesforce = document.querySelector<HTMLElement>(
      "[data-requirement-id='req_salesforce']",
    );
    expect(salesforce).toHaveAttribute("data-requirement-status", "unknown");

    await act(async () => {
      const result = await shim.callTool("attach_evidence", {
        requirementId: "req_salesforce",
        evidenceIds: ["ev_002", "ev_003"],
      });
      expect(result.isError).toBe(false);
    });

    expect(salesforce).toHaveAttribute("data-requirement-status", "supported");
    expect(within(salesforce!).getByText("supported")).toBeVisible();
    expect(
      screen.getByRole("list", { name: "Salesforce integration attached evidence" }),
    ).toHaveTextContent("ev_002");
    expect(
      screen.getByRole("list", { name: "Salesforce integration attached evidence" }),
    ).toHaveTextContent("ev_003");
    expect(handle.room().activityLedger.at(-1)).toMatchObject({
      origin: "webmcp",
      action: "attach_evidence",
    });
  });
});
