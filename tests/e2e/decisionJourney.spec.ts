import { expect, test, type Page } from "@playwright/test";

async function approveCanonicalContext(page: Page): Promise<void> {
  await page.goto("/#product");
  await page.getByRole("button", { name: "Stage fictional Meridian Bank draft" }).click();
  await page.getByRole("button", { name: "Approve buyer context" }).click();
  await page.getByRole("button", { name: "Evaluation" }).click();
  await page.getByRole("button", { name: "Apply fictional review set" }).click();
  await page.getByRole("button", { name: "Decision" }).click();
}

async function fillAndSaveBriefs(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Fill canonical honest CFO draft" }).click();
  await page.getByRole("button", { name: "Save CFO brief" }).click();
  await page.getByRole("button", { name: /CISO/ }).click();
  await page.getByRole("button", { name: "Fill canonical honest CISO draft" }).click();
  await page.getByRole("button", { name: "Save CISO brief" }).click();
}

async function stageCanonicalDecision(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Fill canonical not-ready draft" }).click();
  await page.getByRole("button", { name: "Stage proposal" }).click();
}

test("item 8 ROI, briefs, and human decision journey persists the exact approved record", async ({
  page,
}) => {
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

  await approveCanonicalContext(page);

  const campaigns = page.getByLabel("Campaigns per month");
  await campaigns.fill("501");
  const fieldError = page.getByText("Campaigns per month must be at most 500.");
  await expect(fieldError).toBeVisible();
  await expect(campaigns).toHaveValue("501");
  await expect(campaigns).toHaveAttribute("aria-invalid", "true");
  await expect(campaigns).toHaveAttribute("aria-describedby", "roi-campaignsPerMonth-error");
  await expect(page.getByRole("button", { name: "Preview calculation" })).toBeDisabled();

  await campaigns.fill("20");
  await expect(fieldError).toBeHidden();
  await expect(campaigns).toHaveAttribute("aria-invalid", "false");
  await expect(page.getByRole("button", { name: "Preview calculation" })).toBeEnabled();

  const revisionBeforePreview = await page.evaluate(() => {
    const persisted = JSON.parse(localStorage.getItem("proofroom.room.v1") ?? "null") as {
      room: { revision: number };
    } | null;
    return persisted?.room.revision ?? -1;
  });
  await page.getByRole("button", { name: "Preview calculation" }).click();
  await expect(page.getByText("11.2 mo.")).toBeVisible();
  expect(
    await page.evaluate(() => {
      const persisted = JSON.parse(localStorage.getItem("proofroom.room.v1") ?? "null") as {
        room: { revision: number };
      } | null;
      return persisted?.room.revision ?? -1;
    }),
  ).toBe(revisionBeforePreview);
  await expect(page.getByRole("button", { name: "Apply reviewed assumptions" })).toBeDisabled();
  await expect(page.getByText(/No ROI assumptions changed/)).toBeVisible();

  const budget = page.getByLabel("Budget ceiling");
  await budget.fill("119000");
  await page.getByRole("button", { name: "Preview calculation" }).click();
  await page.getByRole("button", { name: "Apply reviewed assumptions" }).click();
  await expect(page.getByText(/Applied 1 assumption change/)).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Budget ceiling")).toHaveValue("119000");
  expect(
    await page.evaluate(() => {
      const persisted = JSON.parse(localStorage.getItem("proofroom.room.v1") ?? "null") as {
        room: { roiAssumptions: { budgetCeiling: number } };
      };
      return persisted.room.roiAssumptions.budgetCeiling;
    }),
  ).toBe(119000);

  await page.getByRole("button", { name: "Reset to canonical" }).click();
  await page.getByRole("button", { name: "Preview calculation" }).click();
  await expect(page.getByText("11.2 mo.")).toBeVisible();
  await page.getByRole("button", { name: "Apply reviewed assumptions" }).click();
  await expect(page.getByLabel("Budget ceiling")).toHaveValue("120000");

  await fillAndSaveBriefs(page);
  await expect(page.locator('[data-brief-role="ciso"]')).toContainText("ev_004");
  await expect(page.locator('[data-brief-role="ciso"]')).toContainText("EU data residency");
  await page.getByRole("button", { name: "CFO saved" }).click();
  await expect(page.locator('[data-brief-role="cfo"]')).toContainText("11.2 month payback");
  await expect(page.locator('[data-brief-role="cfo"]')).toContainText("ev_010");

  await stageCanonicalDecision(page);
  const review = page.getByRole("article", { name: "Staged proposal" });
  await expect(review).toContainText("not ready");
  await expect(review).toContainText("req_salesforce");
  await expect(review).toContainText("req_soc2");
  await expect(review).toContainText("req_campaign_volume");
  await expect(review).toContainText("req_eu_residency");
  await expect(review).toContainText("req_sso");
  await expect(review).toContainText("No EU region commitment.");

  await page.getByLabel("Budget ceiling").fill("100000");
  await page.getByRole("button", { name: "Preview calculation" }).click();
  await page.getByRole("button", { name: "Apply reviewed assumptions" }).click();
  await expect(review.getByText(/stale/i).first()).toBeVisible();

  await review.getByRole("button", { name: "Approve decision" }).click();
  await expect(page.getByText(/PROPOSAL_STALE/)).toBeVisible();
  expect(
    await page.evaluate(() => {
      const persisted = JSON.parse(localStorage.getItem("proofroom.room.v1") ?? "null") as {
        room: { approvedDecision: unknown; decisionProposal: { status: string } };
      };
      return {
        approvedDecision: persisted.room.approvedDecision,
        proposalStatus: persisted.room.decisionProposal.status,
      };
    }),
  ).toEqual({ approvedDecision: null, proposalStatus: "pending" });

  await stageCanonicalDecision(page);
  await page.getByRole("button", { name: "Approve decision" }).click();
  const approved = page.getByRole("region", { name: "Decision receipt" });
  await expect(approved).toContainText("decision");
  await expect(approved).toContainText("pdc_");
  await expect(approved).toContainText("rcp_");
  const receiptText = await approved.textContent();

  await page.reload();
  await expect(page.getByRole("region", { name: "Decision receipt" })).toContainText(
    receiptText ?? "",
  );
  await expect(page.getByRole("heading", { name: "Approved decision" })).toBeVisible();
  await expect(page.getByText(/approved at revision \d+ \/ current/)).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(
    dimensions.clientWidth,
  );
  expect(runtimeErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(failedResponses).toEqual([]);
});
