import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../src/app/App.tsx";

const PROHIBITED = [
  "buyer context",
  "proposal envelope",
  "diligence file",
  "deterministic evaluation",
  "authoritative activity",
  "authoritative ledger",
  "canonical values",
  "canonical fill",
  "fictional review set",
  "stage work",
  "stage a proposal",
  "stage proposal",
  "staged at revision",
  "remains authoritative",
] as const;

const ROUTES = ["Set priorities", "Check evidence", "Review decision"] as const;

function visibleInstructionText(): string {
  const selectors = [
    "h1",
    "h2",
    "h3",
    "p",
    "button",
    "label",
    "summary",
    "caption",
    ".context-feedback",
    ".proposal-desk__head",
    ".roi-workspace__hint",
    ".activity-ledger__head",
    ".tool-manifest",
  ];
  return selectors
    .flatMap((selector) =>
      Array.from(document.querySelectorAll(selector)).map((node) => node.textContent ?? ""),
    )
    .join(" ")
    .toLowerCase();
}

describe("plain-language instructional copy", () => {
  beforeEach(() => {
    globalThis.history.replaceState(null, "", "/");
    localStorage.clear();
  });

  it.each(ROUTES)("avoids prohibited phrases on %s", async (route) => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole("link", { name: /Open the fictional review/ })[0]!);
    await user.click(screen.getByRole("button", { name: route }));

    const text = visibleInstructionText();
    for (const phrase of PROHIBITED) {
      expect(text).not.toContain(phrase);
    }
  });

  it("keeps exact tool identifiers in the technical manifest", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole("link", { name: /Open the fictional review/ })[0]!);
    await user.click(screen.getByRole("button", { name: "Review decision" }));

    expect(screen.getByRole("heading", { name: "How the browser agent connects" })).toBeVisible();
    expect(screen.getByText("stage_requirement")).toBeInTheDocument();
    expect(screen.getByText("propose_buyer_context")).toBeInTheDocument();
    expect(screen.getAllByText("prepare work").length).toBeGreaterThanOrEqual(5);
  });
});
