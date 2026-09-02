/**
 * UI only journey.
 *
 * ProofRoom has to work with no agent at all. This suite runs against the built
 * preview server. Browser binaries are not installed in the foundation milestone;
 * run `npx playwright install chromium` before the first execution.
 */
import { expect, test, type Page } from "@playwright/test";

async function persistedRoomSnapshot(page: Page) {
  return page.evaluate(() => localStorage.getItem("proofroom.room.v1"));
}

test.describe("ProofRoom without an agent", () => {
  test("opens on a clear landing page with authority and fictional disclosures", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(
      page.getByRole("heading", { level: 1, name: "Check a software vendor's claims before you buy." }),
    ).toBeVisible();
    await expect(page.getByText("Only a person can")).toBeVisible();
    await expect(page.getByText(/There is no account, database, telemetry/)).toBeVisible();
    await expect(page.getByText("Agent tools unavailable", { exact: true })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test("navigates the three surfaces by keyboard", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: /Open the fictional review/ }).first().press("Enter");
    await page.getByRole("button", { name: "Check evidence" }).press("Enter");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "EU data residency" })).toBeVisible();

    await page.getByRole("button", { name: "Review decision" }).press("Enter");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Check the business case" })).toBeVisible();
    await expect(page.getByText("propose_decision_status")).toBeVisible();
  });

  test("browser Back and Forward restore landing and room routes", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Open the fictional review/ }).first().click();
    await expect(page).toHaveURL(/#product$/);

    await page.getByRole("button", { name: "Check evidence" }).click();
    await expect(page).toHaveURL(/#evaluation$/);

    await page.goBack();
    await expect(page).toHaveURL(/#product$/);
    await expect(page.getByRole("heading", { name: /Start with what Meridian Bank needs./ })).toBeVisible();

    await page.goBack();
    await expect(page).not.toHaveURL(/#/);
    await expect(
      page.getByRole("heading", { name: "Check a software vendor's claims before you buy." }),
    ).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/#product$/);
    await expect(page.getByRole("heading", { name: /Start with what Meridian Bank needs./ })).toBeVisible();
  });

  test("opens and closes the rehearsal panel by keyboard without mutating room state", async ({
    page,
  }) => {
    await page.goto("/");
    const initial = await persistedRoomSnapshot(page);

    const rehearsal = page.locator("details.agent-rehearsal");
    await expect(rehearsal).not.toHaveAttribute("open");
    await page.getByText("Try the browser-agent path").press("Enter");
    await expect(rehearsal).toHaveAttribute("open");
    await expect(page.getByText(/Do not approve the buyer profile or a final decision/)).toBeVisible();
    expect(await persistedRoomSnapshot(page)).toBe(initial);
    expect(page.url()).toMatch(/\/$/);

    await page.getByText("Try the browser-agent path").press("Enter");
    await expect(rehearsal).not.toHaveAttribute("open");
    expect(await persistedRoomSnapshot(page)).toBe(initial);
    expect(page.url()).toMatch(/\/$/);
  });

  test("entering, leaving, and re-entering the room never mutates room state", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const initial = await persistedRoomSnapshot(page);
    expect(initial).toBeNull();
    await expect(page.getByRole("button", { name: "Reset demo" })).toHaveCount(0);

    await page.getByRole("link", { name: /Open the fictional review/ }).first().press("Enter");
    await expect(page.getByText(/No agent connection\. Page buttons still work\./)).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset demo" })).toBeEnabled();
    const roomDetails = page.locator("details.statusstrip__details summary");
    await roomDetails.press("Enter");
    await expect(page.locator(".statusstrip__details-list")).toContainText("000");
    const recommended = page.getByRole("button", { name: /Go to: Set the buying priorities/ });
    await expect(recommended).toBeVisible();
    const fullGuide = page.locator("details.room-guide__details");
    await expect(fullGuide).not.toHaveAttribute("open", "");
    await fullGuide.locator("summary").press("Enter");
    await expect(fullGuide).toHaveAttribute("open", "");
    await expect(page.getByRole("list", { name: "All room steps" }).getByRole("button")).toHaveCount(
      4,
    );
    await fullGuide.locator("summary").press("Enter");
    await recommended.press("Enter");
    await expect(page.locator("#buyer-context-task")).toBeFocused();
    expect(await persistedRoomSnapshot(page)).toBe(initial);

    await page.getByRole("button", { name: "ProofRoom, how it works" }).press("Enter");
    await expect(
      page.getByRole("heading", { name: "Check a software vendor's claims before you buy." }),
    ).toBeVisible();
    expect(await persistedRoomSnapshot(page)).toBe(initial);

    await page.getByRole("link", { name: /Open the fictional review/ }).first().press("Enter");
    await page.locator("details.statusstrip__details summary").press("Enter");
    await expect(page.locator(".statusstrip__details-list")).toContainText("000");
    expect(await persistedRoomSnapshot(page)).toBe(initial);
  });

  test("keeps the room after a reload", async ({ page }) => {
    await page.goto("/#evaluation");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Check six buying requirements against the vendor's evidence.",
      }),
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Check six buying requirements against the vendor's evidence.",
      }),
    ).toBeVisible();
  });
});
