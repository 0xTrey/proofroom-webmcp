import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useStore } from "zustand";
import { describe, expect, it } from "vitest";
import { BuyerContextWorkspace } from "../../src/features/context/BuyerContextWorkspace.tsx";
import { ProductSurface } from "../../src/features/product/ProductSurface.tsx";
import { PROPOSAL_TTL_MS } from "../../src/domain/invariants.ts";
import { buyerContextReceipt } from "../../src/domain/receipts.ts";
import { MERIDIAN_CONTEXT_DRAFT } from "../../src/fixtures/buyer.ts";
import { registerRoomTools } from "../../src/webmcp/registerTools.ts";
import { createToolDefinitions } from "../../src/webmcp/toolDefinitions.ts";
import { createModelContextShim } from "../../src/webmcp/testShim.ts";
import type { TestRoom } from "../support/room.ts";
import { createTestRoom } from "../support/room.ts";

function ProductHarness({ handle }: { handle: TestRoom }) {
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
  return <ProductSurface room={room} context={context} />;
}

function ids(selector: string, attribute: string): string[] {
  return Array.from(document.querySelectorAll(selector)).map(
    (element) => element.getAttribute(attribute) ?? "",
  );
}

describe("buyer context workspace", () => {
  it("starts with no approved context and a complete UI-only fallback", () => {
    const handle = createTestRoom();
    render(<ProductHarness handle={handle} />);

    expect(screen.getByRole("heading", { name: "No buyer context is approved." })).toBeVisible();
    expect(screen.getByText(/Buyer details are not yet shared/)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Stage fictional Meridian Bank draft" }),
    ).toBeEnabled();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Run regulated marketing campaigns",
    );
  });

  it("stages and reviews the exact canonical draft without personalizing", async () => {
    const handle = createTestRoom();
    const user = userEvent.setup();
    render(<ProductHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Stage fictional Meridian Bank draft" }));

    expect(handle.room().buyerContextProposal?.payload).toEqual(MERIDIAN_CONTEXT_DRAFT);
    expect(handle.room().buyerContextProposal?.createdBy).toBe("ui");
    expect(handle.room().approvedBuyerContext).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Run regulated marketing campaigns",
    );
    expect(ids("[data-capability-id]", "data-capability-id")).toEqual([
      "cap_campaign_workspace",
      "cap_review_routing",
      "cap_salesforce_bridge",
      "cap_access_control",
      "cap_hosting",
    ]);

    const review = screen.getByRole("article", {
      name: "Review the exact proposed buyer context.",
    });
    expect(review).toHaveAttribute("data-proposal-status", "pending");
    for (const value of [
      MERIDIAN_CONTEXT_DRAFT.companyName,
      MERIDIAN_CONTEXT_DRAFT.industry,
      MERIDIAN_CONTEXT_DRAFT.employeeBand,
      ...MERIDIAN_CONTEXT_DRAFT.personas,
      ...MERIDIAN_CONTEXT_DRAFT.priorities,
      ...MERIDIAN_CONTEXT_DRAFT.hardRequirements,
      "$120,000",
      "12 months",
      "pcx_0001",
      "Aug 26, 2026",
      "ui",
      "pending",
    ]) {
      expect(within(review).getAllByText(value, { exact: false }).length).toBeGreaterThan(0);
    }
    expect(within(review).getByText("Base revision").nextElementSibling).toHaveTextContent("1");
    expect(within(review).getByText("Current room revision").nextElementSibling).toHaveTextContent(
      "1",
    );
    expect(within(review).getByText("Digest").nextElementSibling?.textContent).toMatch(
      /^[0-9a-f]{16}$/,
    );
    expect(within(review).getByRole("button", { name: "Approve buyer context" })).toBeEnabled();
    expect(within(review).getByRole("button", { name: "Reject proposal" })).toBeEnabled();
  });

  it("stages through the real shim, then approves only through rendered UI", async () => {
    const handle = createTestRoom();
    const shim = createModelContextShim();
    await registerRoomTools(createToolDefinitions(handle.agentActions), {
      modelContext: shim.modelContext,
      signal: new AbortController().signal,
    });
    await shim.callTool("propose_buyer_context", MERIDIAN_CONTEXT_DRAFT);

    const user = userEvent.setup();
    render(<ProductHarness handle={handle} />);
    expect(shim.has("approve_buyer_context")).toBe(false);
    expect(screen.getByText("webmcp", { exact: true })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Approve buyer context" }));

    expect(handle.room().approvedBuyerContext).toEqual(MERIDIAN_CONTEXT_DRAFT);
    expect(screen.getByRole("heading", { name: "Meridian Bank context is buyer-approved." })).toBeVisible();
    expect(screen.getByText("Buyer-approved context applied")).toBeVisible();
    expect(screen.getByText(/Approved pcx_0001/)).toBeVisible();
    expect(screen.getAllByText("rcp_0003")).not.toHaveLength(0);
    expect(screen.getAllByText("pcx_0001")).not.toHaveLength(0);
    expect(screen.getAllByText("2", { exact: true }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Buyer context approved in the page at revision 2/)).not.toHaveLength(
      0,
    );

    expect(ids("[data-capability-id]", "data-capability-id").slice(0, 3)).toEqual([
      "cap_salesforce_bridge",
      "cap_hosting",
      "cap_access_control",
    ]);
    expect(ids("[data-evidence-id]", "data-evidence-id")).toEqual([
      "ev_002",
      "ev_007",
      "ev_006",
      "ev_004",
    ]);
    expect(ids("[data-package-id]", "data-package-id")).toEqual([
      "pkg_enterprise",
      "pkg_team",
    ]);
    expect(screen.getByText(/Requirement status: unknown/)).toBeVisible();
    expect(screen.getByText(/catalog does not prove EU residency/)).toBeVisible();
  });

  it("explains that baseline ordering remains when no context has ever been approved", async () => {
    const handle = createTestRoom();
    expect(handle.actions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT).ok).toBe(true);
    const user = userEvent.setup();
    render(<ProductHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Reject proposal" }));

    const resolution =
      "Rejected pcx_0001. No buyer context has ever been approved, so baseline product ordering remains in place.";
    expect(screen.getAllByText(resolution, { exact: true })).toHaveLength(2);
    expect(handle.room().buyerContextProposal?.status).toBe("rejected");
    expect(handle.room().approvedBuyerContext).toBeNull();
    expect(handle.room().approvedBuyerContextReceipt).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Run regulated marketing campaigns",
    );
    expect(ids("[data-capability-id]", "data-capability-id")).toEqual([
      "cap_campaign_workspace",
      "cap_review_routing",
      "cap_salesforce_bridge",
      "cap_access_control",
      "cap_hosting",
    ]);
    expect(screen.queryByRole("button", { name: "Reject proposal" })).not.toBeInTheDocument();
  });

  it("rejects a new proposal without changing previously approved context or receipt", async () => {
    const handle = createTestRoom();
    const first = handle.actions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT);
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    const approved = handle.actions.approveBuyerContext({ proposalId: first.value.proposalId });
    expect(approved.ok).toBe(true);
    if (!approved.ok) {
      return;
    }

    const changedDraft = { ...MERIDIAN_CONTEXT_DRAFT, companyName: "Meridian Review Team" };
    expect(handle.agentActions.proposeBuyerContext(changedDraft).ok).toBe(true);
    const user = userEvent.setup();
    render(<ProductHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Reject proposal" }));

    expect(handle.room().buyerContextProposal?.status).toBe("rejected");
    expect(handle.room().approvedBuyerContext).toEqual(MERIDIAN_CONTEXT_DRAFT);
    expect(handle.room().approvedBuyerContextReceipt).toEqual(approved.value.receipt);
    expect(buyerContextReceipt(handle.room())).toEqual(approved.value.receipt);
    const resolution =
      "Rejected pcx_0003. The previously approved buyer context remains authoritative, and its personalization remains in place.";
    expect(screen.getAllByText(resolution, { exact: true })).toHaveLength(2);
    expect(ids("[data-capability-id]", "data-capability-id").slice(0, 3)).toEqual([
      "cap_salesforce_bridge",
      "cap_hosting",
      "cap_access_control",
    ]);
    expect(ids("[data-package-id]", "data-package-id")[0]).toBe("pkg_enterprise");
    expect(screen.queryByRole("button", { name: "Reject proposal" })).not.toBeInTheDocument();
  });

  it("surfaces a stale approval failure and leaves the room atomic", async () => {
    const handle = createTestRoom();
    expect(handle.agentActions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT).ok).toBe(true);
    expect(
      handle.agentActions.attachEvidence({
        requirementId: "req_salesforce",
        evidenceIds: ["ev_002"],
      }).ok,
    ).toBe(true);
    const before = structuredClone(handle.room());
    const user = userEvent.setup();
    render(<ProductHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Approve buyer context" }));

    expect(screen.getByText(/PROPOSAL_STALE/)).toBeVisible();
    expect(handle.room()).toEqual(before);
    expect(handle.room().approvedBuyerContext).toBeNull();
  });

  it("dismisses only the context error and preserves the staged proposal", async () => {
    const handle = createTestRoom();
    expect(handle.agentActions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT).ok).toBe(true);
    expect(
      handle.agentActions.attachEvidence({
        requirementId: "req_salesforce",
        evidenceIds: ["ev_002"],
      }).ok,
    ).toBe(true);
    const beforeFailure = structuredClone(handle.room());
    const user = userEvent.setup();
    render(<ProductHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Approve buyer context" }));
    expect(screen.getByText(/PROPOSAL_STALE/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Dismiss error" }));

    expect(screen.queryByText(/PROPOSAL_STALE/)).not.toBeInTheDocument();
    expect(handle.room()).toEqual(beforeFailure);
    expect(handle.room().buyerContextProposal?.payload).toEqual(MERIDIAN_CONTEXT_DRAFT);
    expect(screen.getByRole("button", { name: "Approve buyer context" })).toBeEnabled();
  });

  it("surfaces an expired approval failure and leaves the room atomic", async () => {
    const handle = createTestRoom();
    expect(handle.agentActions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT).ok).toBe(true);
    handle.clock.advance(PROPOSAL_TTL_MS + 1);
    const before = structuredClone(handle.room());
    const user = userEvent.setup();
    render(<ProductHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Approve buyer context" }));

    expect(screen.getByText(/PROPOSAL_EXPIRED/)).toBeVisible();
    expect(screen.getByText(/Ask for a new one/)).toBeVisible();
    expect(handle.room()).toEqual(before);
  });

  it("surfaces a missing proposal failure without changing the room", () => {
    const handle = createTestRoom();
    const before = structuredClone(handle.room());
    const result = handle.actions.approveBuyerContext({ proposalId: "pcx_missing" });
    expect(result.ok).toBe(false);

    render(<ProductHarness handle={handle} />);
    expect(screen.getByText(/NOT_FOUND/)).toBeVisible();
    expect(screen.getByText(/There is no staged proposal/)).toBeVisible();
    expect(handle.room()).toEqual(before);
  });

  it("surfaces a tampered proposal failure and leaves the failed action atomic", async () => {
    const handle = createTestRoom();
    expect(handle.agentActions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT).ok).toBe(true);
    const proposal = handle.room().buyerContextProposal;
    expect(proposal).not.toBeNull();
    handle.store.setState((value) => ({
      room: {
        ...value.room,
        buyerContextProposal: proposal
          ? {
              ...proposal,
              payload: { ...proposal.payload, companyName: "Tampered name" },
            }
          : null,
      },
    }));
    const before = structuredClone(handle.room());
    const user = userEvent.setup();
    render(<ProductHarness handle={handle} />);

    await user.click(screen.getByRole("button", { name: "Approve buyer context" }));

    expect(screen.getByText(/INVALID_INPUT/)).toBeVisible();
    expect(handle.room()).toEqual(before);
    expect(handle.room().approvedBuyerContext).toBeNull();
  });

  it("renders a resolved failure safely and removes decision controls", () => {
    const handle = createTestRoom();
    const staged = handle.actions.proposeBuyerContext(MERIDIAN_CONTEXT_DRAFT);
    expect(staged.ok).toBe(true);
    if (!staged.ok) {
      return;
    }
    expect(handle.actions.approveBuyerContext({ proposalId: staged.value.proposalId }).ok).toBe(true);
    const before = structuredClone(handle.room());
    const again = handle.actions.approveBuyerContext({ proposalId: staged.value.proposalId });
    expect(again.ok).toBe(false);

    render(<ProductHarness handle={handle} />);
    expect(screen.getByText(/PROPOSAL_RESOLVED/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Approve buyer context" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject proposal" })).not.toBeInTheDocument();
    expect(handle.room()).toEqual(before);
  });
});
