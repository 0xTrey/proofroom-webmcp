import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { AgentActions } from "../../src/domain/actions/index.ts";
import {
  useWebMcpTools,
  type WebMcpController,
} from "../../src/webmcp/useWebMCPTools.ts";
import {
  createModelContextShim,
  type ModelContextShimOptions,
} from "../../src/webmcp/testShim.ts";
import { createTestRoom } from "../support/room.ts";

function RegistrationHarness({
  actions,
  onStatus,
}: {
  actions: AgentActions;
  onStatus?: (status: WebMcpController) => void;
}) {
  const status = useWebMcpTools(actions);
  onStatus?.(status);
  return (
    <div>
      <p>{status.phase}</p>
      <p>{status.message}</p>
      {status.phase === "partial" || status.phase === "error" ? (
        <button type="button" onClick={status.retry}>
          Retry agent tools
        </button>
      ) : null}
    </div>
  );
}

describe("WebMCP registration retry", () => {
  it("cleans up a failed attempt, retries successfully, and registers exactly nine names", async () => {
    const handle = createTestRoom();
    const options: ModelContextShimOptions = { failAll: true };
    const shim = createModelContextShim(options);
    const restore = shim.install();
    const before = structuredClone(handle.room());
    const user = userEvent.setup();
    const view = render(<RegistrationHarness actions={handle.agentActions} />);

    await screen.findByText("error");
    expect(shim.toolNames()).toHaveLength(0);
    options.failAll = false;
    await user.click(screen.getByRole("button", { name: "Retry agent tools" }));

    await screen.findByText("registered");
    expect(screen.getByText("9 agent tools are registered on this page.")).toBeVisible();
    expect(shim.toolNames()).toHaveLength(9);
    expect(new Set(shim.toolNames()).size).toBe(9);
    expect(handle.room()).toEqual(before);

    view.unmount();
    expect(shim.toolNames()).toHaveLength(0);
    restore();
  });

  it("cleans up before repeated partial retries and never duplicates healthy tools", async () => {
    const handle = createTestRoom();
    const options: ModelContextShimOptions = { failingToolNames: ["calculate_roi"] };
    const shim = createModelContextShim(options);
    const restore = shim.install();
    const before = structuredClone(handle.room());
    const user = userEvent.setup();
    render(<RegistrationHarness actions={handle.agentActions} />);

    await screen.findByText("partial");
    expect(shim.toolNames()).toHaveLength(8);
    expect(new Set(shim.toolNames()).size).toBe(8);

    await user.click(screen.getByRole("button", { name: "Retry agent tools" }));
    await waitFor(() => expect(screen.getByText("partial")).toBeVisible());
    expect(screen.getByText(/8 of 9 agent tools registered/)).toBeVisible();
    expect(shim.toolNames()).toHaveLength(8);
    expect(new Set(shim.toolNames()).size).toBe(8);
    expect(handle.room()).toEqual(before);
    restore();
  });
});
