import { expect, test, type Page } from "@playwright/test";

type PersistedSummary = {
  revision: number;
  eventCount: number;
  room: {
    revision: number;
    requirements: Array<{
      attachedEvidenceIds: string[];
      buyerNotes: string;
    }>;
    evidenceCatalog: unknown[];
    approvedBuyerContext: unknown;
    stakeholderBriefs: Record<string, unknown>;
    decisionProposal: unknown;
    approvedDecision: unknown;
    activityLedger: Array<{ id: string; sequence: number }>;
  };
};

async function installBrowserToolShim(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const definitions = new Map<string, WebMcpToolDefinition>();
    document.modelContext = {
      async registerTool(definition, options) {
        if (definitions.has(definition.name)) {
          throw new Error(`${definition.name} already registered`);
        }
        definitions.set(definition.name, definition);
        options?.signal?.addEventListener(
          "abort",
          () => definitions.delete(definition.name),
          { once: true },
        );
      },
      unregisterTool(name) {
        definitions.delete(name);
      },
    };
    (
      window as unknown as {
        __proofroomCallTool: (name: string, args: unknown) => Promise<WebMcpToolResult>;
      }
    ).__proofroomCallTool = async (name, args) => {
      const definition = definitions.get(name);
      if (!definition) {
        throw new Error(`${name} is not registered`);
      }
      return definition.execute(args);
    };
  });
}

async function persistedSummary(page: Page): Promise<PersistedSummary> {
  return page.evaluate(() => {
    const persisted = JSON.parse(localStorage.getItem("proofroom.room.v1") ?? "null") as {
      room: PersistedSummary["room"];
    };
    return {
      revision: persisted.room.revision,
      eventCount: persisted.room.activityLedger.length,
      room: persisted.room,
    };
  });
}

async function callTool(page: Page, name: string, args: unknown): Promise<void> {
  await page.evaluate(
    async ({ toolName, toolArgs }) => {
      await (
        window as unknown as {
          __proofroomCallTool: (name: string, input: unknown) => Promise<WebMcpToolResult>;
        }
      ).__proofroomCallTool(toolName, toolArgs);
    },
    { toolName: name, toolArgs: args },
  );
}

