/**
 * Accessibility smoke suite.
 *
 * Runs axe against each surface at the four target widths. Browser binaries are
 * not installed in the foundation milestone; run `npx playwright install chromium`
 * before the first execution.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WIDTHS = [390, 768, 1280, 1600];
const SURFACES = ["#product", "#evaluation", "#decision"];

for (const width of WIDTHS) {
  for (const surface of SURFACES) {
    test(`no serious axe violations on ${surface} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${surface}`);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const blocking = results.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact ?? ""),
      );

      expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    });
  }
}
