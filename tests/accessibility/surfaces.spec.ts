/**
 * Accessibility smoke suite.
 *
 * Runs axe against each surface at the four target widths. Browser binaries are
 * not installed in the foundation milestone; run `npx playwright install chromium`
 * before the first execution.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WIDTHS = [390, 768, 1280, 1600];
const SURFACES = ["#product", "#evaluation", "#decision"];

async function blockingViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  return results.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact ?? ""),
  );
}

for (const width of WIDTHS) {
  for (const surface of SURFACES) {
    test(`no serious axe violations on ${surface} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${surface}`);

      expect(await blockingViolations(page)).toEqual([]);
    });

    test(`approved context has no serious axe violations on ${surface} at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/#product");
      await page.getByRole("button", { name: "Stage fictional Meridian Bank draft" }).click();
      await page.getByRole("button", { name: "Approve buyer context" }).click();
      await page.getByRole("button", {
        name:
          surface === "#product"
            ? "Product"
            : surface === "#evaluation"
              ? "Evaluation"
              : "Decision",
      }).click();

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(
        dimensions.clientWidth,
      );

      const blocking = await blockingViolations(page);
      expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    });
  }
}
