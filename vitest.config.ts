import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// The Cloudflare plugin is intentionally excluded here. Unit and component tests
// run in jsdom against the same source, not inside the Workers runtime.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**", "tests/accessibility/**", "node_modules/**"],
    restoreMocks: true,
    clearMocks: true,
  },
});
