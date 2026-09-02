import { expect, type Page } from "@playwright/test";

export async function stageSampleBuyerProfile(page: Page): Promise<void> {
  await page.locator("#buyer-context-task").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Review the sample buyer profile" }).click();
  await expect(page.getByRole("heading", { name: "Use these buying priorities?" })).toBeVisible();
}

export async function approveSampleBuyerProfile(page: Page): Promise<void> {
  await stageSampleBuyerProfile(page);
  await expect(page.getByRole("button", { name: "Use this buyer profile" })).toBeVisible();
  await page.getByRole("button", { name: "Use this buyer profile" }).click();
}
