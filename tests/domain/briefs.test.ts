import { describe, expect, it } from "vitest";
import { attachCanonicalEvidence, createTestRoom } from "../support/room.ts";

describe("stakeholder brief validation", () => {
  it("rejects a summary that claims an unproven requirement is proven", () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);

    const result = handle.agentActions.saveStakeholderBrief({
      role: "cfo",
      summary: "EU data residency is proven for this deployment.",
      evidenceIds: ["ev_007"],
      risks: [],
      openQuestions: [],
      nextStep: "Proceed.",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("EVIDENCE_INSUFFICIENT");
    }
    expect(handle.room().stakeholderBriefs.cfo).toBeUndefined();
  });

  it("rejects a risk statement that claims an unproven requirement is verified", () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);

    const result = handle.agentActions.saveStakeholderBrief({
      role: "cfo",
      summary: "The model is based on buyer assumptions.",
      evidenceIds: ["ev_010"],
      risks: ["EU data residency is verified and no longer a risk."],
      openQuestions: [],
      nextStep: "Proceed.",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("EVIDENCE_INSUFFICIENT");
    }
  });

  it('rejects unknown EU status described as "only verified"', () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);

    const result = handle.agentActions.saveStakeholderBrief({
      role: "ciso",
      summary: "The review has open regional questions.",
      evidenceIds: ["ev_007"],
      risks: ["EU data residency is only verified."],
      openQuestions: [],
      nextStep: "Request regional documentation.",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("EVIDENCE_INSUFFICIENT");
      expect(result.error.issues[0]?.path).toBe("risks");
    }
  });

  it('rejects unknown EU status described as "partially supported"', () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);

    const result = handle.agentActions.saveStakeholderBrief({
      role: "ciso",
      summary: "The review has open regional questions.",
      evidenceIds: ["ev_007"],
      risks: ["EU data residency is partially supported."],
      openQuestions: [],
      nextStep: "Request regional documentation.",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("EVIDENCE_INSUFFICIENT");
      expect(result.error.issues[0]?.path).toBe("risks");
    }
  });

  it('accepts "only partly covered" for partially supported SSO', () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);

    const result = handle.agentActions.saveStakeholderBrief({
      role: "ciso",
      summary: "The review has open provisioning questions.",
      evidenceIds: ["ev_006"],
      risks: ["SSO and provisioning is only partly covered."],
      openQuestions: [],
      nextStep: "Request a SCIM provisioning timeline.",
    });

    expect(result.ok).toBe(true);
  });

  it("accepts an honest true-negation sentence for unknown EU status", () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);

    const result = handle.agentActions.saveStakeholderBrief({
      role: "ciso",
      summary: "The review has open regional questions.",
      evidenceIds: ["ev_007"],
      risks: ["EU data residency is not verified."],
      openQuestions: [],
      nextStep: "Request regional documentation.",
    });

    expect(result.ok).toBe(true);
  });

  it("validates each risk independently without matching proof across risks", () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);

    const result = handle.agentActions.saveStakeholderBrief({
      role: "cfo",
      summary: "The model is based on buyer assumptions.",
      evidenceIds: ["ev_010"],
      risks: ["EU data residency remains open", "The current cost is verified."],
      openQuestions: [],
      nextStep: "Confirm pricing and regional processing.",
    });

    expect(result.ok).toBe(true);
  });

  it("rejects a next step that claims an unproven requirement is confirmed", () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);

    const result = handle.agentActions.saveStakeholderBrief({
      role: "ciso",
      summary: "SOC 2 is present.",
      evidenceIds: ["ev_004"],
      risks: ["EU data residency is unproven."],
      openQuestions: [],
      nextStep: "EU data residency is confirmed, so proceed.",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("EVIDENCE_INSUFFICIENT");
    }
  });

  it("accepts an honest open question about an unproven requirement", () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);

    const result = handle.agentActions.saveStakeholderBrief({
      role: "ciso",
      summary: "SOC 2 and SAML are present. SCIM is open.",
      evidenceIds: ["ev_004", "ev_006"],
      risks: ["EU data residency is unproven."],
      openQuestions: ["Can EU data residency be supported in the future?"],
      nextStep: "Request an EU region commitment.",
    });

    expect(result.ok).toBe(true);
  });

  it("rejects unknown evidence IDs atomically", () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);

    const result = handle.agentActions.saveStakeholderBrief({
      role: "cfo",
      summary: "The model is sound.",
      evidenceIds: ["ev_nope"],
      risks: [],
      openQuestions: [],
      nextStep: "Proceed.",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
    expect(handle.room().stakeholderBriefs.cfo).toBeUndefined();
  });

  it("warns about expired citations without rejecting", () => {
    const handle = createTestRoom();
    handle.agentActions.attachEvidence({
      requirementId: "req_soc2",
      evidenceIds: ["ev_005"],
    });

    const result = handle.agentActions.saveStakeholderBrief({
      role: "ciso",
      summary: "SOC 2 history is available.",
      evidenceIds: ["ev_005"],
      risks: ["The SOC 2 report is expired."],
      openQuestions: [],
      nextStep: "Request a current SOC 2 report.",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.warnings.length).toBeGreaterThan(0);
    expect(result.value.warnings.some((w) => w.includes("ev_005"))).toBe(true);
  });

  it("warns about untrusted citations", () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);

    const result = handle.agentActions.saveStakeholderBrief({
      role: "ciso",
      summary: "SOC 2 is present.",
      evidenceIds: ["ev_004", "ev_011"],
      risks: ["EU data residency is unproven.", "SSO is only partly covered."],
      openQuestions: [],
      nextStep: "Request an EU region commitment.",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.warnings.some((w) => w.includes("ev_011") && w.includes("untrusted"))).toBe(
      true,
    );
  });

  it("warns about omitted hard blockers", () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);

    const result = handle.agentActions.saveStakeholderBrief({
      role: "cfo",
      summary: "The model is sound.",
      evidenceIds: ["ev_010"],
      risks: [],
      openQuestions: [],
      nextStep: "Proceed.",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.warnings.some((w) => w.includes("not listed as a risk"))).toBe(true);
  });

  it("saving one role preserves the other", () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);

    const cfo = handle.agentActions.saveStakeholderBrief({
      role: "cfo",
      summary: "The model is sound.",
      evidenceIds: ["ev_010"],
      risks: ["EU data residency is unproven."],
      openQuestions: [],
      nextStep: "Confirm pricing.",
    });
    expect(cfo.ok).toBe(true);

    const ciso = handle.agentActions.saveStakeholderBrief({
      role: "ciso",
      summary: "SOC 2 and SAML are present.",
      evidenceIds: ["ev_004", "ev_006"],
      risks: ["EU data residency is unproven.", "SSO is only partly covered."],
      openQuestions: [],
      nextStep: "Request an EU region commitment.",
    });
    expect(ciso.ok).toBe(true);

    expect(handle.room().stakeholderBriefs.cfo).toBeDefined();
    expect(handle.room().stakeholderBriefs.ciso).toBeDefined();
  });

  it("saving a later revision of one role replaces only that role", () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);

    handle.agentActions.saveStakeholderBrief({
      role: "cfo",
      summary: "First version.",
      evidenceIds: ["ev_010"],
      risks: ["EU data residency is unproven."],
      openQuestions: [],
      nextStep: "Proceed.",
    });

    handle.agentActions.saveStakeholderBrief({
      role: "ciso",
      summary: "CISO brief.",
      evidenceIds: ["ev_004"],
      risks: ["EU data residency is unproven."],
      openQuestions: [],
      nextStep: "Request EU commitment.",
    });

    const updated = handle.agentActions.saveStakeholderBrief({
      role: "cfo",
      summary: "Second version.",
      evidenceIds: ["ev_010"],
      risks: ["EU data residency is unproven."],
      openQuestions: [],
      nextStep: "Proceed with caution.",
    });
    expect(updated.ok).toBe(true);

    expect(handle.room().stakeholderBriefs.cfo?.summary).toBe("Second version.");
    expect(handle.room().stakeholderBriefs.ciso?.summary).toBe("CISO brief.");
  });

  it("records the origin as webmcp for tool saves", () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);

    const result = handle.agentActions.saveStakeholderBrief({
      role: "cfo",
      summary: "The model is sound.",
      evidenceIds: ["ev_010"],
      risks: ["EU data residency is unproven."],
      openQuestions: [],
      nextStep: "Proceed.",
    });
    expect(result.ok).toBe(true);
    expect(handle.room().stakeholderBriefs.cfo?.savedBy).toBe("webmcp");
  });

  it("records the origin as ui for page saves", () => {
    const handle = createTestRoom();
    attachCanonicalEvidence(handle);

    const result = handle.actions.saveStakeholderBrief({
      role: "cfo",
      summary: "The model is sound.",
      evidenceIds: ["ev_010"],
      risks: ["EU data residency is unproven."],
      openQuestions: [],
      nextStep: "Proceed.",
    });
    expect(result.ok).toBe(true);
    expect(handle.room().stakeholderBriefs.cfo?.savedBy).toBe("ui");
  });

  it("persists both roles after reload", () => {
    const storage = createTestRoom().storage;
    const first = createTestRoom({ storage });
    attachCanonicalEvidence(first);

    first.agentActions.saveStakeholderBrief({
      role: "cfo",
      summary: "CFO brief.",
      evidenceIds: ["ev_010"],
      risks: ["EU data residency is unproven."],
      openQuestions: [],
      nextStep: "Proceed.",
    });
    first.agentActions.saveStakeholderBrief({
      role: "ciso",
      summary: "CISO brief.",
      evidenceIds: ["ev_004"],
      risks: ["EU data residency is unproven."],
      openQuestions: [],
      nextStep: "Request EU commitment.",
    });

    const second = createTestRoom({ storage });
    expect(second.room().stakeholderBriefs.cfo?.summary).toBe("CFO brief.");
    expect(second.room().stakeholderBriefs.ciso?.summary).toBe("CISO brief.");
  });
});
