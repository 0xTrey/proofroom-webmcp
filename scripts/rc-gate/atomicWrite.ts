import { chmodSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function writeJsonAtomically(
  destination: string,
  value: unknown,
  options: { mode?: number } = {},
): void {
  mkdirSync(dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp`;
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(temporary, payload, { encoding: "utf8" });
  if (options.mode !== undefined) {
    try {
      chmodSync(temporary, options.mode);
    } catch {
      // Restrictive mode is best-effort on platforms that do not support it.
    }
  }
  renameSync(temporary, destination);
  if (options.mode !== undefined) {
    try {
      chmodSync(destination, options.mode);
    } catch {
      // Restrictive mode is best-effort on platforms that do not support it.
    }
  }
}
