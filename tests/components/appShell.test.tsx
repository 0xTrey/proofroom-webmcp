import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
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
    expect(screen.getByText("This is fictional demo content")).toBeInTheDocument();
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
    expect(screen.getByRole("heading", { name: /6 requirements, 12 evidence records/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Decision" }));
    expect(screen.getByRole("heading", { name: "Commercial model" })).toBeInTheDocument();
    expect(screen.getByText("get_room_state")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Product" }));
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("shows every requirement with a word, not color alone", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Evaluation" }));

    expect(screen.getAllByText("unknown")).toHaveLength(6);
    expect(screen.getByText("EU data residency")).toBeInTheDocument();
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
