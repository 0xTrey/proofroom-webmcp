/* global URL, console, document, process, window */

import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";

const baseUrl = process.env.BRAND_LAB_URL ?? "http://127.0.0.1:4175/artifacts/brand-lab/";
const outputDirectory = fileURLToPath(new URL("./screenshots/", import.meta.url));
const themes = ["chain", "dual", "redline", "mission", "quiet", "spectrum", "industrial"];

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const report = {
  url: baseUrl,
  desktop: {},
  mobile: {},
};

try {
  for (const theme of themes) {
    await page.goto(`${baseUrl}#${theme}`, { waitUntil: "networkidle" });
    await page.locator("#brand-preview").waitFor();
    await page.waitForTimeout(350);

    const desktopState = await page.evaluate((activeTheme) => {
      const activeButtons = [...document.querySelectorAll("[data-theme-choice][aria-pressed='true']")];
      const preview = document.querySelector("#brand-preview");
      return {
        activeButtonCount: activeButtons.length,
        activeTheme: activeButtons[0]?.getAttribute("data-theme-choice") ?? null,
        previewClass: preview?.className ?? null,
        bodyScrollWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth,
        expectedTheme: activeTheme,
      };
    }, theme);

    const accessibility = await new AxeBuilder({ page }).analyze();
    desktopState.accessibilityViolations = accessibility.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.length,
      samples: violation.nodes.slice(0, 8).map((node) => ({
        target: node.target,
        html: node.html,
        failureSummary: node.failureSummary,
      })),
    }));
    report.desktop[theme] = desktopState;

    await page.locator("#brand-preview").screenshot({
      path: `${outputDirectory}/${theme}-1600.png`,
      animations: "disabled",
    });
  }

  await page.goto(`${baseUrl}#chain`, { waitUntil: "networkidle" });
  await page.waitForTimeout(350);
  const comparisonTop = await page.locator(".comparison").evaluate((element) => element.offsetTop);
  await page.evaluate((top) => window.scrollTo(0, Math.max(0, top - 82)), comparisonTop);
  await page.screenshot({
    path: `${outputDirectory}/comparison-overview-1600.png`,
    animations: "disabled",
  });

  await page.goto(`${baseUrl}#mission`, { waitUntil: "networkidle" });
  await page.waitForTimeout(350);
  const missionComparisonTop = await page.locator(".comparison").evaluate((element) => element.offsetTop);
  await page.evaluate((top) => window.scrollTo(0, Math.max(0, top - 82)), missionComparisonTop);
  await page.screenshot({
    path: `${outputDirectory}/mission-overview-1600.png`,
    animations: "disabled",
  });

  await page.setViewportSize({ width: 390, height: 844 });

  for (const theme of themes) {
    await page.goto(`${baseUrl}#${theme}`, { waitUntil: "networkidle" });
    await page.locator("#brand-preview").waitFor();
    await page.waitForTimeout(350);

    report.mobile[theme] = await page.evaluate((activeTheme) => {
      const controls = [...document.querySelectorAll("button")];
      const tooSmall = controls.filter((control) => control.getBoundingClientRect().height < 44);
      return {
        activeTheme,
        bodyScrollWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth,
        buttonsUnder44Pixels: tooSmall.length,
      };
    }, theme);

    if (theme === "mission") {
      await page.locator("#brand-preview").screenshot({
        path: `${outputDirectory}/mission-390.png`,
        animations: "disabled",
      });
    }
  }

  await page.goto(`${baseUrl}#chain`, { waitUntil: "networkidle" });
  await page.screenshot({
    path: `${outputDirectory}/comparison-page-390.png`,
    fullPage: true,
    animations: "disabled",
  });
} finally {
  await browser.close();
}

await writeFile(
  new URL("./qa-report.json", import.meta.url),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

const failedDesktop = Object.entries(report.desktop).filter(([, result]) =>
  result.activeButtonCount !== 1 ||
  result.activeTheme !== result.expectedTheme ||
  !result.previewClass?.includes(`brand-preview--${result.expectedTheme}`) ||
  result.bodyScrollWidth > result.viewportWidth ||
  result.accessibilityViolations.length > 0
);

const failedMobile = Object.entries(report.mobile).filter(([, result]) =>
  result.bodyScrollWidth > result.viewportWidth || result.buttonsUnder44Pixels > 0
);

if (failedDesktop.length > 0 || failedMobile.length > 0) {
  console.error(JSON.stringify({ failedDesktop, failedMobile }, null, 2));
  process.exitCode = 1;
} else {
  console.log(`Brand lab QA passed for ${themes.length} desktop themes and ${themes.length} mobile themes.`);
}
