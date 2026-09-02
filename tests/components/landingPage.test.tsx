import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../src/app/App.tsx";
import { createTestRoom } from "../support/room.ts";

describe("landing page plain language", () => {
  beforeEach(() => {
    globalThis.history.replaceState(null, "", "/");
    localStorage.clear();
  });

  it("explains the product, EU example, and person-only final decision in the first viewport", () => {
    render(<App />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Check a software vendor's claims before you buy.",
    );
    expect(screen.getByText(/teams buying business software/)).toBeInTheDocument();
    expect(
      screen.getByText("Does this product keep our customer data in the EU?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Unknown: not proven by the available records."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Ask the vendor for an EU region commitment before approving the purchase.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/You approve the priorities and make the final call/)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: /buyer requirements become a human-approved decision/i })).toBeInTheDocument();
    expect(screen.getByText("Set priorities")).toBeInTheDocument();
    expect(screen.getByText("The buyer chooses what matters.")).toBeInTheDocument();
    expect(screen.getByText("Check evidence")).toBeInTheDocument();
    expect(screen.getByText("The agent matches claims to source records.")).toBeInTheDocument();
    expect(screen.getByText("Approve the decision")).toBeInTheDocument();
    expect(screen.getByText("Only the person can make it final.")).toBeInTheDocument();
  });

  it("shows the rehearsal prompt, person-only stop, and unchanged primary CTA target", () => {
    render(<App />);

    const primaryCta = screen.getAllByRole("link", { name: /Open the fictional review/ })[0]!;
    expect(primaryCta).toHaveAttribute("href", "#product");

    const rehearsal = screen.getByText("Try the browser-agent path").closest("details");
    expect(rehearsal).not.toHaveAttribute("open");
    expect(screen.getByText(/Do not approve the buyer profile or a final decision/)).toBeInTheDocument();
    expect(screen.getByText(/Stop when a person must review/)).toBeInTheDocument();
    expect(
      screen.getByText(/Natural-language tool selection has not been verified in this repository/),
    ).toBeInTheDocument();
  });

  it("opens and closes the rehearsal panel without mutating room state", async () => {
    const handle = createTestRoom();
    const beforeRevision = handle.room().revision;
    const beforeLedger = handle.room().activityLedger.length;
    localStorage.setItem("proofroom.room.v1", JSON.stringify(handle.room()));

    const user = userEvent.setup();
    render(<App />);

    const rehearsal = screen.getByText("Try the browser-agent path").closest("details")!;
    await user.click(screen.getByText("Try the browser-agent path"));
    expect(rehearsal).toHaveAttribute("open");
    expect(handle.room().revision).toBe(beforeRevision);
    expect(handle.room().activityLedger.length).toBe(beforeLedger);

    await user.click(screen.getByText("Try the browser-agent path"));
    expect(rehearsal).not.toHaveAttribute("open");
    expect(handle.room().revision).toBe(beforeRevision);
    expect(localStorage.getItem("proofroom.room.v1")).toBe(JSON.stringify(handle.room()));
  });

  it("enters #product from the hero without mutating room state or local storage", async () => {
    const handle = createTestRoom();
    const beforeRevision = handle.room().revision;
    const beforeLedger = handle.room().activityLedger.length;
    localStorage.setItem("proofroom.room.v1", JSON.stringify(handle.room()));

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("link", { name: /Open the fictional review/ })[0]!);

    expect(globalThis.location.hash).toBe("#product");
    expect(handle.room().revision).toBe(beforeRevision);
    expect(handle.room().activityLedger.length).toBe(beforeLedger);
    expect(localStorage.getItem("proofroom.room.v1")).toBe(JSON.stringify(handle.room()));
  });

  it("repeated CTA after the evidence section enters #product without mutation", async () => {
    const handle = createTestRoom();
    const beforeRevision = handle.room().revision;
    localStorage.setItem("proofroom.room.v1", JSON.stringify(handle.room()));

    const user = userEvent.setup();
    render(<App />);

    const links = screen.getAllByRole("link", { name: /Open the fictional review/ });
    expect(links).toHaveLength(2);
    await user.click(links[1]!);

    expect(globalThis.location.hash).toBe("#product");
    expect(handle.room().revision).toBe(beforeRevision);
    expect(localStorage.getItem("proofroom.room.v1")).toBe(JSON.stringify(handle.room()));
  });

  it("does not use prohibited technical phrases in primary landing copy", () => {
    render(<App />);

    const prohibited = [
      "buyer context",
      "canonical",
      "deterministic",
      "authoritative",
      "dossier",
      "structured action",
      "artifact",
      "payload",
      "proposal envelope",
      "diligence file",
    ];
    const hero = document.querySelector(".landing-hero");
    const workflow = document.getElementById("how-it-works");
    expect(hero).not.toBeNull();
    expect(workflow).not.toBeNull();
    const primaryText = `${hero?.textContent ?? ""} ${workflow?.textContent ?? ""}`.toLowerCase();
    for (const phrase of prohibited) {
      expect(primaryText).not.toContain(phrase);
    }
  });
});
