import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../src/app/App.tsx";
import { AppShell } from "../../src/app/AppShell.tsx";
import { initialStatus } from "../../src/webmcp/useWebMCPTools.ts";

describe("application shell", () => {
  beforeEach(() => {
    globalThis.history.replaceState(null, "", "/");
  });

  it("starts with one primary headline and no eyebrow stack", () => {
    render(<App />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Check a software vendor's claims before you buy.");
  });

  it("defines the product and labels browser-local fictional content", () => {
    render(<App />);
    expect(screen.getByText(/workspace for teams buying business software/)).toBeInTheDocument();
    expect(screen.getByText(/nine built-in actions/)).toBeInTheDocument();
    expect(screen.getByText(/Northstar, Meridian Bank/)).toBeInTheDocument();
    expect(screen.getByText(/There is no account, database, telemetry/)).toBeInTheDocument();
  });

  it("explains unavailable agent actions while keeping the room accessible", () => {
    render(<App />);
    expect(screen.getByText(/Agent tools are not available in this browser/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Open the fictional review/ })[0]).toHaveAttribute(
      "href",
      "#product",
    );
    expect(screen.queryByRole("button", { name: "Retry agent tools" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reset demo" })).not.toBeInTheDocument();
  });

  it("moves between the three surfaces", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("link", { name: /Open the fictional review/ })[0]!);
    expect(screen.getByRole("heading", { level: 2, name: "Room guide" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Reset demo" })[0]).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Check evidence" }));
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Check six buying requirements against the vendor's evidence.",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Review decision" }));
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Review the recommendation, then make the final call.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("get_room_state")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Set priorities" }));
    expect(screen.getByRole("heading", { level: 1, name: "Start with what Meridian Bank needs." })).toBeInTheDocument();
  });

  it("renders one primary headline on every surface", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    await user.click(screen.getAllByRole("link", { name: /Open the fictional review/ })[0]!);

    for (const route of ["Set priorities", "Check evidence", "Review decision"]) {
      await user.click(screen.getByRole("button", { name: route }));
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    }
  });

  it("shows every requirement with a word, not color alone", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole("link", { name: /Open the fictional review/ })[0]!);
    await user.click(screen.getByRole("button", { name: "Check evidence" }));

    const register = screen.getByRole("list", { name: "Six requirement records" });
    expect(within(register).getAllByText("unknown")).toHaveLength(6);
    expect(screen.getByRole("heading", { name: "EU data residency" })).toBeVisible();
    expect(
      within(register).getByRole("button", { name: /EU data residency/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("shows all twelve evidence records with provenance labels", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole("link", { name: /Open the fictional review/ })[0]!);
    await user.click(screen.getByRole("button", { name: "Check evidence" }));

    expect(screen.getAllByText(/^ev_0/)).toHaveLength(12);
    expect(screen.getAllByText("Untrusted text")).toHaveLength(2);
    expect(screen.getByText("Hosting regions and data handling note")).toBeInTheDocument();
  });

  it("announces the registration state in a live region", () => {
    render(
      <AppShell
        route="product"
        onNavigate={() => undefined}
        status={{
          ...initialStatus(true),
          phase: "partial",
          registeredToolNames: ["get_room_state"],
          failures: [{ name: "attach_evidence", message: "rejected" }],
          message: "1 of 9 agent tools registered.",
          retry: () => undefined,
        }}
        revision={4}
        storageStatus="ok"
        onRequestReset={() => undefined}
      >
        <p>room</p>
      </AppShell>,
    );

    expect(screen.getAllByText(/1 of 9 agent tools registered/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("agent tools partial").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/revision 004/).length).toBeGreaterThan(0);
    expect(screen.getByText(/browser-agent actions/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Retry agent tools" })[0]).toBeEnabled();
  });
});
