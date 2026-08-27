import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const AUDIT_DIRECTORY = path.resolve("artifacts/visual-audit/006-decision");
const UPDATE_VISUAL_AUDIT = process.env.UPDATE_VISUAL_AUDIT === "1";
const VIEWPORTS = [
  { width: 390, height: 900 },
  { width: 1600, height: 900 },
] as const;

async function applyCanonicalReview(page: Page): Promise<void> {
  await page.goto("/#product");
  await page.getByRole("button", { name: "Stage fictional Meridian Bank draft" }).click();
  await page.getByRole("button", { name: "Approve buyer context" }).click();
  await page.getByRole("button", { name: "Evaluation" }).click();
  await page.getByRole("button", { name: "Apply fictional review set" }).click();
  await page.getByRole("button", { name: "Decision" }).click();
}

async function stageCanonicalDecision(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Fill canonical honest CFO draft" }).click();
  await page.getByRole("button", { name: "Save CFO brief" }).click();
  await page.getByRole("button", { name: /CISO/ }).click();
  await page.getByRole("button", { name: "Fill canonical honest CISO draft" }).click();
  await page.getByRole("button", { name: "Save CISO brief" }).click();
  await page.getByRole("button", { name: "Fill canonical not-ready draft" }).click();
  await page.getByRole("button", { name: "Stage proposal" }).click();
}

async function settlePage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
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
    offenders: Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 8)
      .map((element) => ({
        tag: element.tagName,
        className: element.className,
        right: element.getBoundingClientRect().right,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      })),
  }));
  expect(dimensions.scrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(
    dimensions.clientWidth,
  );
}

type ViewportBox = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

function boxesOverlap(first: ViewportBox, second: ViewportBox): boolean {
  return !(
    first.right <= second.left ||
    second.right <= first.left ||
    first.bottom <= second.top ||
    second.bottom <= first.top
  );
}

async function expectProposalBlockersInViewport(page: Page): Promise<void> {
  const review = page.getByRole("article", { name: "Staged proposal" });
  const payloadFields = review.locator(".proposal-payload dl > div");
  const statusField = payloadFields.filter({ hasText: /^Decision status/ });
  const blockingField = payloadFields.filter({ hasText: /^Blocking requirements/ });
  const euBlocker = blockingField.getByRole("listitem").filter({ hasText: "req_eu_residency" });
  const ssoBlocker = blockingField.getByRole("listitem").filter({ hasText: "req_sso" });

  await expect(statusField).toContainText("not ready");
  await expect(euBlocker).toContainText("unknown");
  await expect(ssoBlocker).toContainText("partial");

  if (page.viewportSize()?.width === 390) {
    await blockingField.evaluate((element) => {
      const payload = element.closest(".proposal-payload");
      const firstField = payload?.querySelector("dl > div");
      if (!(firstField instanceof HTMLElement)) {
        throw new Error("Proposal decision status field was not found.");
      }
      const top = firstField.getBoundingClientRect().top + window.scrollY;
      const bottom = element.getBoundingClientRect().bottom + window.scrollY;
      const contentHeight = bottom - top;
      const spareSpace = Math.max(0, window.innerHeight - contentHeight);
      window.scrollTo({ top: Math.max(0, top - spareSpace / 2), behavior: "instant" });
    });
  } else {
    await review
      .getByRole("heading", { name: "Staged proposal" })
      .evaluate((element) => element.scrollIntoView({ block: "start" }));
  }

  await settlePage(page);

  for (const locator of [statusField, euBlocker, ssoBlocker]) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()?.height ?? 900);
  }
}

