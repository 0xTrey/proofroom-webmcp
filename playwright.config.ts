import { defineConfig, devices } from "@playwright/test";

const previewPort = Number(process.env.PROOFROOM_PREVIEW_PORT ?? "4173");
if (!Number.isInteger(previewPort) || previewPort < 1024 || previewPort > 65535) {
  throw new Error("PROOFROOM_PREVIEW_PORT must be an integer from 1024 through 65535.");
}
const previewUrl = `http://127.0.0.1:${previewPort}`;

// Browser binaries are not downloaded in this milestone. The suites are configured
// so a later milestone can run them with `npx playwright install`.
export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PROOFROOM_BASE_URL ?? previewUrl,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${previewPort} --strictPort`,
    url: previewUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "e2e",
      testDir: "tests/e2e",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
    {
      name: "accessibility",
      testDir: "tests/accessibility",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
  ],
});
