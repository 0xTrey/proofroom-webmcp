/** Whole persisted artifact UTF-8 byte ceiling (256 KiB). */
export const MAX_ARTIFACT_UTF8_BYTES = 262_144;

export const MAX_ASSERTION_ID_LENGTH = 120;
export const MAX_ASSERTION_TEXT_LENGTH = 500;
export const MAX_BOUNDED_FINAL_ASSISTANT_TEXT_LENGTH = 500;

export const MAX_SAFE_INPUT_DIGESTS_PER_CASE = 16;
export const MAX_TOOL_SEQUENCE_ENTRIES_PER_CASE = 16;

export const MAX_REQUIREMENT_STATUS_ENTRIES = 64;
export const MAX_REQUIREMENT_STATUS_KEY_LENGTH = 120;
export const MAX_REQUIREMENT_STATUS_VALUE_LENGTH = 120;
export const MAX_TERMINAL_STATUS_STRING_LENGTH = 120;

/**
 * Production `inputDigest()` contract from `src/domain/hash.ts`: a stable 16-character
 * lowercase hexadecimal local input fingerprint. It is not a cryptographic hash,
 * signature, or proof of identity or intent.
 */
export const LOCAL_INPUT_FINGERPRINT_PATTERN = /^[a-f0-9]{16}$/;

/** Per-call safe input fingerprints persisted in completed case results. */
export const SAFE_INPUT_DIGEST_PATTERN = LOCAL_INPUT_FINGERPRINT_PATTERN;

/** Deterministic SHA-256 contract digest for cases, assertions, and tool schemas. */
export const CONTRACT_DIGEST_PATTERN = /^[a-f0-9]{64}$/;

export function assertArtifactByteCeiling(serialized: string | Buffer): void {
  const byteLength =
    typeof serialized === "string" ? Buffer.byteLength(serialized, "utf8") : serialized.byteLength;
  if (byteLength > MAX_ARTIFACT_UTF8_BYTES) {
    throw new Error(
      `Responses eval artifact exceeds the ${MAX_ARTIFACT_UTF8_BYTES} UTF-8 byte ceiling (${byteLength} bytes).`,
    );
  }
}
