/**
 * UI only journey.
 *
 * ProofRoom has to work with no agent at all. This suite runs against the built
 * preview server. Browser binaries are not installed in the foundation milestone;
 * run `npx playwright install chromium` before the first execution.
 */
import { expect, test } from "@playwright/test";

test.describe("ProofRoom without an agent", () => {
  test("opens on the product surface with one headline and a fictional notice", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByText("This is fictional demo content")).toBeVisible();
    await expect(page.getByText(/agent tools/)).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test("navigates the three surfaces by keyboard", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Evaluation" }).press("Enter");
    await expect(page.getByText("EU data residency")).toBeVisible();

    await page.getByRole("button", { name: "Decision" }).press("Enter");
    await expect(page.getByRole("heading", { name: "Commercial model" })).toBeVisible();
    await expect(page.getByText("propose_decision_status")).toBeVisible();
  });

  test("keeps the room after a reload", async ({ page }) => {
    await page.goto("/#evaluation");
    await expect(page.getByText(/6 requirements, 12 evidence records/)).toBeVisible();

    await page.reload();
    await expect(page.getByText(/6 requirements, 12 evidence records/)).toBeVisible();
  });
});
