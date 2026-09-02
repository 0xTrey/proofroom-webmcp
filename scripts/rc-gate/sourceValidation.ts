import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateResponsesRecordData } from "../../evals/responses-api/validate.ts";
import type { ValidatedResponsesRecord } from "../../evals/responses-api/validate.ts";
import { liveAgentRecordSchema } from "../../evals/live-agent/validate.ts";
import type { LiveAgentRecord } from "../../evals/live-agent/validate.ts";
import {
  validateReleaseReceiptDocument,
  validateReleaseReceiptEvidence,
} from "../release-receipt.ts";
import { validateDeterministicReportData } from "./deterministicValidator.ts";
import { sha256Hex } from "./digest.ts";
import { RELEASE_RECEIPT_PATH } from "./paths.ts";
import { readBoundedContainedJson } from "./safeRead.ts";
import type { BlockingReasonCode } from "./reasons.ts";

const MAX_RELEASE_RECEIPT_BYTES = 512_000;
const MAX_EVIDENCE_JSON_BYTES = 256_000;

export type SourceValidationFact = {
  valid: boolean;
  reasonCode: BlockingReasonCode | null;
  message: string | null;
};

export type ReleaseEvidenceValidation = {
  httpReceipt: unknown;
  nativeReceipt: unknown;
  httpReceiptDigest: string;
  nativeReceiptDigest: string;
};

export type RcGateSourceValidation = {
  releaseDocument: SourceValidationFact;
  releaseEvidence: SourceValidationFact;
  deterministic: SourceValidationFact;
  responses: SourceValidationFact;
  liveAgent: SourceValidationFact;
  validatedRelease: Record<string, unknown> | null;
  validatedReleaseEvidence: ReleaseEvidenceValidation | null;
  validatedDeterministic: Record<string, unknown> | null;
  validatedResponses: ValidatedResponsesRecord | null;
  validatedLiveAgent: LiveAgentRecord | null;
};

export type ReleaseSourceInput = {
  releaseBytes: Buffer | null;
  releaseDigest: string | null;
};

function invalidFact(
  reasonCode: BlockingReasonCode,
  message: string,
): SourceValidationFact {
  return {
    valid: false,
    reasonCode,
    message: message.slice(0, 240),
  };
}

function validFact(): SourceValidationFact {
  return { valid: true, reasonCode: null, message: null };
}

