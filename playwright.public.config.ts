import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

const baseURL = process.env.PROOFROOM_BASE_URL;
if (!baseURL) {
  throw new Error("PROOFROOM_BASE_URL is required for public browser QA.");
}

const chromeAvailable =
  existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome") ||
  existsSync("/usr/bin/google-chrome") ||
  existsSync("/usr/bin/google-chrome-stable");

export default defineConfig({
  testDir: "tests/public",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: "list",
  timeout: 180_000,
  use: {
    baseURL,
    channel: chromeAvailable ? "chrome" : undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "public-mobile",
      use: { viewport: { width: 390, height: 900 } },
    },
    {
      name: "public-wide",
      use: { viewport: { width: 1600, height: 900 } },
    },
  ],
});
