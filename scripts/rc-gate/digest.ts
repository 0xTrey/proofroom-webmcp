import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export function sha256Hex(bytes: Buffer | string): string {
  const source = typeof bytes === "string" ? Buffer.from(bytes, "utf8") : bytes;
  return createHash("sha256").update(source).digest("hex");
}

export function sha256File(path: string): string {
  return sha256Hex(readFileSync(path));
}
