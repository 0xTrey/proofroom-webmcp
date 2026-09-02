import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  validateReleaseReceiptDocument,
  validateReleaseReceiptEvidence,
} from "../release-receipt.ts";
import { RELEASE_RECEIPT_PATH } from "./paths.ts";

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

export function validateReleaseReceiptForGate(repositoryRoot: string): void {
  const receipt = validateReleaseReceiptDocument(
    readJson(resolve(repositoryRoot, RELEASE_RECEIPT_PATH)),
  );
  validateReleaseReceiptEvidence(receipt, repositoryRoot);
}
