import { z } from "zod";

export const LOCAL_QA_MAX_RECEIPT_BYTES = 128 * 1024;

const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);
const commitSchema = z.string().regex(/^[0-9a-f]{40}$/);
const utcDateTimeSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/)
  .max(32);

const treeDigestSchema = z.strictObject({
  algorithm: z.literal("sha256"),
  digest: sha256Schema,
  fileCount: z.number().int().nonnegative().max(10_000),
  totalBytes: z.number().int().nonnegative().max(500_000_000),
});

const stepRecordSchema = z.strictObject({
  id: z.string().min(1).max(80),
  command: z.string().min(1).max(120),
  args: z.array(z.string().max(120)).max(16),
  exitCode: z.number().int().min(0).max(255),
  status: z.enum(["passed", "failed"]),
});

export const localQaReceiptSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    generatedAt: utcDateTimeSchema,
    status: z.enum(["passed", "failed"]),
    candidateCommit: commitSchema,
    workspace: z.strictObject({
      filteredClean: z.boolean(),
      statusBefore: z.strictObject({
        algorithm: z.literal("sha256"),
        digest: sha256Schema,
        entryCount: z.number().int().nonnegative().max(10_000),
      }),
      statusAfter: z.strictObject({
        algorithm: z.literal("sha256"),
        digest: sha256Schema,
        entryCount: z.number().int().nonnegative().max(10_000),
      }),
      statusParity: z.boolean(),
    }),
    steps: z.array(stepRecordSchema).min(1).max(24),
    visualArtifacts: z.strictObject({
      before: treeDigestSchema,
      after: treeDigestSchema,
      byteIdentical: z.boolean(),
    }),
    evalArtifacts: z.strictObject({
      deterministicReportDigest: sha256Schema.nullable(),
      responsesCurrentDigest: sha256Schema.nullable(),
      liveAgentCurrentDigest: sha256Schema.nullable(),
    }),
  })
  .superRefine((record, context) => {
    const bytes = Buffer.byteLength(JSON.stringify(record), "utf8");
    if (bytes > LOCAL_QA_MAX_RECEIPT_BYTES) {
      context.addIssue({
        code: "custom",
        message: "Local QA receipt exceeds the bounded UTF-8 size.",
      });
    }
    const serialized = JSON.stringify(record);
    if (serialized.includes("/Users/") || serialized.includes(":\\")) {
      context.addIssue({
        code: "custom",
        message: "Local QA receipt must not contain absolute paths.",
      });
    }
    if (/https?:\/\/[^/\s:@]+:[^/\s@]+@/.test(serialized)) {
      context.addIssue({
        code: "custom",
        message: "Local QA receipt must not contain credential-bearing URLs.",
      });
    }
    if (/sk-[A-Za-z0-9]{8,}/.test(serialized)) {
      context.addIssue({
        code: "custom",
        message: "Local QA receipt must not contain secret-like values.",
      });
    }
    const failedStep = record.steps.find((step) => step.status === "failed");
    const stepsPassed = failedStep === undefined;
    const visualsOk = record.visualArtifacts.byteIdentical;
    const parityOk = record.workspace.statusParity;
    const evalDigestsComplete =
      record.evalArtifacts.deterministicReportDigest !== null &&
      record.evalArtifacts.responsesCurrentDigest !== null &&
      record.evalArtifacts.liveAgentCurrentDigest !== null;
    const expectedStatus =
      stepsPassed && visualsOk && parityOk && evalDigestsComplete ? "passed" : "failed";
    if (record.status !== expectedStatus) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Receipt status must match step, visual, and workspace parity outcomes.",
      });
    }
    if (record.status === "passed" && !record.workspace.statusParity) {
      context.addIssue({
        code: "custom",
        path: ["workspace", "statusParity"],
        message: "A passing QA receipt requires matching filtered status digests.",
      });
    }
    if (record.status === "passed") {
      if (
        record.evalArtifacts.deterministicReportDigest === null ||
        record.evalArtifacts.responsesCurrentDigest === null ||
        record.evalArtifacts.liveAgentCurrentDigest === null
      ) {
        context.addIssue({
          code: "custom",
          path: ["evalArtifacts"],
          message: "A passing QA receipt requires all eval artifact digests.",
        });
      }
    }
  });

export type LocalQaReceipt = z.infer<typeof localQaReceiptSchema>;

export function validateLocalQaReceipt(value: unknown): LocalQaReceipt {
  const serialized = JSON.stringify(value);
  const bytes = Buffer.byteLength(serialized, "utf8");
  if (bytes > LOCAL_QA_MAX_RECEIPT_BYTES) {
    throw new Error("Local QA receipt exceeds the bounded UTF-8 size.");
  }
  if (serialized.includes("/Users/") || serialized.includes(":\\")) {
    throw new Error("Local QA receipt must not contain absolute paths.");
  }
  if (/https?:\/\/[^/\s:@]+:[^/\s@]+@/.test(serialized)) {
    throw new Error("Local QA receipt must not contain credential-bearing URLs.");
  }
  if (/sk-[A-Za-z0-9]{8,}/.test(serialized)) {
    throw new Error("Local QA receipt must not contain secret-like values.");
  }
  return localQaReceiptSchema.parse(value);
}
