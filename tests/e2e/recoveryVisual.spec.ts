import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const AUDIT_DIRECTORY = path.resolve("artifacts/visual-audit/007-recovery");
const UPDATE_VISUAL_AUDIT = process.env.UPDATE_VISUAL_AUDIT === "1";
const VIEWPORTS = [
  { width: 390, height: 900 },
  { width: 1600, height: 900 },
] as const;

async function settlePage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  await page.addStyleTag({
    content:
      ".skip-link { display: none !important; } html { scroll-behavior: auto !important; }",
  });
}

async function capture(page: Page, filename: string): Promise<void> {
  if (!UPDATE_VISUAL_AUDIT) {
    return;
  }
  await page.screenshot({
    path: path.join(AUDIT_DIRECTORY, filename),
    animations: "disabled",
  });
}

async function expectNoOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(
    dimensions.clientWidth,
  );
}

async function placeAtViewportTop(page: Page, selector: string): Promise<void> {
  await page.locator(selector).evaluate((element) => {
    const top = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: Math.max(0, top - 16), behavior: "instant" });
  });
}

for (const viewport of VIEWPORTS) {
  test(`asserts and optionally captures four item 9 states at ${viewport.width}px`, async ({
    page,
  }) => {
    if (UPDATE_VISUAL_AUDIT) {
      await mkdir(AUDIT_DIRECTORY, { recursive: true });
    }
    await page.setViewportSize(viewport);
    await page.goto("/#product");

    await page.getByRole("button", { name: "Review the sample buyer profile" }).click();
    await page.getByRole("button", { name: "Use this buyer profile" }).click();
    await page.getByRole("button", { name: "Check evidence" }).click();
    await page.getByRole("button", { name: "Run the sample evidence check" }).click();
    await page.getByRole("button", { name: "Review decision" }).click();
    const ledger = page.getByRole("region", {
      name: "Activity history",
    });
    await expect(ledger.locator("tbody tr")).toHaveCount(9);
    await settlePage(page);
    await placeAtViewportTop(page, ".activity-ledger");
    await expectNoOverflow(page);
    await capture(page, `populated-ledger-${viewport.width}.png`);

    await page.getByRole("button", { name: "Reset demo" }).click();
    const dialog = page.getByRole("dialog", { name: "Reset this fictional demonstration?" });
    await expect(dialog).toContainText("Prior activity ledger history");
    await expect(dialog).toContainText("One new System event");
    await settlePage(page);
    await capture(page, `reset-confirmation-${viewport.width}.png`);

    await page.getByRole("button", { name: "Cancel" }).click();
    await page.evaluate(() => {
      localStorage.setItem(
        "proofroom.room.v1",
        JSON.stringify({ schemaVersion: 1, savedAt: "invalid", room: {} }),
      );
    });
    await page.reload();
    const recovery = page.getByRole("region", { name: "The demo starting point is active." });
    await expect(recovery).toContainText("invalid_persisted_state");
    await settlePage(page);
    await placeAtViewportTop(page, ".global-recovery");
    await expectNoOverflow(page);
    await capture(page, `invalid-state-recovery-${viewport.width}.png`);

    await page.getByRole("button", { name: "Continue with recovered demo" }).click();
    await page.getByRole("button", { name: "Reset demo" }).click();
    await page.getByRole("button", { name: "Reset to the demo starting point" }).click();
    const receipt = page.getByRole("region", { name: "The demo starting point is active." });
    await expect(receipt).toContainText("rcp_0001");
    await expect(receipt).toContainText("Evidence records12");
    await settlePage(page);
    await placeAtViewportTop(page, ".reset-result");
    await expectNoOverflow(page);
    await capture(page, `successful-reset-receipt-${viewport.width}.png`);
  });
}
