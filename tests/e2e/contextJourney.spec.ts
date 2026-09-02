import { expect, test, type Page } from "@playwright/test";
import { stageSampleBuyerProfile } from "./support/context.ts";

async function dataOrder(page: Page, selector: string, attribute: string): Promise<string[]> {
  return page.locator(selector).evaluateAll(
    (elements, name) => elements.map((element) => element.getAttribute(name) ?? ""),
    attribute,
  );
}

async function stageCanonicalDraft(page: Page): Promise<void> {
  await stageSampleBuyerProfile(page);
  await expect(page.getByRole("button", { name: "Use this buyer profile" })).toBeVisible();
}

test.describe("buyer-controlled context journey", () => {
  test("stages, reviews, approves, personalizes, persists, and carries the rail", async ({ page }) => {
    await page.goto("/#product");

    const baselineHeadline = await page.getByRole("heading", { level: 1 }).textContent();
    const baselineCapabilities = await dataOrder(
      page,
      "[data-capability-id]",
      "data-capability-id",
    );
    const baselineEvidence = await dataOrder(page, "[data-evidence-id]", "data-evidence-id");
    const baselinePackages = await dataOrder(page, "[data-package-id]", "data-package-id");
    await expect(page.getByRole("heading", { name: "No buyer profile is approved yet." })).toBeVisible();

    await stageCanonicalDraft(page);
    const proposal = page.locator("[data-proposal-status='pending']");
    const fields = proposal.locator(".context-fields");
    await expect(fields).toBeVisible();
    for (const text of [
      "Meridian Bank",
      "Fintech and regulated banking",
      "1,000 to 1,500 employees",
      "Marketing operations lead",
      "CFO",
      "CISO",
      "Salesforce administrator",
      "Ship twenty campaigns per month without adding headcount",
      "Keep customer data inside an EU region",
      "Prove security and compliance posture to the risk committee",
      "Reach payback inside the first year",
      "Bidirectional Salesforce integration",
      "EU data residency",
      "SAML 2.0 single sign on",
      "A current SOC 2 Type II report",
      "$120,000",
      "12 months",
    ]) {
      await expect(fields).toContainText(text);
    }

    await proposal.getByText("Technical profile details").click();
    for (const text of [
      "pcx_0001",
      "Base revision",
      "Current room revision",
      "Expiry",
      "Digest",
      "Creator origin",
      "ui",
      "pending",
    ]) {
      await expect(proposal.getByText(text, { exact: false }).first()).toBeVisible();
    }

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(baselineHeadline ?? "");
    expect(await dataOrder(page, "[data-capability-id]", "data-capability-id")).toEqual(
      baselineCapabilities,
    );
    expect(await dataOrder(page, "[data-evidence-id]", "data-evidence-id")).toEqual(
      baselineEvidence,
    );
    expect(await dataOrder(page, "[data-package-id]", "data-package-id")).toEqual(
      baselinePackages,
    );

    await page.getByRole("button", { name: "Use this buyer profile" }).click();

    await expect(
      page.getByRole("heading", { name: "Meridian Bank buying priorities are approved." }),
    ).toBeVisible();
    await expect(page.getByText("Buying priorities approved for this review")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(baselineHeadline ?? "");
    expect((await dataOrder(page, "[data-capability-id]", "data-capability-id")).slice(0, 3)).toEqual(
      ["cap_salesforce_bridge", "cap_hosting", "cap_access_control"],
    );
    expect(await dataOrder(page, "[data-evidence-id]", "data-evidence-id")).toEqual([
      "ev_002",
      "ev_007",
      "ev_006",
      "ev_004",
    ]);
    expect(await dataOrder(page, "[data-package-id]", "data-package-id")).toEqual([
      "pkg_enterprise",
      "pkg_team",
    ]);
    await expect(page.getByText("Evaluation candidate", { exact: true })).toBeVisible();
    await expect(page.getByText(/Requirement status: unknown/)).toBeVisible();
    await expect(page.getByText(/catalog does not prove EU residency/)).toBeVisible();

    await page.getByText("Inspect full approved context and receipt").click();
    const receipt = page.getByRole("region", { name: "Approval receipt" });
    await expect(receipt.getByText("rcp_0003")).toBeVisible();
    await expect(receipt.getByText("pcx_0001")).toBeVisible();
    await expect(receipt.getByText(/Buyer context approved in the page at revision 2/)).toBeVisible();

    await page.getByRole("button", { name: "Check evidence" }).click();
    await expect(
      page.getByRole("heading", { name: "Meridian Bank buying priorities are approved." }),
    ).toBeVisible();
    await expect(page.getByText(/Fintech and regulated banking/).first()).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Meridian Bank buying priorities are approved." }),
    ).toBeVisible();
    await expect(page.getByText("Marketing operations lead, CFO, CISO, Salesforce administrator")).toBeVisible();

    await page.getByRole("button", { name: "Review decision" }).click();
    await expect(
      page.getByRole("heading", { name: "Meridian Bank buying priorities are approved." }),
    ).toBeVisible();
    await expect(page.getByText("$120,000", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("12 months", { exact: true }).first()).toBeVisible();
  });

  test("rejects a staged proposal without changing authoritative context or ordering", async ({
    page,
  }) => {
    await page.goto("/#product");
    const baselineHeadline = await page.getByRole("heading", { level: 1 }).textContent();
    const baselineCapabilities = await dataOrder(
      page,
      "[data-capability-id]",
      "data-capability-id",
    );
    const baselineEvidence = await dataOrder(page, "[data-evidence-id]", "data-evidence-id");
    const baselinePackages = await dataOrder(page, "[data-package-id]", "data-package-id");

    await stageCanonicalDraft(page);
    await page.getByRole("button", { name: "Reject this buyer profile" }).click();

    await expect(
      page
        .getByText(
          "Rejected pcx_0001. No buyer profile has ever been approved, so baseline product ordering remains in place.",
          { exact: true },
        )
        .first(),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "No buyer profile is approved yet." })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(baselineHeadline ?? "");
    expect(await dataOrder(page, "[data-capability-id]", "data-capability-id")).toEqual(
      baselineCapabilities,
    );
    expect(await dataOrder(page, "[data-evidence-id]", "data-evidence-id")).toEqual(
      baselineEvidence,
    );
    expect(await dataOrder(page, "[data-package-id]", "data-package-id")).toEqual(
      baselinePackages,
    );
    await expect(page.getByRole("button", { name: "Use this buyer profile" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reject this buyer profile" })).toHaveCount(0);
  });
});
