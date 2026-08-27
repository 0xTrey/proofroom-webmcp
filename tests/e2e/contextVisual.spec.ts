import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const AUDIT_DIRECTORY = path.resolve("artifacts/visual-audit/004-context");
const VIEWPORTS = [
  { width: 390, height: 900 },
  { width: 1600, height: 900 },
] as const;

async function ready(page: Page, route: "product" | "evaluation" | "decision"): Promise<void> {
  await page.goto(`/#${route}`);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

async function approveContext(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Stage fictional Meridian Bank draft" }).click();
  await page.getByRole("button", { name: "Approve buyer context" }).click();
  await expect(
    page.getByRole("heading", { name: "Meridian Bank context is buyer-approved." }),
  ).toBeVisible();
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
  test(`product before and after approval at ${viewport.width}px`, async ({ page }) => {
    await mkdir(AUDIT_DIRECTORY, { recursive: true });
    await page.setViewportSize(viewport);
    await ready(page, "product");
    await expectNoOverflow(page);
    await page.screenshot({
      path: path.join(AUDIT_DIRECTORY, `product-before-${viewport.width}.png`),
      fullPage: true,
      animations: "disabled",
    });

    await approveContext(page);
    await expectNoOverflow(page);
    await page.screenshot({
      path: path.join(AUDIT_DIRECTORY, `product-after-${viewport.width}.png`),
      fullPage: true,
      animations: "disabled",
    });
  });

  for (const route of ["evaluation", "decision"] as const) {
    test(`${route} approved context rail at ${viewport.width}px`, async ({ page }) => {
      await mkdir(AUDIT_DIRECTORY, { recursive: true });
      await page.setViewportSize(viewport);
      await ready(page, "product");
      await approveContext(page);
      await page.getByRole("button", { name: route === "evaluation" ? "Evaluation" : "Decision" }).click();
      await expectNoOverflow(page);

      await page.locator(".context-workspace").screenshot({
        path: path.join(AUDIT_DIRECTORY, `${route}-approved-rail-${viewport.width}.png`),
        animations: "disabled",
      });
    });
  }
}

test("approved context applies immediately under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page, "product");
  await approveContext(page);

  const motion = await page.locator(".context-workspace").evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      animationName: styles.animationName,
      transitionDuration: styles.transitionDuration,
      transform: styles.transform,
    };
  });

  expect(motion.animationName).toBe("none");
  expect(motion.transitionDuration).toBe("0s");
  expect(motion.transform).toBe("none");
});
