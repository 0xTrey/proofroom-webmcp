import { expect, test, type Page } from "@playwright/test";
import { runEvalSuite } from "../../evals/runner.ts";
import { MERIDIAN_CONTEXT_DRAFT } from "../../src/fixtures/buyer.ts";
import { CANONICAL_ROI_ASSUMPTIONS } from "../../src/fixtures/demoScenario.ts";
import { CANONICAL_REVIEW_SET } from "../../src/features/evaluation/reviewSet.ts";

const CFO_BRIEF = {
  role: "cfo",
  summary:
    "The modelled 11.2 month payback uses explicit buyer assumptions. EU data residency remains a purchase risk.",
  evidenceIds: ["ev_010"],
  risks: ["EU data residency is unproven and could stop the purchase."],
  openQuestions: ["Does the Enterprise tier price hold for a second year?"],
  nextStep: "Confirm the list price and the implementation fee in writing.",
};

const CISO_BRIEF = {
  role: "ciso",
  summary:
    "Current SOC 2 and SAML evidence are present. SCIM is open. EU regional processing is unproven.",
  evidenceIds: ["ev_004", "ev_006", "ev_007", "ev_008"],
  risks: ["EU data residency is unproven.", "SSO and provisioning is only partly covered."],
  openQuestions: ["When will SCIM provisioning ship?"],
  nextStep: "Request an EU region commitment and an EU subprocessor list.",
};

const NOT_READY_DECISION = {
  status: "not_ready",
  rationale:
    "Salesforce, SOC 2, and campaign volume are proven. EU data residency cannot be proven from the catalog.",
  supportingRequirementIds: ["req_salesforce", "req_soc2", "req_campaign_volume"],
  blockingRequirementIds: ["req_eu_residency", "req_sso"],
  risks: ["No EU region commitment.", "SSO provisioning is only partially supported."],
  nextStep: "Request an EU region commitment and a SCIM provisioning timeline.",
};

async function installBrowserToolShim(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const definitions = new Map<string, WebMcpToolDefinition>();
    const observedTools: string[] = [];
    document.modelContext = {
      async registerTool(definition, options) {
        definitions.set(definition.name, definition);
        options?.signal?.addEventListener("abort", () => definitions.delete(definition.name), {
          once: true,
        });
      },
      unregisterTool(name) {
        definitions.delete(name);
      },
    };
    const hooks = window as unknown as {
      __proofroomCallTool(name: string, args: unknown): Promise<WebMcpToolResult>;
      __proofroomObservedTools: string[];
    };
    hooks.__proofroomObservedTools = observedTools;
    hooks.__proofroomCallTool = async (name, args) => {
      const definition = definitions.get(name);
      if (!definition) throw new Error(`${name} is not registered`);
      observedTools.push(name);
      return definition.execute(args);
    };
  });
}

async function callTool(page: Page, name: string, args: unknown): Promise<void> {
  const result = await page.evaluate(
    async ({ toolName, toolArgs }) =>
      (
        window as unknown as {
          __proofroomCallTool(name: string, input: unknown): Promise<WebMcpToolResult>;
        }
      ).__proofroomCallTool(toolName, toolArgs),
    { toolName: name, toolArgs: args },
  );
  expect(result.isError, `${name} should succeed`).toBe(false);
}

async function expectNoOverflow(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(
    dimensions.clientWidth,
  );
}