async function expectReceiptMetadataLayout(page: Page): Promise<void> {
  const receipt = page.getByRole("region", { name: "Decision receipt" });
  const requiredTerms = [
    "Kind",
    "Proposal ID",
    "Payload digest",
    "Approved revision",
    "Issued timestamp",
    "Safe summary",
  ];
  const geometry = await receipt.evaluate((element, terms) => {
    const fields = Array.from(element.querySelectorAll("dl > div"));
    return Object.fromEntries(
      terms.map((term) => {
        const field = fields.find((candidate) => candidate.querySelector("dt")?.textContent === term);
        if (!(field instanceof HTMLElement)) {
          throw new Error(`Receipt field ${term} was not found.`);
        }
        const rect = field.getBoundingClientRect();
        return [
          term,
          {
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
          },
        ];
      }),
    ) as Record<string, ViewportBox>;
  }, requiredTerms);

  const viewportHeight = page.viewportSize()?.height ?? 900;
  for (const term of requiredTerms) {
    const box = geometry[term];
    if (!box) {
      throw new Error(`${term} receipt field geometry was not returned.`);
    }
    expect(box.top, `${term} receipt field top`).toBeGreaterThanOrEqual(0);
    expect(box.bottom, `${term} receipt field bottom`).toBeLessThanOrEqual(viewportHeight);
  }

  if (page.viewportSize()?.width === 390) {
    for (let index = 0; index < requiredTerms.length; index += 1) {
      for (let comparison = index + 1; comparison < requiredTerms.length; comparison += 1) {
        const firstTerm = requiredTerms[index];
        const secondTerm = requiredTerms[comparison];
        if (!firstTerm || !secondTerm) {
          throw new Error("Receipt field comparison index was out of bounds.");
        }
        expect(
          boxesOverlap(geometry[firstTerm]!, geometry[secondTerm]!),
          `${firstTerm} and ${secondTerm} receipt fields overlap`,
        ).toBe(false);
      }
    }
    const issuedTimestamp = geometry["Issued timestamp"];
    const safeSummary = geometry["Safe summary"];
    if (!issuedTimestamp || !safeSummary) {
      throw new Error("Receipt timestamp or safe summary geometry was not returned.");
    }
    expect(safeSummary.top - issuedTimestamp.bottom).toBeGreaterThanOrEqual(8);
  }
}

for (const viewport of VIEWPORTS) {
  test(`asserts and optionally captures four item 8 states at ${viewport.width}px`, async ({
    page,
  }) => {
    if (UPDATE_VISUAL_AUDIT) {
      await mkdir(AUDIT_DIRECTORY, { recursive: true });
    }
    await page.setViewportSize(viewport);

    await page.goto("/#decision");
    await settlePage(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expectNoOverflow(page);
    await capture(page, `initial-decision-${viewport.width}.png`);

    await applyCanonicalReview(page);
    const subscription = page.getByLabel("Annual subscription cost");
    await subscription.fill("130000");
    await page.getByRole("button", { name: "Preview calculation" }).click();
    const warning = page.getByText("Annual subscription exceeds the budget ceiling.");
    await expect(warning).toBeVisible();
    await expect(page.locator(".roi-workspace__preview").getByText("Payback target")).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply reviewed assumptions" })).toBeEnabled();
    expect(
      await page.evaluate(() => {
        const persisted = JSON.parse(localStorage.getItem("proofroom.room.v1") ?? "null") as {
          room: { roiAssumptions: { annualSubscriptionCost: number } };
        };
        return persisted.room.roiAssumptions.annualSubscriptionCost;
      }),
    ).toBe(96000);
    await warning.evaluate((element) => element.scrollIntoView({ block: "end" }));
    await settlePage(page);
    await expectNoOverflow(page);
    await capture(page, `roi-preview-${viewport.width}.png`);

    await stageCanonicalDecision(page);

    const review = page.getByRole("article", { name: "Staged proposal" });
    await expectProposalBlockersInViewport(page);
    await expectNoOverflow(page);
    await capture(page, `proposal-review-${viewport.width}.png`);

    await review.getByRole("button", { name: "Approve decision" }).click();
    const receipt = page.getByRole("region", { name: "Decision receipt" });
    await expect(receipt).toContainText("decision");
    await expect(receipt).toContainText("pdc_");
    await receipt
      .getByRole("heading", { name: "Decision receipt" })
      .evaluate((element) => element.scrollIntoView({ block: "start" }));
    await settlePage(page);
    await expectReceiptMetadataLayout(page);
    await expectNoOverflow(page);
    await capture(page, `approved-receipt-${viewport.width}.png`);
  });
}
