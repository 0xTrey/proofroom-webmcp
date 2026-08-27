import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { width: 390, height: 900 },
  { width: 768, height: 900 },
  { width: 1280, height: 900 },
  { width: 1600, height: 900 },
] as const;
const SURFACES = ["product", "evaluation", "decision"] as const;

for (const viewport of VIEWPORTS) {
  for (const surface of SURFACES) {
    test(`${surface} layout at ${viewport.width}px has one primary heading and no overflow`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(`/#${surface}`);
      await page.evaluate(async () => {
        await document.fonts.ready;
      });

      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(
        dimensions.clientWidth,
      );
    });
  }
}

test("reduced motion removes the route animation and decorative transform", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#product");

  const motion = await page.locator(".surface").evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      animationName: styles.animationName,
      transitionDuration: styles.transitionDuration,
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    };
  });
  const stampTransform = await page
    .locator(".evidence-stamp")
    .first()
    .evaluate((element) => getComputedStyle(element).transform);

  expect(motion.animationName).toBe("none");
  expect(motion.transitionDuration).toBe("0s");
  expect(motion.scrollBehavior).toBe("auto");
  expect(stampTransform).toBe("none");
});