test("item 9 ledger, reset, and reload journey preserves the trust boundary", async ({ page }) => {
  const runtimeErrors: string[] = [];
  const failedRequests: string[] = [];
  const failedResponses: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });

  await installBrowserToolShim(page);
  await page.goto("/#product");
  await expect(page.getByText("9 agent tools are registered on this page.")).toBeVisible();

  await page.getByRole("button", { name: "Reset demo" }).press("Enter");
  await expect(page.getByRole("dialog", { name: "Reset this fictional demonstration?" })).toBeVisible();
  await page.getByRole("button", { name: "Reset to canonical fixture" }).press("Enter");
  await expect(page.getByRole("region", { name: "The canonical fixture is active." })).toContainText(
    "rcp_0001",
  );

  await page.getByRole("button", { name: "Stage fictional Meridian Bank draft" }).click();
  await page.getByRole("button", { name: "Approve buyer context" }).click();
  await callTool(page, "get_room_state", { detail: "requirements" });
  await callTool(page, "search_product_evidence", {
    query: "testimonial program review",
    limit: 2,
  });
  const sensitiveContext = "Fictional ledger-private buyer phrase 731";
  await callTool(page, "propose_buyer_context", {
    companyName: sensitiveContext,
    industry: "Fictional private industry",
    employeeBand: "501 to 1,000",
    personas: ["Fictional reviewer"],
    priorities: ["Review deterministic fit."],
    hardRequirements: ["Keep evidence visible."],
    budgetCeiling: 120000,
    paybackTargetMonths: 12,
  });

  await page.getByRole("button", { name: "Decision" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  const ledger = page.getByRole("region", {
    name: "Inspect the authoritative activity register.",
  });
  await expect(ledger.locator('[data-event-id="evt_0006"]')).toContainText(
    "propose_buyer_context",
  );
  await expect(ledger.locator('[data-event-id="evt_0005"]')).toContainText(
    "search_product_evidence",
  );
  await expect(ledger.locator('[data-event-id="evt_0005"]')).toContainText("Agent");
  await expect(ledger.locator('[data-event-id="evt_0005"]')).toContainText("Read");
  await expect(ledger.locator('[data-event-id="evt_0005"]')).toContainText("Untrusted content");
  await expect(ledger.locator('[data-event-id="evt_0004"]')).toContainText("2 → 2");
  await expect(ledger.locator('[data-event-id="evt_0003"]')).toContainText(
    "approve_buyer_context",
  );
  await expect(ledger.locator('[data-event-id="evt_0003"]')).toContainText("Person");
  await expect(ledger.locator('[data-event-id="evt_0001"]')).toContainText("room_ready");
  await expect(ledger).not.toContainText(sensitiveContext);

  const beforeFilters = await persistedSummary(page);
  await page.getByLabel("Origin").selectOption("webmcp");
  await page.getByLabel("Kind").selectOption("read");
  await page.getByLabel("Panel").selectOption("evaluation");
  await expect(ledger.getByText(/Showing 1 of 1 filtered events/)).toBeVisible();
  await page.getByLabel("Origin").selectOption("system");
  await page.getByLabel("Kind").selectOption("mutate");
  await expect(
    ledger.getByRole("heading", { name: "No ledger events match these filters." }),
  ).toBeVisible();
  expect(await persistedSummary(page)).toEqual(beforeFilters);

  for (const width of [390, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(
      dimensions.clientWidth,
    );
  }

  const beforeCancel = await persistedSummary(page);
  const resetTrigger = page.getByRole("button", { name: "Reset demo" });
  await resetTrigger.click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(resetTrigger).toBeFocused();
  expect(await persistedSummary(page)).toEqual(beforeCancel);

  await resetTrigger.click();
  await page.getByRole("button", { name: "Reset to canonical fixture" }).click();
  const receipt = page.getByRole("region", { name: "The canonical fixture is active." });
  await expect(receipt).toContainText("rcp_0001");
  await expect(receipt).toContainText("reset");
  await expect(receipt).toContainText("Requirements6");
  await expect(receipt).toContainText("Evidence records12");
  await expect(receipt).toContainText("Revision0");
  const resetState = await persistedSummary(page);
  expect(resetState.room.revision).toBe(0);
  expect(resetState.room.requirements).toHaveLength(6);
  expect(resetState.room.evidenceCatalog).toHaveLength(12);
  expect(resetState.room.approvedBuyerContext).toBeNull();
  expect(
    resetState.room.requirements.every(
      (requirement) =>
        requirement.attachedEvidenceIds.length === 0 && requirement.buyerNotes === "",
    ),
  ).toBe(true);
  expect(resetState.room.stakeholderBriefs).toEqual({});
  expect(resetState.room.decisionProposal).toBeNull();
  expect(resetState.room.approvedDecision).toBeNull();
  expect(resetState.room.activityLedger).toHaveLength(1);
  expect(resetState.room.activityLedger[0]).toMatchObject({ id: "evt_0001", sequence: 1 });

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  const reloaded = await persistedSummary(page);
  expect(reloaded).toEqual(resetState);
  await page.getByRole("button", { name: "Decision" }).press("Enter");
  await expect(
    page.getByRole("region", { name: "Inspect the authoritative activity register." }),
  ).toContainText("evt_0001");
  await expect(
    page.getByRole("region", { name: "Inspect the authoritative activity register." }),
  ).not.toContainText("evt_0006");

  expect(runtimeErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(failedResponses).toEqual([]);
});

for (const recovery of [
  {
    name: "invalid persisted state",
    seed: { schemaVersion: 1, savedAt: "invalid", room: {} },
    code: "invalid_persisted_state",
  },
  {
    name: "unsupported persisted version",
    seed: { schemaVersion: 99, savedAt: "2026-08-26T12:00:00.000Z", room: { schemaVersion: 99 } },
    code: "unsupported_schema_version",
  },
]) {
  test(`${recovery.name} resolves once after explicit continue`, async ({ page }) => {
    await page.addInitScript(({ key, marker, value }) => {
      if (sessionStorage.getItem(marker) === null) {
        localStorage.setItem(key, JSON.stringify(value));
        sessionStorage.setItem(marker, "seeded");
      }
    }, {
      key: "proofroom.room.v1",
      marker: `proofroom-recovery-seeded-${recovery.code}`,
      value: recovery.seed,
    });
    await page.goto("/#product");

    await expect(page.getByText(new RegExp(`Notice code: ${recovery.code}`))).toBeVisible();
    await page.getByRole("button", { name: "Continue with recovered fixture" }).click();
    await expect(page.getByText(new RegExp(`Notice code: ${recovery.code}`))).toHaveCount(0);

    await page.reload();
    await expect(page.getByText(new RegExp(`Notice code: ${recovery.code}`))).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  });
}
