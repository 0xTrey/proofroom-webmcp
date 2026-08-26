/**
 * Input digest.
 *
 * This is a short, stable, browser-local fingerprint of an action input. It
 * exists so the room can detect a changed or stale proposal payload and so the
 * activity ledger can reference an input without storing it. It is not a
 * cryptographic hash, not a signature, and not evidence of identity or intent.
 */

/** Serializes a value with sorted object keys so equal inputs digest equally. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value ?? null) ?? "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort();

  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

/** 32 bit FNV-1a, run twice with different offsets for a 16 character digest. */
function fnv1a(input: string, offset: number): number {
  let hash = offset;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function inputDigest(value: unknown): string {
  const serialized = stableStringify(value);
  const first = fnv1a(serialized, 0x811c9dc5);
  const second = fnv1a(`${serialized}:proofroom`, 0x9e3779b1);
  return `${first.toString(16).padStart(8, "0")}${second.toString(16).padStart(8, "0")}`;
}
