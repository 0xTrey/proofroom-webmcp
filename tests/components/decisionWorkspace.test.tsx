import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useStore } from "zustand";
import { describe, expect, it } from "vitest";
import { DecisionSurface } from "../../src/features/decision/DecisionSurface.tsx";
import { BuyerContextWorkspace } from "../../src/features/context/BuyerContextWorkspace.tsx";
import { PROPOSAL_TTL_MS } from "../../src/domain/invariants.ts";
import { MERIDIAN_CONTEXT_DRAFT } from "../../src/fixtures/buyer.ts";
import { registerRoomTools } from "../../src/webmcp/registerTools.ts";
import { createToolDefinitions } from "../../src/webmcp/toolDefinitions.ts";
import { createModelContextShim } from "../../src/webmcp/testShim.ts";
import type { TestRoom } from "../support/room.ts";
import { attachCanonicalEvidence, createTestRoom } from "../support/room.ts";

function DecisionHarness({ handle }: { handle: TestRoom }) {
  const room = useStore(handle.store, (value) => value.room);
  const lastError = useStore(handle.store, (value) => value.lastError);
  const context = (
    <BuyerContextWorkspace
      room={room}
      actions={handle.actions}
      lastError={lastError}
      onDismissError={handle.clearError}
    />
  );
  return (
    <DecisionSurface
      room={room}
      actions={handle.actions}
      lastError={lastError}
      context={context}
      onDismissError={handle.clearError}
    />
  );
}

function setupApprovedContext(handle: TestRoom): void {
  const staged = handle.agentActions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT);
  if (!staged.ok) throw new Error("Could not stage context");
  const approved = handle.actions.approveBuyerContext({ proposalId: staged.value.proposalId });
  if (!approved.ok) throw new Error("Could not approve context");
}

