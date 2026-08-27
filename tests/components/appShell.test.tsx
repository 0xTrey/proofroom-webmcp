import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../src/app/App.tsx";
import { AppShell } from "../../src/app/AppShell.tsx";
import { initialStatus } from "../../src/webmcp/useWebMCPTools.ts";

describe("application shell", () => {
  it("starts with one primary headline and no eyebrow stack", () => {
    render(<App />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent).toContain("regulated marketing campaigns");
  });

  it("labels the demo content as fictional", () => {
    render(<App />);
    expect(screen.getByText("Fictional demonstration")).toBeInTheDocument();
    expect(screen.getByText(/Northstar is a fictional vendor/)).toBeInTheDocument();
  });

  it("explains the unavailable agent tool state without hiding controls", () => {
    render(<App />);
    expect(screen.getByText(/Agent tools are not available in this browser/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Evaluation" })).toBeEnabled();
  });

  it("moves between the three surfaces", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Evaluation" }));
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Six requirements. Evidence must earn the answer.",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Decision" }));
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "The agent can stage the case. Only a person can decide.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("get_room_state")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Product" }));
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders one primary headline on every surface", async () => {
    const user = userEvent.setup();
    render(<App />);

    for (const route of ["Product", "Evaluation", "Decision"]) {
      await user.click(screen.getByRole("button", { name: route }));
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    }
  });

  it("shows every requirement with a word, not color alone", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Evaluation" }));

    const register = screen.getByRole("list", { name: "Six requirement records" });
    expect(within(register).getAllByText("unknown")).toHaveLength(6);
    expect(screen.getByText("EU data residency")).toBeInTheDocument();
  });

  it("shows all twelve evidence records with provenance labels", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Evaluation" }));

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
        }}
        revision={4}
        storageStatus="ok"
      >
        <p>room</p>
      </AppShell>,
    );

    expect(screen.getByText(/1 of 9 agent tools registered/)).toBeInTheDocument();
    expect(screen.getByText("agent tools partial")).toBeInTheDocument();
    expect(screen.getByText(/revision 004/)).toBeInTheDocument();
  });
});
