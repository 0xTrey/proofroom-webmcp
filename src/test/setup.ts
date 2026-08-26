/**
 * Vitest setup.
 *
 * jsdom does not implement `document.modelContext`, which is exactly the
 * unsupported browser case ProofRoom has to handle. Tests that need tools install
 * the model context shim explicitly.
 */
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  globalThis.localStorage?.clear();
});
