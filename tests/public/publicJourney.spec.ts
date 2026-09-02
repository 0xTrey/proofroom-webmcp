import { expect, test, type Page } from "@playwright/test";
import { TOOL_NAMES } from "../../src/webmcp/toolDefinitions.ts";

async function expectSurfaceIntegrity(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(
    dimensions.clientWidth,
  );
}

test("public UI-only canonical journey is clean, persistent, and resettable", async ({
  context,
  page,
}) => {
  const initialStorage = await context.storageState();
  expect(initialStorage.cookies).toEqual([]);
  expect(initialStorage.origins).toEqual([]);

  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const failedResponses: string[] = [];
  const sourceMapRequests: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("request", (request) => {
    if (/\.map(?:$|\?)/.test(request.url())) sourceMapRequests.push(request.url());
  });
  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });

  await page.goto("/#product");
  await expectSurfaceIntegrity(page);
  await expect(
    page.getByRole("complementary", { name: "Fictional demo disclosure" }),
  ).toContainText("Fictional demonstration");

  await page.getByRole("button", { name: "Review the sample buyer profile" }).click();
  await page.getByRole("button", { name: "Use this buyer profile" }).click();
  await expect(page.getByText("Buying priorities approved for this review")).toBeVisible();
  await expectSurfaceIntegrity(page);

  await page.getByRole("button", { name: "Check evidence" }).click();
  await expectSurfaceIntegrity(page);
  await page.getByRole("button", { name: "Run the sample evidence check" }).click();
  await expect(page.locator("[data-requirement-status='supported']")).toHaveCount(3);
  await expect(page.locator("[data-requirement-status='partially_supported']")).toHaveCount(2);
  await expect(page.locator("[data-requirement-status='unknown']")).toHaveCount(1);

  await page.getByRole("button", { name: "Review decision" }).click();
  await expectSurfaceIntegrity(page);
  const toolManifest = page.locator(".tool-manifest");
  await expect(toolManifest.locator("li")).toHaveCount(9);
  await expect(toolManifest.locator("code")).toHaveText([...TOOL_NAMES]);

  await page.getByLabel("Budget ceiling").fill("119000");
  await page.getByRole("button", { name: "Preview calculation" }).click();
  await expect(page.getByText("11.2 mo.")).toBeVisible();
  await page.getByRole("button", { name: "Apply reviewed assumptions" }).click();
  await expect(page.getByText(/Applied 1 assumption change/)).toBeVisible();

  await page.getByRole("button", { name: "Fill the honest sample draft" }).click();
  await page.getByRole("button", { name: "Save CFO brief" }).click();
  await page.getByRole("button", { name: /CISO/ }).click();
  await page.getByRole("button", { name: "Fill the honest sample draft" }).click();
  await page.getByRole("button", { name: "Save CISO brief" }).click();
  await page.getByRole("button", { name: "Prepare the sample not-ready recommendation" }).click();
  await page.getByRole("button", { name: "Prepare recommendation" }).click();
  await expect(page.getByRole("article", { name: "Recommendation prepared for your review" })).toContainText("not ready");
  await page.getByRole("button", { name: "Approve recommendation" }).click();
  await expect(page.getByRole("region", { name: "Decision receipt" })).toBeVisible();

  const ledger = page.getByRole("region", {
    name: "Activity history",
  });
  await expect(ledger).toContainText("approve_decision");
  await expect(ledger).toContainText("Person");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Approved decision" })).toBeVisible();
  await expect(page.getByLabel("Budget ceiling")).toHaveValue("119000");
  await expectSurfaceIntegrity(page);

  await page.getByRole("button", { name: "Set priorities" }).click();
  await expectSurfaceIntegrity(page);
  await page.getByRole("button", { name: "Check evidence" }).click();
  await expectSurfaceIntegrity(page);
  await page.getByRole("button", { name: "Review decision" }).click();
  await expectSurfaceIntegrity(page);

  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.getByRole("button", { name: "Reset to the demo starting point" }).click();
  await expect(page.getByRole("region", { name: "The demo starting point is active." })).toContainText(
    "Revision0",
  );
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "No buyer profile is approved yet." })).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(failedResponses).toEqual([]);
  expect(sourceMapRequests).toEqual([]);
});