describe("ROI workspace", () => {
  it("renders the ROI workspace with editable inputs and preview", () => {
    const handle = createTestRoom();
    render(<DecisionHarness handle={handle} />);

    expect(screen.getByRole("heading", { name: "Commercial model" })).toBeVisible();
    expect(screen.getByLabelText("Campaigns per month")).toBeVisible();
    expect(screen.getByLabelText("Budget ceiling")).toBeVisible();
    expect(screen.getByRole("button", { name: "Preview calculation" })).toBeEnabled();
  });

  it("previews without changing room revision", async () => {
    const handle = createTestRoom();
    const user = userEvent.setup();
    render(<DecisionHarness handle={handle} />);

    const revisionBefore = handle.room().revision;
    await user.click(screen.getByRole("button", { name: "Preview calculation" }));

    expect(handle.room().revision).toBe(revisionBefore);
    expect(screen.getByText("Annual hours saved")).toBeVisible();
    expect(screen.getByText("1,440")).toBeVisible();
  });

  it("explains why an unchanged preview cannot be applied", async () => {
    const handle = createTestRoom();
    const user = userEvent.setup();
    render(<DecisionHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Preview calculation" }));

    expect(screen.getByRole("button", { name: "Apply reviewed assumptions" })).toBeDisabled();
    expect(
      screen.getByText(
        "No ROI assumptions changed. Edit and preview a different value before applying.",
      ),
    ).toBeVisible();
  });

  it("invalidates the preview when a field changes after preview", async () => {
    const handle = createTestRoom();
    const user = userEvent.setup();
    render(<DecisionHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Preview calculation" }));
    const budgetInput = screen.getByLabelText("Budget ceiling");
    await user.clear(budgetInput);
    await user.type(budgetInput, "90000");

    expect(screen.getByText(/draft changed after the last preview/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Apply reviewed assumptions" })).toBeDisabled();
  });

  it("applies reviewed assumptions and increments revision", async () => {
    const handle = createTestRoom();
    const user = userEvent.setup();
    render(<DecisionHarness handle={handle} />);

    const revisionBefore = handle.room().revision;
    const budgetInput = screen.getByLabelText("Budget ceiling");
    await user.clear(budgetInput);
    await user.type(budgetInput, "90000");
    await user.click(screen.getByRole("button", { name: "Preview calculation" }));
    await user.click(screen.getByRole("button", { name: "Apply reviewed assumptions" }));

    expect(handle.room().revision).toBe(revisionBefore + 1);
    expect(handle.room().roiAssumptions.budgetCeiling).toBe(90000);
  });

  it("shows the exact field error, preserves the invalid draft, and previews after correction", async () => {
    const handle = createTestRoom();
    const user = userEvent.setup();
    render(<DecisionHarness handle={handle} />);

    const campaignsInput = screen.getByLabelText("Campaigns per month");
    await user.clear(campaignsInput);
    await user.type(campaignsInput, "501");

    const error = screen.getByText("Campaigns per month must be at most 500.");
    expect(error).toBeVisible();
    expect(campaignsInput).toHaveValue(501);
    expect(campaignsInput).toHaveAttribute("aria-invalid", "true");
    expect(campaignsInput).toHaveAttribute("aria-describedby", error.id);
    expect(screen.getByRole("button", { name: "Preview calculation" })).toBeDisabled();

    await user.clear(campaignsInput);
    await user.type(campaignsInput, "20");

    expect(screen.queryByText("Campaigns per month must be at most 500.")).not.toBeInTheDocument();
    expect(campaignsInput).toHaveValue(20);
    expect(campaignsInput).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByRole("button", { name: "Preview calculation" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Preview calculation" }));
    expect(screen.getByText("1,440")).toBeVisible();
  });

  it("shows budget warning when subscription exceeds ceiling", async () => {
    const handle = createTestRoom();
    const user = userEvent.setup();
    render(<DecisionHarness handle={handle} />);

    const subInput = screen.getByLabelText("Annual subscription cost");
    await user.clear(subInput);
    await user.type(subInput, "200000");
    await user.click(screen.getByRole("button", { name: "Preview calculation" }));

    expect(screen.getByText(/exceeds the budget ceiling/i)).toBeVisible();
  });

  it("shows zero-value payback state", async () => {
    const handle = createTestRoom();
    const user = userEvent.setup();
    render(<DecisionHarness handle={handle} />);

    const campaignsInput = screen.getByLabelText("Campaigns per month");
    await user.clear(campaignsInput);
    await user.type(campaignsInput, "0");
    await user.click(screen.getByRole("button", { name: "Preview calculation" }));

    expect(screen.getByText("Not expressible")).toBeVisible();
    expect(screen.getAllByText(/monthly labor value is zero/i).length).toBeGreaterThan(0);
  });
});

describe("brief workspace", () => {
  it("refuses canonical conveniences when statuses match but one required evidence ID is missing", async () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);
    const room = handle.room();
    handle.store.setState({
      room: {
        ...room,
        requirements: room.requirements.map((requirement) =>
          requirement.id === "req_salesforce"
            ? {
                ...requirement,
                attachedEvidenceIds: requirement.attachedEvidenceIds.filter(
                  (evidenceId) => evidenceId !== "ev_002",
                ),
              }
            : requirement,
        ),
      },
    });
    const user = userEvent.setup();
    render(<DecisionHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Fill canonical honest CFO draft" }));
    expect(
      screen.getByText(/Apply the complete fictional review set on the Evaluation route/),
    ).toBeVisible();
    expect(screen.getByLabelText("Summary")).toHaveValue("");

    await user.click(screen.getByRole("button", { name: "Fill canonical not-ready draft" }));
    expect(
      screen.getByText(
        "Apply the complete fictional review set on the Evaluation route before filling the canonical decision draft.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Stage proposal" })).not.toBeInTheDocument();
  });

  it("saves a CFO brief through the page", async () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);
    const user = userEvent.setup();
    render(<DecisionHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Fill canonical honest CFO draft" }));
    await user.click(screen.getByRole("button", { name: "Save CFO brief" }));

    expect(handle.room().stakeholderBriefs.cfo).toBeDefined();
    expect(handle.room().stakeholderBriefs.cfo?.savedBy).toBe("ui");
  });

  it("saves a CISO brief and preserves the CFO brief", async () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);
    const user = userEvent.setup();
    render(<DecisionHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Fill canonical honest CFO draft" }));
    await user.click(screen.getByRole("button", { name: "Save CFO brief" }));

    await user.click(screen.getByRole("button", { name: /CISO/ }));
    await user.click(screen.getByRole("button", { name: "Fill canonical honest CISO draft" }));
    await user.click(screen.getByRole("button", { name: "Save CISO brief" }));

    expect(handle.room().stakeholderBriefs.cfo).toBeDefined();
    expect(handle.room().stakeholderBriefs.ciso).toBeDefined();
  });

  it("rejects a false proof claim in the summary", async () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);
    const user = userEvent.setup();
    render(<DecisionHarness handle={handle} />);

    const summaryInput = screen.getByLabelText("Summary");
    await user.type(summaryInput, "EU data residency is proven for this deployment.");
    const nextStepInput = screen.getByLabelText("Recommended next step");
    await user.type(nextStepInput, "Proceed with the purchase.");
    await user.click(screen.getByRole("button", { name: "Save CFO brief" }));

    expect(screen.getByText(/EVIDENCE_INSUFFICIENT/)).toBeVisible();
    expect(handle.room().stakeholderBriefs.cfo).toBeUndefined();
  });

  it("shows saved brief with origin, revision, and warnings", async () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);
    const user = userEvent.setup();
    render(<DecisionHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Fill canonical honest CFO draft" }));
    await user.click(screen.getByRole("button", { name: "Save CFO brief" }));

    const saved = document.querySelector('[data-brief-role="cfo"]') as HTMLElement | null;
    expect(saved).not.toBeNull();
    expect(saved).toBeDefined();
    expect(within(saved!).getByText("ui")).toBeVisible();
  });
});

