import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Page } from "@playwright/test";

export const SUBMISSION_GALLERY_DIRECTORY = path.resolve(
  "artifacts/visual-audit/016-submission-gallery",
);
export const UPDATE_SUBMISSION_GALLERY = process.env.UPDATE_SUBMISSION_GALLERY === "1";

export async function captureSubmissionGallery(
  page: Page,
  filename: string,
): Promise<void> {
  if (!UPDATE_SUBMISSION_GALLERY) {
    return;
  }
  await mkdir(SUBMISSION_GALLERY_DIRECTORY, { recursive: true });
  await page.screenshot({
    path: path.join(SUBMISSION_GALLERY_DIRECTORY, filename),
    animations: "disabled",
  });
}
