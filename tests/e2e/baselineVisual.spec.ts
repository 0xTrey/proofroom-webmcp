import { expect, test, type Locator, type Page } from "@playwright/test";
import { captureSubmissionGallery } from "./support/submissionGallery.ts";

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1280, height: 900 },
  { width: 1600, height: 900 },
] as const;
const SURFACES = ["product", "evaluation", "decision"] as const;

async function expectFullyVisibleInViewport(
  locator: Locator,
  page: Page,
  label: string,
): Promise<void> {
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const box = await locator.boundingBox();
  expect(box, `${label} bounding box`).not.toBeNull();
  expect(box!.x, `${label} left`).toBeGreaterThanOrEqual(0);
  expect(box!.y, `${label} top`).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width, `${label} right`).toBeLessThanOrEqual(viewport!.width + 1);
  expect(box!.y + box!.height, `${label} bottom`).toBeLessThanOrEqual(viewport!.height + 1);
}

for (const viewport of VIEWPORTS) {
  test(`landing layout at ${viewport.width}px has one primary heading and no overflow`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page.addStyleTag({ content: ".skip-link { display: none !important; }" });

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(
      dimensions.clientWidth,
    );

    if (viewport.width === 1600) {
      await expectFullyVisibleInViewport(
        page.getByRole("heading", { level: 1 }),
        page,
        "landing h1",
      );
      await expectFullyVisibleInViewport(
        page.getByRole("link", { name: /Open the fictional review/ }).first(),
        page,
        "landing primary CTA",
      );
      await expectFullyVisibleInViewport(
        page.getByLabel("Fictional EU data residency example"),
        page,
        "landing EU example card",
      );
      await expectFullyVisibleInViewport(
        page.getByRole("list", {
          name: /How buyer requirements become a human-approved decision/i,
        }),
        page,
        "landing decision chain",
      );
      await captureSubmissionGallery(page, "01-landing-hero-1600.png");
    }
  });

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
      if (viewport.width === 390) {
        const headingBox = await page.getByRole("heading", { level: 1 }).boundingBox();
        const nextStepBox = await page.getByRole("button", { name: /Go to:/ }).boundingBox();
        expect(headingBox).not.toBeNull();
        expect(nextStepBox).not.toBeNull();
        expect(headingBox?.y ?? viewport.height).toBeLessThanOrEqual(390);
        expect(nextStepBox?.y ?? viewport.height).toBeLessThan(headingBox?.y ?? viewport.height);
      }

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

  await page.getByRole("button", { name: /Go to: Set the buying priorities/ }).click();
  await expect(page.locator("#buyer-context-task")).toBeFocused();
});