function record(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function repositoryRelativePath(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  if (
    value.startsWith("/") ||
    value.includes("\\") ||
    value.split("/").includes("..")
  ) {
    return null;
  }
  return value;
}

function parseReleaseBytes(bytes: Buffer): unknown {
  return JSON.parse(bytes.toString("utf8")) as unknown;
}

export function validateReleaseSources(
  repositoryRoot: string,
  input: ReleaseSourceInput,
): Pick<
  RcGateSourceValidation,
  "releaseDocument" | "releaseEvidence" | "validatedRelease" | "validatedReleaseEvidence"
> {
  const { releaseBytes, releaseDigest: suppliedDigest } = input;
  if (releaseBytes === null || suppliedDigest === null) {
    return {
      releaseDocument: invalidFact(
        "RELEASE_DOCUMENT_INVALID",
        "Final release receipt is missing or unreadable.",
      ),
      releaseEvidence: invalidFact(
        "RELEASE_EVIDENCE_INVALID",
        "Referenced release evidence cannot be validated without a release receipt.",
      ),
      validatedRelease: null,
      validatedReleaseEvidence: null,
    };
  }

  if (releaseBytes.byteLength > MAX_RELEASE_RECEIPT_BYTES) {
    return {
      releaseDocument: invalidFact(
        "RELEASE_DOCUMENT_INVALID",
        "Final release receipt exceeds the bounded file size.",
      ),
      releaseEvidence: invalidFact(
        "RELEASE_EVIDENCE_INVALID",
        "Referenced release evidence was not validated because the release receipt is invalid.",
      ),
      validatedRelease: null,
      validatedReleaseEvidence: null,
    };
  }

  const computedDigest = sha256Hex(releaseBytes);
  if (suppliedDigest !== computedDigest) {
    return {
      releaseDocument: invalidFact(
        "RELEASE_DOCUMENT_INVALID",
        "Final release receipt digest does not match file bytes.",
      ),
      releaseEvidence: invalidFact(
        "RELEASE_EVIDENCE_INVALID",
        "Referenced release evidence was not validated because the release receipt digest is invalid.",
      ),
      validatedRelease: null,
      validatedReleaseEvidence: null,
    };
  }

  let releaseRaw: unknown;
  try {
    releaseRaw = parseReleaseBytes(releaseBytes);
  } catch {
    return {
      releaseDocument: invalidFact(
        "RELEASE_DOCUMENT_INVALID",
        "Final release receipt is not valid JSON.",
      ),
      releaseEvidence: invalidFact(
        "RELEASE_EVIDENCE_INVALID",
        "Referenced release evidence was not validated because the release receipt is invalid.",
      ),
      validatedRelease: null,
      validatedReleaseEvidence: null,
    };
  }

  let validatedRelease: Record<string, unknown>;
  try {
    validatedRelease = validateReleaseReceiptDocument(releaseRaw);
  } catch {
    return {
      releaseDocument: invalidFact(
        "RELEASE_DOCUMENT_INVALID",
        "Final release receipt failed canonical document validation.",
      ),
      releaseEvidence: invalidFact(
        "RELEASE_EVIDENCE_INVALID",
        "Referenced release evidence was not validated because the release receipt is invalid.",
      ),
      validatedRelease: null,
      validatedReleaseEvidence: null,
    };
  }

  try {
    validateReleaseReceiptEvidence(validatedRelease, repositoryRoot);
  } catch {
    return {
      releaseDocument: validFact(),
      releaseEvidence: invalidFact(
        "RELEASE_EVIDENCE_INVALID",
        "Referenced release evidence failed canonical validation.",
      ),
      validatedRelease,
      validatedReleaseEvidence: null,
    };
  }

  const verification = record(validatedRelease.verification);
  const httpVerifier = record(verification?.httpVerifier);
  const nativeChrome = record(verification?.nativeChrome);
  const httpPath = repositoryRelativePath(httpVerifier?.receiptPath);
  const nativePath = repositoryRelativePath(nativeChrome?.evidencePath);
  if (!httpPath || !nativePath) {
    return {
      releaseDocument: validFact(),
      releaseEvidence: invalidFact(
        "RELEASE_EVIDENCE_INVALID",
        "Referenced release evidence paths are invalid.",
      ),
      validatedRelease,
      validatedReleaseEvidence: null,
    };
  }

  try {
    const httpRead = readBoundedContainedJson(repositoryRoot, httpPath, MAX_EVIDENCE_JSON_BYTES);
    const nativeRead = readBoundedContainedJson(repositoryRoot, nativePath, MAX_EVIDENCE_JSON_BYTES);
    return {
      releaseDocument: validFact(),
      releaseEvidence: validFact(),
      validatedRelease,
      validatedReleaseEvidence: {
        httpReceipt: httpRead.parsed,
        nativeReceipt: nativeRead.parsed,
        httpReceiptDigest: httpRead.digest,
        nativeReceiptDigest: nativeRead.digest,
      },
    };
  } catch {
    return {
      releaseDocument: validFact(),
      releaseEvidence: invalidFact(
        "RELEASE_EVIDENCE_INVALID",
        "Referenced release evidence could not be loaded after validation.",
      ),
      validatedRelease,
      validatedReleaseEvidence: null,
    };
  }
}

export function readBoundedReleaseReceipt(repositoryRoot: string): ReleaseSourceInput & {
  releaseRaw: unknown | null;
} {
  const releasePath = resolve(repositoryRoot, RELEASE_RECEIPT_PATH);
  try {
    const releaseBytes = readFileSync(releasePath);
    if (releaseBytes.byteLength > MAX_RELEASE_RECEIPT_BYTES) {
      return { releaseBytes: null, releaseRaw: null, releaseDigest: null };
    }
    return {
      releaseBytes,
      releaseRaw: JSON.parse(releaseBytes.toString("utf8")) as unknown,
      releaseDigest: sha256Hex(releaseBytes),
    };
  } catch {
    return { releaseBytes: null, releaseRaw: null, releaseDigest: null };
  }
}

export function validateDeterministicSource(raw: unknown | null): Pick<
  RcGateSourceValidation,
  "deterministic" | "validatedDeterministic"
> {
  if (raw === null) {
    return {
      deterministic: invalidFact(
        "SOURCE_INVALID",
        "Deterministic eval report is missing or malformed.",
      ),
      validatedDeterministic: null,
    };
  }
  try {
    return {
      deterministic: validFact(),
      validatedDeterministic: validateDeterministicReportData(raw),
    };
  } catch {
    return {
      deterministic: invalidFact(
        "SOURCE_INVALID",
        "Deterministic eval report failed canonical validation.",
      ),
      validatedDeterministic: null,
    };
  }
}

export function validateResponsesSource(raw: unknown | null): Pick<
  RcGateSourceValidation,
  "responses" | "validatedResponses"
> {
  if (raw === null) {
    return {
      responses: invalidFact("SOURCE_INVALID", "Responses API artifact is missing or malformed."),
      validatedResponses: null,
    };
  }
  try {
    return {
      responses: validFact(),
      validatedResponses: validateResponsesRecordData(raw),
    };
  } catch {
    return {
      responses: invalidFact(
        "SOURCE_INVALID",
        "Responses API artifact failed canonical validation.",
      ),
      validatedResponses: null,
    };
  }
}

export function validateLiveAgentSource(raw: unknown | null): Pick<
  RcGateSourceValidation,
  "liveAgent" | "validatedLiveAgent"
> {
  if (raw === null) {
    return {
      liveAgent: invalidFact(
        "SOURCE_INVALID",
        "Compatible browser-agent evidence is missing or malformed.",
      ),
      validatedLiveAgent: null,
    };
  }
  try {
    return {
      liveAgent: validFact(),
      validatedLiveAgent: liveAgentRecordSchema.parse(raw),
    };
  } catch {
    return {
      liveAgent: invalidFact(
        "SOURCE_INVALID",
        "Compatible browser-agent evidence failed canonical validation.",
      ),
      validatedLiveAgent: null,
    };
  }
}

function validateReleaseDocumentInput(input: ReleaseSourceInput): Pick<
  RcGateSourceValidation,
  "releaseDocument" | "validatedRelease"
> {
  const { releaseBytes, releaseDigest: suppliedDigest } = input;
  if (releaseBytes === null || suppliedDigest === null) {
    return {
      releaseDocument: invalidFact(
        "RELEASE_DOCUMENT_INVALID",
        "Final release receipt is missing or unreadable.",
      ),
      validatedRelease: null,
    };
  }
  if (releaseBytes.byteLength > MAX_RELEASE_RECEIPT_BYTES) {
    return {
      releaseDocument: invalidFact(
        "RELEASE_DOCUMENT_INVALID",
        "Final release receipt exceeds the bounded file size.",
      ),
      validatedRelease: null,
    };
  }
  const computedDigest = sha256Hex(releaseBytes);
  if (suppliedDigest !== computedDigest) {
    return {
      releaseDocument: invalidFact(
        "RELEASE_DOCUMENT_INVALID",
        "Final release receipt digest does not match file bytes.",
      ),
      validatedRelease: null,
    };
  }
  try {
    return {
      releaseDocument: validFact(),
      validatedRelease: validateReleaseReceiptDocument(parseReleaseBytes(releaseBytes)),
    };
  } catch {
    return {
      releaseDocument: invalidFact(
        "RELEASE_DOCUMENT_INVALID",
        "Final release receipt failed canonical document validation.",
      ),
      validatedRelease: null,
    };
  }
}

export function buildSourceValidationFromInputs(
  input: {
    releaseBytes: Buffer | null;
    releaseDigest: string | null;
    deterministicRaw: unknown | null;
    responsesRaw: unknown | null;
    liveAgentRaw: unknown | null;
    releaseEvidence?: {
      httpReceipt: unknown;
      nativeReceipt: unknown;
      httpReceiptDigest: string;
      nativeReceiptDigest: string;
    } | null;
  },
  overrides?: Partial<RcGateSourceValidation>,
): RcGateSourceValidation {
  const releaseDocumentResult = validateReleaseDocumentInput({
    releaseBytes: input.releaseBytes,
    releaseDigest: input.releaseDigest,
  });

  let releaseEvidence: SourceValidationFact;
  let validatedReleaseEvidence: ReleaseEvidenceValidation | null = null;
  if (!releaseDocumentResult.releaseDocument.valid) {
    releaseEvidence = invalidFact(
      "RELEASE_EVIDENCE_INVALID",
      "Referenced release evidence was not validated because the release receipt is invalid.",
    );
  } else if (!input.releaseEvidence) {
    releaseEvidence = invalidFact(
      "RELEASE_EVIDENCE_INVALID",
      "Referenced release evidence is missing from validated inputs.",
    );
  } else {
    releaseEvidence = validFact();
    validatedReleaseEvidence = input.releaseEvidence;
  }

  const deterministic = validateDeterministicSource(input.deterministicRaw);
  const responses = validateResponsesSource(input.responsesRaw);
  const liveAgent = validateLiveAgentSource(input.liveAgentRaw);

  return {
    releaseDocument: releaseDocumentResult.releaseDocument,
    releaseEvidence,
    deterministic: deterministic.deterministic,
    responses: responses.responses,
    liveAgent: liveAgent.liveAgent,
    validatedRelease: releaseDocumentResult.validatedRelease,
    validatedReleaseEvidence,
    validatedDeterministic: deterministic.validatedDeterministic,
    validatedResponses: responses.validatedResponses,
    validatedLiveAgent: liveAgent.validatedLiveAgent,
    ...overrides,
  };
}

export function buildSourceValidation(
  repositoryRoot: string,
  input: {
    releaseBytes: Buffer | null;
    releaseDigest: string | null;
    deterministicRaw: unknown | null;
    responsesRaw: unknown | null;
    liveAgentRaw: unknown | null;
  },
  overrides?: Partial<RcGateSourceValidation>,
): RcGateSourceValidation {
  const release = validateReleaseSources(repositoryRoot, {
    releaseBytes: input.releaseBytes,
    releaseDigest: input.releaseDigest,
  });
  const deterministic = validateDeterministicSource(input.deterministicRaw);
  const responses = validateResponsesSource(input.responsesRaw);
  const liveAgent = validateLiveAgentSource(input.liveAgentRaw);
  return {
    ...release,
    ...deterministic,
    ...responses,
    ...liveAgent,
    ...overrides,
  };
}

export { readBoundedContainedJson } from "./safeRead.ts";