describe("proposal desk", () => {
  it("stages a canonical not-ready proposal through the page", async () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);
    const user = userEvent.setup();
    render(<DecisionHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Fill canonical not-ready draft" }));
    await user.click(screen.getByRole("button", { name: "Stage proposal" }));

    expect(handle.room().decisionProposal).not.toBeNull();
    expect(handle.room().decisionProposal?.payload.status).toBe("not_ready");
    expect(handle.room().approvedDecision).toBeNull();
  });

  it("shows the exact proposal envelope and payload", async () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);
    const user = userEvent.setup();
    render(<DecisionHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Fill canonical not-ready draft" }));
    await user.click(screen.getByRole("button", { name: "Stage proposal" }));

    const review = screen.getByRole("article", { name: "Staged proposal" });
    expect(within(review).getAllByText(/not ready/).length).toBeGreaterThan(0);
    expect(within(review).getAllByText(/req_eu_residency/).length).toBeGreaterThan(0);
    expect(within(review).getAllByText(/req_sso/).length).toBeGreaterThan(0);
    expect(within(review).getByRole("button", { name: "Approve decision" })).toBeEnabled();
    expect(within(review).getByRole("button", { name: "Reject proposal" })).toBeEnabled();
  });

  it("refuses a ready proposal while blockers exist", async () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);
    const user = userEvent.setup();
    render(<DecisionHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Open proposal editor" }));
    const statusSelect = screen.getByLabelText("Decision status");
    await user.selectOptions(statusSelect, "ready");
    await user.type(screen.getByLabelText("Rationale"), "Everything is documented.");
    await user.type(screen.getByLabelText("Next step"), "Proceed to contract.");
    await user.click(screen.getByRole("button", { name: "Stage proposal" }));

    expect(screen.getByText(/DECISION_BLOCKED/)).toBeVisible();
    expect(handle.room().decisionProposal).toBeNull();
  });

  it("approves a pending proposal through the visible page control", async () => {
    const handle = createTestRoom();
    setupApprovedContext(handle);
    attachCanonicalEvidence(handle);
    const user = userEvent.setup();
    render(<DecisionHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Fill canonical not-ready draft" }));
    await user.click(screen.getByRole("button", { name: "Stage proposal" }));
    await user.click(screen.getByRole("button", { name: "Approve decision" }));

    expect(handle.room().approvedDecision).not.toBeNull();
    expect(handle.room().approvedDecision?.status).toBe("not_ready");
    expect(handle.room().approvedDecision?.receipt).toBeDefined();
  });

  it("rejects a proposal and reports no prior decision", async () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);
    const user = userEvent.setup();
    render(<DecisionHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Fill canonical not-ready draft" }));
    await user.click(screen.getByRole("button", { name: "Stage proposal" }));
    await user.click(screen.getByRole("button", { name: "Reject proposal" }));

    expect(handle.room().decisionProposal?.status).toBe("rejected");
    expect(handle.room().approvedDecision).toBeNull();
    expect(screen.getAllByText(/No decision has ever been approved/).length).toBeGreaterThan(0);
  });

  it("rejects a proposal and preserves a prior approved decision", async () => {
    const handle = createTestRoom();
    setupApprovedContext(handle);
    attachCanonicalEvidence(handle);
    const user = userEvent.setup();
    render(<DecisionHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Fill canonical not-ready draft" }));
    await user.click(screen.getByRole("button", { name: "Stage proposal" }));
    await user.click(screen.getByRole("button", { name: "Approve decision" }));
    expect(handle.room().approvedDecision).not.toBeNull();
    const firstReceipt = handle.room().approvedDecision?.receipt;

    await user.click(screen.getByRole("button", { name: "Fill canonical not-ready draft" }));
    await user.click(screen.getByRole("button", { name: "Stage proposal" }));
    await user.click(screen.getByRole("button", { name: "Reject proposal" }));

    expect(handle.room().decisionProposal?.status).toBe("rejected");
    expect(handle.room().approvedDecision?.receipt).toEqual(firstReceipt);
    expect(screen.getAllByText(/previously approved decision remains authoritative/).length).toBeGreaterThan(0);
  });

  it("fails stale approval without mutation", async () => {
    const handle = createTestRoom();
    setupApprovedContext(handle);
    attachCanonicalEvidence(handle);
    const user = userEvent.setup();
    render(<DecisionHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Fill canonical not-ready draft" }));
    await user.click(screen.getByRole("button", { name: "Stage proposal" }));

    handle.actions.applyRoiAssumptions({
      ...handle.room().roiAssumptions,
      budgetCeiling: 100000,
    });

    await waitFor(() => {
      expect(screen.getAllByText(/proposal is stale/i).length).toBeGreaterThan(0);
    });

    const proposalId = handle.room().decisionProposal?.id ?? "";
    const result = handle.actions.approveDecision({ proposalId });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PROPOSAL_STALE");
    }
    expect(handle.room().approvedDecision).toBeNull();
  });

  it("fails expired approval without mutation", async () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);
    const user = userEvent.setup();
    render(<DecisionHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Fill canonical not-ready draft" }));
    await user.click(screen.getByRole("button", { name: "Stage proposal" }));
    handle.clock.advance(PROPOSAL_TTL_MS + 1);

    await user.click(screen.getByRole("button", { name: "Approve decision" }));

    expect(screen.getAllByText(/PROPOSAL_EXPIRED/).length).toBeGreaterThan(0);
    expect(handle.room().approvedDecision).toBeNull();
  });

  it("renders the receipt after approval", async () => {
    const handle = createTestRoom();
    setupApprovedContext(handle);
    attachCanonicalEvidence(handle);
    const user = userEvent.setup();
    render(<DecisionHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Fill canonical not-ready draft" }));
    await user.click(screen.getByRole("button", { name: "Stage proposal" }));
    await user.click(screen.getByRole("button", { name: "Approve decision" }));

    expect(screen.getByText("Decision receipt")).toBeVisible();
    expect(screen.getAllByText(/rcp_/).length).toBeGreaterThan(0);
  });

  it("shows historical revision notice when room advances after approval", async () => {
    const handle = createTestRoom();
    setupApprovedContext(handle);
    attachCanonicalEvidence(handle);
    const user = userEvent.setup();
    render(<DecisionHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Fill canonical not-ready draft" }));
    await user.click(screen.getByRole("button", { name: "Stage proposal" }));
    await user.click(screen.getByRole("button", { name: "Approve decision" }));

    handle.actions.applyRoiAssumptions({
      ...handle.room().roiAssumptions,
      budgetCeiling: 100000,
    });

    await waitFor(() => {
      expect(screen.getAllByText(/re-evaluation/).length).toBeGreaterThan(0);
    });
  });
});

