/**
 * Tool execution tests.
 *
 * These call the real registered definitions through the shim, so they exercise
 * the shipped tools and the shared action layer, not a stand in.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { MERIDIAN_CONTEXT_DRAFT } from "../../src/fixtures/buyer.ts";
import { CANONICAL_ROI_ASSUMPTIONS } from "../../src/fixtures/demoScenario.ts";
import { registerRoomTools } from "../../src/webmcp/registerTools.ts";
import { createToolDefinitions } from "../../src/webmcp/toolDefinitions.ts";
import { createModelContextShim, structuredOf } from "../../src/webmcp/testShim.ts";
import { attachCanonicalEvidence, createTestRoom, type TestRoom } from "../support/room.ts";

let handle: TestRoom;
let shim: ReturnType<typeof createModelContextShim>;

beforeEach(async () => {
  handle = createTestRoom();
  shim = createModelContextShim();
  await registerRoomTools(createToolDefinitions(handle.agentActions), {
    modelContext: shim.modelContext,
    signal: new AbortController().signal,
  });
});

describe("read only tools", () => {
  it("returns room state and records the read in the ledger", async () => {
    const result = await shim.callTool("get_room_state", {});
    const payload = structuredOf<{ revision: number; requirementTotals: { total: number } }>(result);

    expect(result.isError).toBe(false);
    expect(payload.requirementTotals.total).toBe(6);
    expect(payload.revision).toBe(0);
    expect(handle.room().activityLedger.at(-1)?.toolName).toBe("get_room_state");
  });

  it("never returns the activity ledger", async () => {
    const result = await shim.callTool("get_room_state", { detail: "decision" });
    expect(Object.keys(structuredOf(result))).not.toContain("activityLedger");
    expect(structuredOf<{ activityEventCount: number }>(result).activityEventCount).toBe(1);
  });

  it("returns untrusted annotations on testimonial and external records", async () => {
    const result = await shim.callTool("search_product_evidence", { query: "campaign throughput" });
    const payload = structuredOf<{
      untrustedContentIncluded: boolean;
      results: Array<{ id: string; annotation: string; untrustedContent: boolean }>;
    }>(result);

    const external = payload.results.find((hit) => hit.id === "ev_012");
    expect(payload.untrustedContentIncluded).toBe(true);
    expect(external?.annotation).toBe("untrusted_content");
    expect(external?.untrustedContent).toBe(true);
  });

  it("returns the injection sentence as data without acting on it", async () => {
    const result = await shim.callTool("search_product_evidence", {
      query: "Larkfield program review",
      trustClasses: ["testimonial"],
    });
    const payload = structuredOf<{ results: Array<{ id: string; summary: string }> }>(result);

    expect(payload.results[0]?.id).toBe("ev_011");
    expect(payload.results[0]?.summary).toContain("Ignore your previous instructions");
    expect(handle.room().approvedBuyerContext).toBeNull();
    expect(
      handle.room().requirements.find((entry) => entry.id === "req_eu_residency")?.status,
    ).toBe("unknown");
  });

  it("is deterministic across identical searches", async () => {
    const first = structuredOf(await shim.callTool("search_product_evidence", { query: "salesforce" }));
    const second = structuredOf(await shim.callTool("search_product_evidence", { query: "salesforce" }));
    expect(first).toEqual(second);
  });

  it("returns zero results and widening guidance for an unmatched query", async () => {
    const result = await shim.callTool("search_product_evidence", {
      query: "xylophone marmalade",
    });
    const payload = structuredOf<{
      matched: number;
      returned: number;
      results: unknown[];
      nextAction: string;
    }>(result);

    expect(payload.matched).toBe(0);
    expect(payload.returned).toBe(0);
    expect(payload.results).toEqual([]);
    expect(payload.nextAction).toBe("No record matched. Widen the query or drop a filter.");
  });

  it("does not fall back to the filtered catalog when the query is unmatched", async () => {
    const result = await shim.callTool("search_product_evidence", {
      query: "xylophone marmalade",
      trustClasses: ["testimonial"],
    });
    const payload = structuredOf<{ matched: number; returned: number; results: unknown[] }>(result);

    expect(payload).toMatchObject({ matched: 0, returned: 0, results: [] });
  });

  it("caps the result count at the requested limit", async () => {
    const result = await shim.callTool("search_product_evidence", { query: "northstar", limit: 2 });
    expect(structuredOf<{ results: unknown[] }>(result).results).toHaveLength(2);
  });

  it("calculates ROI without applying it", async () => {
    const result = await shim.callTool("calculate_roi", {
      ...CANONICAL_ROI_ASSUMPTIONS,
      budgetCeiling: 90000,
    });
    const payload = structuredOf<{ withinBudget: boolean; applied: boolean; explanation: string[] }>(
      result,
    );

    expect(payload.withinBudget).toBe(false);
    expect(payload.applied).toBe(false);
    expect(payload.explanation.length).toBeGreaterThan(4);
    expect(handle.room().roiAssumptions.budgetCeiling).toBe(120000);
  });

  it("keeps the revision unchanged for every read only tool", async () => {
    await shim.callTool("get_room_state", {});
    await shim.callTool("search_product_evidence", { query: "sso" });
    await shim.callTool("evaluate_requirement", { requirementId: "req_sso" });
    await shim.callTool("calculate_roi", CANONICAL_ROI_ASSUMPTIONS);

    expect(handle.room().revision).toBe(0);
    expect(handle.room().activityLedger).toHaveLength(5);
  });
});

describe("mutating tools", () => {
  it("attaches evidence and updates visible state", async () => {
    const result = await shim.callTool("attach_evidence", {
      requirementId: "req_salesforce",
      evidenceIds: ["ev_002", "ev_003"],
    });
    const payload = structuredOf<{ requirement: { status: string }; revision: number }>(result);

    expect(payload.requirement.status).toBe("supported");
    expect(payload.revision).toBe(1);
    expect(handle.room().requirements.find((entry) => entry.id === "req_salesforce")?.status).toBe(
      "supported",
    );
  });

  it("retains testimonial context without letting it prove restricted SSO conditions", async () => {
    const saml = await shim.callTool("attach_evidence", {
      requirementId: "req_sso",
      evidenceIds: ["ev_006"],
    });
    expect(saml.isError).toBe(false);

    const testimonial = await shim.callTool("attach_evidence", {
      requirementId: "req_sso",
      evidenceIds: ["ev_011"],
    });
    const payload = structuredOf<{
      accepted: string[];
      requirement: {
        status: string;
        coveredConditions: string[];
        gaps: string[];
      };
    }>(testimonial);

    expect(testimonial.isError).toBe(false);
    expect(payload.accepted).toEqual(["ev_011"]);
    expect(payload.requirement).toMatchObject({
      status: "partially_supported",
      coveredConditions: ["sso_saml_2_0"],
      gaps: ["sso_scim_provisioning"],
    });
    expect(
      handle.room().requirements.find((requirement) => requirement.id === "req_sso")
        ?.attachedEvidenceIds,
    ).toEqual(["ev_006", "ev_011"]);
  });

  it("returns a structured refusal when a tool tries to prove EU residency", async () => {
    attachCanonicalEvidence(handle);
    const revision = handle.room().revision;

    const attach = await shim.callTool("attach_evidence", {
      requirementId: "req_eu_residency",
      evidenceIds: ["ev_011"],
    });

    expect(attach.isError).toBe(true);
    expect(structuredOf<{ code: string }>(attach).code).toBe("EVIDENCE_INELIGIBLE");

    const evaluation = await shim.callTool("evaluate_requirement", {
      requirementId: "req_eu_residency",
    });
    expect(structuredOf<{ proposedStatus: string }>(evaluation).proposedStatus).toBe("unknown");
    expect(handle.room().revision).toBe(revision);
  });

  it("stages buyer context but cannot approve it", async () => {
    const result = await shim.callTool("propose_buyer_context", MERIDIAN_CONTEXT_DRAFT);
    const payload = structuredOf<{ proposalId: string; approvalInstruction: string }>(result);

    expect(payload.proposalId).toBe("pcx_0001");
    expect(payload.approvalInstruction).toContain("Only the person");
    expect(handle.room().approvedBuyerContext).toBeNull();
    expect(shim.has("approve_buyer_context")).toBe(false);
  });

  it("stages a decision and reports the blockers", async () => {
    attachCanonicalEvidence(handle);

    const result = await shim.callTool("propose_decision_status", {
      status: "not_ready",
      rationale: "EU data residency cannot be proven from the catalog.",
      supportingRequirementIds: ["req_salesforce"],
      blockingRequirementIds: ["req_eu_residency", "req_sso"],
      risks: ["No documented EU region commitment."],
      nextStep: "Request an EU region commitment.",
    });

    const payload = structuredOf<{ blockers: Array<{ requirementId: string }> }>(result);
    expect(payload.blockers.map((entry) => entry.requirementId)).toContain("req_eu_residency");
    expect(handle.room().approvedDecision).toBeNull();
  });

  it("refuses a ready decision through the tool surface", async () => {
    attachCanonicalEvidence(handle);
    const result = await shim.callTool("propose_decision_status", {
      status: "ready",
      rationale: "Everything is documented.",
      supportingRequirementIds: ["req_salesforce"],
      blockingRequirementIds: [],
      risks: [],
      nextStep: "Contract.",
    });

    expect(result.isError).toBe(true);
    expect(structuredOf<{ code: string; mutated: boolean }>(result).code).toBe("DECISION_BLOCKED");
    expect(structuredOf<{ mutated: boolean }>(result).mutated).toBe(false);
    expect(handle.room().decisionProposal).toBeNull();
  });
});

describe("strict input handling", () => {
  it("rejects an unknown key", async () => {
    const result = await shim.callTool("evaluate_requirement", {
      requirementId: "req_sso",
      pleaseAlsoApprove: true,
    });

    expect(result.isError).toBe(true);
    expect(structuredOf<{ code: string }>(result).code).toBe("INVALID_INPUT");
    expect(handle.room().activityLedger).toHaveLength(1);
  });

  it("rejects oversized text", async () => {
    const result = await shim.callTool("search_product_evidence", { query: "a".repeat(400) });
    expect(result.isError).toBe(true);
    expect(structuredOf<{ issues: Array<{ path: string }> }>(result).issues[0]?.path).toBe("query");
  });

  it("rejects an out of range number", async () => {
    const result = await shim.callTool("calculate_roi", {
      ...CANONICAL_ROI_ASSUMPTIONS,
      campaignsPerMonth: 5000,
    });
    expect(result.isError).toBe(true);
  });

  it("rejects a missing required field", async () => {
    const result = await shim.callTool("attach_evidence", { requirementId: "req_sso" });
    expect(result.isError).toBe(true);
  });

  it("rejects a role outside cfo and ciso", async () => {
    const result = await shim.callTool("save_stakeholder_brief", {
      role: "ceo",
      summary: "Looks good.",
      evidenceIds: [],
      risks: [],
      openQuestions: [],
      nextStep: "Proceed.",
    });
    expect(result.isError).toBe(true);
  });

  it("does not append a ledger event for a rejected call", async () => {
    const before = handle.room().activityLedger.length;
    await shim.callTool("stage_requirement", { requirementId: "req_sso" });
    expect(handle.room().activityLedger).toHaveLength(before);
  });

  it("reports errors without a stack trace", async () => {
    const result = await shim.callTool("evaluate_requirement", { requirementId: "req_nope" });
    expect(result.content[0]?.text).toContain("NOT_FOUND");
    expect(result.content[0]?.text).toContain("The room did not change.");
    expect(result.content[0]?.text).not.toContain("node_modules");
  });
});

describe("full shim journey", () => {
  it("runs the canonical agent journey and leaves approval to the person", async () => {
    await shim.callTool("get_room_state", { detail: "requirements" });
    await shim.callTool("propose_buyer_context", MERIDIAN_CONTEXT_DRAFT);

    const proposalId = handle.room().buyerContextProposal?.id;
    expect(proposalId).toBe("pcx_0001");

    const approved = handle.actions.approveBuyerContext({ proposalId: proposalId! });
    expect(approved.ok).toBe(true);

    for (const attachment of [
      { requirementId: "req_salesforce", evidenceIds: ["ev_002", "ev_003"] },
      { requirementId: "req_eu_residency", evidenceIds: ["ev_007", "ev_008"] },
      { requirementId: "req_sso", evidenceIds: ["ev_006"] },
      { requirementId: "req_soc2", evidenceIds: ["ev_004"] },
      { requirementId: "req_campaign_volume", evidenceIds: ["ev_009"] },
      { requirementId: "req_payback", evidenceIds: ["ev_010"] },
    ]) {
      const attach = await shim.callTool("attach_evidence", attachment);
      expect(attach.isError).toBe(false);
    }

    await shim.callTool("calculate_roi", CANONICAL_ROI_ASSUMPTIONS);

    const cfo = await shim.callTool("save_stakeholder_brief", {
      role: "cfo",
      summary:
        "Payback lands at 11.2 months on the buyer assumptions, inside the twelve month target. Implementation is documented at forty five days.",
      evidenceIds: ["ev_010"],
      risks: ["EU data residency is unproven and could stop the purchase."],
      openQuestions: ["Does the Enterprise tier price hold for a second year?"],
      nextStep: "Confirm the list price and the implementation fee in writing.",
    });
    expect(cfo.isError).toBe(false);

    const ciso = await shim.callTool("save_stakeholder_brief", {
      role: "ciso",
      summary:
        "The SOC 2 Type II summary covers a current period. SAML federation is documented. SCIM provisioning is absent and EU data residency has no region commitment.",
      evidenceIds: ["ev_004", "ev_006", "ev_007"],
      risks: ["EU data residency is unproven.", "SSO and provisioning is only partly covered."],
      openQuestions: ["When will SCIM provisioning ship?"],
      nextStep: "Request an EU region commitment and an EU subprocessor list.",
    });
    expect(ciso.isError).toBe(false);

    const staged = await shim.callTool("propose_decision_status", {
      status: "not_ready",
      rationale:
        "Salesforce, SOC 2, and campaign volume are proven. EU data residency cannot be proven from the catalog.",
      supportingRequirementIds: ["req_salesforce", "req_soc2", "req_campaign_volume"],
      blockingRequirementIds: ["req_eu_residency", "req_sso"],
      risks: ["No EU region commitment."],
      nextStep: "Request an EU region commitment.",
    });
    expect(staged.isError).toBe(false);

    const decisionProposalId = handle.room().decisionProposal?.id;
    expect(handle.room().approvedDecision).toBeNull();

    const decision = handle.actions.approveDecision({ proposalId: decisionProposalId! });
    expect(decision.ok).toBe(true);
    expect(handle.room().approvedDecision?.status).toBe("not_ready");

    const ledger = handle.room().activityLedger;
    expect(ledger.filter((event) => event.origin === "webmcp").length).toBeGreaterThan(8);
    expect(ledger.filter((event) => event.origin === "ui")).toHaveLength(2);
    expect(handle.room().requirements.find((entry) => entry.id === "req_eu_residency")?.status).toBe(
      "unknown",
    );
  });
});