test("supported browser shim completes the canonical case with the deterministic terminal state", async ({
  page,
}) => {
  const deterministic = await runEvalSuite({ writeArtifacts: false });
  const canonical = deterministic.report.cases.find(
    (entry) => entry.id === "eval_001_canonical_journey",
  );
  expect(canonical?.outcome).toBe("pass");

  await installBrowserToolShim(page);
  await page.goto("/#product");
  await expect(page.getByText("9 agent tools are registered on this page.")).toBeVisible();

  await callTool(page, "get_room_state", { detail: "requirements" });
  await callTool(page, "propose_buyer_context", MERIDIAN_CONTEXT_DRAFT);
  await callTool(page, "search_product_evidence", {
    query: "Salesforce EU residency SAML SOC 2 campaign volume payback",
    limit: 12,
  });
  for (const attachment of CANONICAL_REVIEW_SET) {
    await callTool(page, "attach_evidence", attachment);
  }
  await callTool(page, "evaluate_requirement", { requirementId: "req_eu_residency" });
  await callTool(page, "evaluate_requirement", { requirementId: "req_sso" });
  await callTool(page, "calculate_roi", CANONICAL_ROI_ASSUMPTIONS);
  await callTool(page, "save_stakeholder_brief", CFO_BRIEF);
  await callTool(page, "save_stakeholder_brief", CISO_BRIEF);
  await callTool(page, "propose_decision_status", NOT_READY_DECISION);

  const browserResult = await page.evaluate(() => {
    const hooks = window as unknown as { __proofroomObservedTools: string[] };
    const persisted = JSON.parse(localStorage.getItem("proofroom.room.v1") ?? "null") as {
      room: {
        revision: number;
        activityLedger: unknown[];
        requirements: Array<{ id: string; status: string }>;
        approvedBuyerContext: unknown;
        stakeholderBriefs: Record<string, unknown>;
        decisionProposal: {
          status: string;
          payload: { status: string; blockingRequirementIds: string[] };
        };
        approvedDecision: unknown;
      };
    };
    return {
      observedTools: hooks.__proofroomObservedTools,
      revision: persisted.room.revision,
      ledgerEventCount: persisted.room.activityLedger.length,
      requirementStatuses: Object.fromEntries(
        persisted.room.requirements
          .sort((left, right) => left.id.localeCompare(right.id))
          .map((entry) => [entry.id, entry.status]),
      ),
      approvedBuyerContextPresent: persisted.room.approvedBuyerContext !== null,
      stakeholderBriefRoles: Object.keys(persisted.room.stakeholderBriefs).sort(),
      decisionProposalStatus: persisted.room.decisionProposal.status,
      decisionPayloadStatus: persisted.room.decisionProposal.payload.status,
      decisionBlockingRequirementIds:
        persisted.room.decisionProposal.payload.blockingRequirementIds,
      approvedDecisionPresent: persisted.room.approvedDecision !== null,
    };
  });

  expect(browserResult.observedTools).toEqual(canonical?.expectedSequence);
  expect(browserResult).toMatchObject({
    revision: canonical?.terminal.revision,
    ledgerEventCount: canonical?.terminal.ledgerEventCount,
    requirementStatuses: canonical?.terminal.requirementStatuses,
    approvedBuyerContextPresent: canonical?.terminal.approvedBuyerContextPresent,
    stakeholderBriefRoles: canonical?.terminal.stakeholderBriefRoles,
    decisionProposalStatus: canonical?.terminal.decisionProposalStatus,
    decisionPayloadStatus: canonical?.terminal.decisionPayloadStatus,
    decisionBlockingRequirementIds: canonical?.terminal.decisionBlockingRequirementIds,
    approvedDecisionPresent: canonical?.terminal.approvedDecisionPresent,
  });

  await page.getByRole("button", { name: "Review decision" }).click();
  const proposal = page.getByRole("article", { name: "Recommendation prepared for your review" });
  await expect(proposal).toContainText("not ready");
  await expect(proposal).toContainText("req_eu_residency");
  await expect(proposal).toContainText("req_sso");
  await expect(page.getByRole("heading", { name: "No buyer profile is approved yet." })).toBeVisible();
});

test("required UI states emit no runtime, request, or response errors at target widths", async ({
  browser,
}) => {
  test.setTimeout(120000);
  for (const width of [390, 768, 1600]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("requestfailed", (request) =>
      errors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`),
    );
    page.on("response", (response) => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });

    await page.goto("/#product");
    await expectNoOverflow(page);

    await page.getByRole("button", { name: "Review the sample buyer profile" }).click();
    await expect(page.locator("[data-proposal-status='pending']")).toBeVisible();
    await expectNoOverflow(page);

    await page.getByRole("button", { name: "Use this buyer profile" }).click();
    await expect(page.getByText("Buying priorities approved for this review")).toBeVisible();
    await expectNoOverflow(page);

    await page.getByRole("button", { name: "Check evidence" }).click();
    await page.getByRole("button", { name: "Run the sample evidence check" }).click();
    await expect(page.locator("[data-requirement-status='supported']")).toHaveCount(3);
    await expectNoOverflow(page);

    await page.getByRole("button", { name: "Review decision" }).click();
    await page.getByRole("button", { name: "Fill the honest sample draft" }).click();
    await page.getByRole("button", { name: "Save CFO brief" }).click();
    await page.getByRole("button", { name: /CISO/ }).click();
    await page.getByRole("button", { name: "Fill the honest sample draft" }).click();
    await page.getByRole("button", { name: "Save CISO brief" }).click();
    await page.getByRole("button", { name: "Prepare the sample not-ready recommendation" }).click();
    await page.getByRole("button", { name: "Prepare recommendation" }).click();
    await expect(page.getByRole("article", { name: "Recommendation prepared for your review" })).toBeVisible();
    await expectNoOverflow(page);

    await page.getByRole("button", { name: "Approve recommendation" }).click();
    await expect(page.getByRole("region", { name: "Decision receipt" })).toBeVisible();
    await expectNoOverflow(page);

    await page.getByRole("button", { name: "Reset demo" }).click();
    await page.getByRole("button", { name: "Reset to the demo starting point" }).click();
    await expect(page.getByRole("region", { name: "The demo starting point is active." })).toBeVisible();
    await expectNoOverflow(page);

    await page.evaluate(() => {
      localStorage.setItem(
        "proofroom.room.v1",
        JSON.stringify({ schemaVersion: 1, savedAt: "invalid", room: { broken: true } }),
      );
    });
    await page.reload();
    await expect(page.getByText(/Notice code: invalid_persisted_state/)).toBeVisible();
    await expectNoOverflow(page);

    expect(errors, `Errors at ${width}px`).toEqual([]);
    await page.close();
  }
});