describe("WebMCP-staged proposal appears in the page", () => {
  it("shows a proposal staged through the shim in the visible review desk", async () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);
    const shim = createModelContextShim();
    await registerRoomTools(createToolDefinitions(handle.agentActions), {
      modelContext: shim.modelContext,
      signal: new AbortController().signal,
    });

    await shim.callTool("propose_decision_status", {
      status: "not_ready",
      rationale: "EU data residency cannot be proven.",
      supportingRequirementIds: ["req_salesforce", "req_soc2", "req_campaign_volume"],
      blockingRequirementIds: ["req_eu_residency", "req_sso"],
      risks: ["No EU region commitment."],
      nextStep: "Request an EU region commitment.",
    });

    render(<DecisionHarness handle={handle} />);

    const review = screen.getByRole("article", { name: "Staged proposal" });
    expect(within(review).getByText("webmcp")).toBeVisible();
    expect(screen.getByRole("button", { name: "Approve decision" })).toBeEnabled();
  });
});

describe("route feedback isolation", () => {
  it("decision feedback does not show buyer context errors", () => {
    const handle = createTestRoom();
    handle.store.setState({
      lastError: {
        code: "NOT_FOUND",
        message: "No staged buyer context",
        issues: [],
        relatedIds: ["pcx_missing"],
      },
    });
    render(<DecisionHarness handle={handle} />);

    const decisionFeedback = document.querySelector(".decision-feedback");
    expect(decisionFeedback?.textContent).toContain("Decision actions will be reported here");
    expect(decisionFeedback?.textContent).not.toContain("No staged buyer context");
  });

  it("dismisses only the decision error and preserves the brief draft", async () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);
    const user = userEvent.setup();
    render(<DecisionHarness handle={handle} />);

    const summary = screen.getByLabelText("Summary");
    await user.type(summary, "EU data residency is proven for this fictional purchase.");
    await user.type(screen.getByLabelText("Recommended next step"), "Review the fictional file.");
    await user.click(screen.getByRole("button", { name: "Save CFO brief" }));
    expect(screen.getByText(/EVIDENCE_INSUFFICIENT/)).toBeVisible();
    const beforeDismiss = structuredClone(handle.room());

    await user.click(screen.getByRole("button", { name: "Dismiss error" }));

    expect(screen.queryByText(/EVIDENCE_INSUFFICIENT/)).not.toBeInTheDocument();
    expect(summary).toHaveValue("EU data residency is proven for this fictional purchase.");
    expect(handle.room()).toEqual(beforeDismiss);
  });
});

describe("no approval or rejection tool", () => {
  it("does not expose an approval tool in the tool manifest", () => {
    const handle = createTestRoom();
    render(<DecisionHarness handle={handle} />);

    const toolNames = Array.from(document.querySelectorAll(".tool-manifest code")).map(
      (code) => code.textContent ?? "",
    );
    expect(toolNames).not.toContain("approve_decision");
    expect(toolNames).not.toContain("reject_decision");
    expect(toolNames).not.toContain("apply_roi_assumptions");
  });
});
