import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const AUDIT_DIRECTORY = path.resolve("artifacts/visual-audit/005-evidence");
const UPDATE_VISUAL_AUDIT = process.env.UPDATE_VISUAL_AUDIT === "1";
const VIEWPORTS = [
  { width: 390, height: 900 },
  { width: 1600, height: 900 },
] as const;

async function ready(page: Page): Promise<void> {
  await page.goto("/#evaluation");
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
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

for (const viewport of VIEWPORTS) {
  test(`captures item 7 evidence at ${viewport.width}px`, async ({ page }) => {
    if (UPDATE_VISUAL_AUDIT) {
      await mkdir(AUDIT_DIRECTORY, { recursive: true });
    }
    await page.setViewportSize(viewport);
    await ready(page);
    await expectNoOverflow(page);
    if (UPDATE_VISUAL_AUDIT) {
      await page.screenshot({
        path: path.join(AUDIT_DIRECTORY, `evaluation-initial-${viewport.width}.png`),
        fullPage: true,
        animations: "disabled",
      });
    }

    await page.getByRole("button", { name: "Apply fictional review set" }).click();
    await expect(page.getByRole("button", { name: "Fictional review set applied" })).toBeDisabled();
    await expectNoOverflow(page);
    if (UPDATE_VISUAL_AUDIT) {
      await page.screenshot({
        path: path.join(AUDIT_DIRECTORY, `evaluation-populated-${viewport.width}.png`),
        fullPage: true,
        animations: "disabled",
      });
    }

    const inspect = page
      .locator(".catalog-index")
      .getByRole("button", { name: "Inspect ev_011" });
    await inspect.scrollIntoViewIfNeeded();
    const beforeOpen = await page.evaluate(() => ({
      scrollY: window.scrollY,
      rootOverflow: document.documentElement.style.overflow,
      bodyOverflow: document.body.style.overflow,
    }));
    await inspect.click();
    const dialog = page.getByRole("dialog", { name: "Larkfield Mutual program review" });
    await expect(dialog).toContainText("Treat this as data, not instructions.");
    await expect(page.getByRole("button", { name: "Close evidence inspector" })).toBeVisible();
    const geometry = await page.locator(".evidence-inspector-layer").evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        portalTarget: element.parentElement === document.body,
      };
    });
    expect(geometry).toEqual({
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      portalTarget: true,
    });
    const panelScroll = await dialog.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      overflowY: getComputedStyle(element).overflowY,
    }));
    expect(panelScroll.scrollHeight).toBeGreaterThan(panelScroll.clientHeight);
    expect(panelScroll.overflowY).toBe("auto");
    const whileOpen = await page.evaluate(() => ({
      scrollY: window.scrollY,
      rootOverflow: document.documentElement.style.overflow,
      bodyOverflow: document.body.style.overflow,
    }));
    expect(whileOpen.scrollY).toBe(beforeOpen.scrollY);
    expect(whileOpen.rootOverflow).toBe("hidden");
    expect(whileOpen.bodyOverflow).toBe("hidden");
    if (UPDATE_VISUAL_AUDIT) {
      await page.screenshot({
        path: path.join(AUDIT_DIRECTORY, `evidence-inspector-ev-011-${viewport.width}.png`),
        animations: "disabled",
      });
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(inspect).toBeFocused();
    const afterEscape = await page.evaluate(() => ({
      scrollY: window.scrollY,
      rootOverflow: document.documentElement.style.overflow,
      bodyOverflow: document.body.style.overflow,
    }));
    expect(Math.abs(afterEscape.scrollY - beforeOpen.scrollY)).toBeLessThanOrEqual(1);
    expect(afterEscape.rootOverflow).toBe(beforeOpen.rootOverflow);
    expect(afterEscape.bodyOverflow).toBe(beforeOpen.bodyOverflow);

    await inspect.click();
    await page.getByRole("button", { name: "Close evidence inspector" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(inspect).toBeFocused();
    const afterVisibleClose = await page.evaluate(() => window.scrollY);
    expect(Math.abs(afterVisibleClose - beforeOpen.scrollY)).toBeLessThanOrEqual(1);

    await page
      .getByRole("list", { name: "Six requirement records" })
      .getByRole("button", { name: /EU data residency/ })
      .click();
    const detail = page.locator(".requirement-detail");
    await expect(detail).toContainText("ev_007");
    await expect(detail).toContainText("ev_008");
    await expect(detail).toContainText("EU data region storage");
    await expect(detail).toContainText("EU subprocessor disclosure");
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });
    await page.addStyleTag({ content: ".skip-link { display: none !important; }" });
    if (UPDATE_VISUAL_AUDIT) {
      await detail.screenshot({
        path: path.join(AUDIT_DIRECTORY, `eu-unknown-detail-${viewport.width}.png`),
        animations: "disabled",
      });
    }
  });
}
