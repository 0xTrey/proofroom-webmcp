import { z } from "zod";
import { RESPONSES_CASE_IDS } from "../../evals/responses-api/cases.ts";
import { TRUTH_LABELS } from "../../evals/responses-api/types.ts";
import type { LaneStatus } from "./classify.ts";
import {
  BLOCKING_REASON_CODES,
  BLOCKING_REASON_CODE_TO_LANES,
  type BlockingReasonLane,
} from "./reasons.ts";
import {
  CANONICAL_HUMAN_ONLY_ACTION_NAMES,
  CANONICAL_PRODUCT_TOOL_NAMES,
  EXPECTED_DETERMINISTIC_ASSERTIONS,
  EXPECTED_MANIFEST_DIGEST,
  EXPECTED_SEQUENCE_DIGEST,
  JUDGE_VISIBLE_APPROVAL_GATES,
} from "./productInvariants.ts";
import type { RcGateReceipt } from "./classify.ts";

export const RC_GATE_MAX_RECEIPT_BYTES = 256 * 1024;

const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);
const commitSchema = z.string().regex(/^[0-9a-f]{40}$/);
const utcDateTimeSchema = z
  .string()
  .max(32)
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/);
const repoPathSchema = z
  .string()
  .min(1)
  .max(240)
  .refine(
    (value) =>
      !value.startsWith("/") &&
      !value.includes("\\") &&
      !value.split("/").some((segment) => segment === "" || segment === "." || segment === ".."),
    "Paths must be repository-relative.",
  );

const laneStatusSchema = z.enum([
  "ready",
  "blocked",
  "stale",
  "passed",
  "failed",
  "not_run",
  "invalid",
  "verified",
] satisfies readonly LaneStatus[]);

const blockingReasonLaneSchema = z.enum([
  "localCandidate",
  "publicDeployment",
  "nativeWebMcp",
  "responsesApi",
  "compatibleBrowserAgent",
  "deterministic",
  "productInvariants",
  "receipt",
] satisfies readonly BlockingReasonLane[]);

const identifierValueSchema = z.union([
  z.string().max(120),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

const laneReceiptSchema = z.strictObject({
  status: laneStatusSchema,
  sourcePath: repoPathSchema,
  digest: sha256Schema.nullable(),
  identifiers: z
    .record(z.string().max(80), identifierValueSchema)
    .refine((record) => Object.keys(record).length <= 24, "Lane identifiers exceed 24 entries."),
});

const blockingReasonSchema = z
  .strictObject({
    code: z.enum(BLOCKING_REASON_CODES),
    lane: blockingReasonLaneSchema,
    message: z.string().min(1).max(240),
  })
  .superRefine((record, context) => {
    const allowed = BLOCKING_REASON_CODE_TO_LANES[record.code];
    if (!allowed.includes(record.lane)) {
      context.addIssue({
        code: "custom",
        path: ["lane"],
        message: "Blocking reason code and lane pairing is invalid.",
      });
    }
  });

const truthLabelValueSchema = z.union([z.string().max(120), z.boolean()]);
const truthLabelsSchema = z
  .record(z.string().max(80), truthLabelValueSchema)
  .nullable()
  .refine(
    (record) => record === null || Object.keys(record).length <= 12,
    "Truth labels exceed 12 entries.",
  );

function assertReceiptByteSize(value: unknown, context: z.RefinementCtx): void {
  const bytes = Buffer.byteLength(JSON.stringify(value), "utf8");
  if (bytes > RC_GATE_MAX_RECEIPT_BYTES) {
    context.addIssue({
      code: "custom",
      message: "Receipt exceeds the bounded UTF-8 size.",
    });
  }
}

const readyLaneStatuses = {
  localCandidate: "ready",
  publicDeployment: "ready",
  nativeWebMcp: "passed",
  responsesApi: "passed",
  compatibleBrowserAgent: "verified",
  deterministic: "passed",
  productInvariants: "passed",
} as const;

function arraysEqualProduct(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function assertReadyReceiptSemantics(
  record: z.infer<typeof rcGateReceiptSchema>,
  context: z.RefinementCtx,
): void {
  const laneKeys = Object.keys(readyLaneStatuses) as Array<keyof typeof readyLaneStatuses>;
  for (const laneKey of laneKeys) {
    const lane = record.lanes[laneKey];
    if (lane.status !== readyLaneStatuses[laneKey]) {
      context.addIssue({
        code: "custom",
        path: ["lanes", laneKey, "status"],
        message: "Ready receipts require exact positive lane summary statuses.",
      });
    }
    if (lane.digest === null) {
      context.addIssue({
        code: "custom",
        path: ["lanes", laneKey, "digest"],
        message: "Ready receipts require non-null lane summary digests.",
      });
    }
  }

  if (record.localQa.digest === null) {
    context.addIssue({
      code: "custom",
      path: ["localQa", "digest"],
      message: "Ready receipts require a non-null local QA digest.",
    });
  }
  if (record.localQa.candidateCommit === null) {
    context.addIssue({
      code: "custom",
      path: ["localQa", "candidateCommit"],
      message: "Ready receipts require a non-null local QA candidate commit.",
    });
  }
  if (record.localQa.workspaceStatusDigest === null) {
    context.addIssue({
      code: "custom",
      path: ["localQa", "workspaceStatusDigest"],
      message: "Ready receipts require a non-null workspace status digest.",
    });
  }

  if (
    record.deterministic.status !== "passed" ||
    record.deterministic.passedCases !== 12 ||
    record.deterministic.failedCases !== 0 ||
    record.deterministic.assertions !== EXPECTED_DETERMINISTIC_ASSERTIONS ||
    record.deterministic.manifestDigest !== EXPECTED_MANIFEST_DIGEST ||
    record.deterministic.expectedSequenceDigest !== EXPECTED_SEQUENCE_DIGEST ||
    !arraysEqualProduct(record.deterministic.toolNames ?? [], CANONICAL_PRODUCT_TOOL_NAMES)
  ) {
    context.addIssue({
      code: "custom",
      path: ["deterministic"],
      message: "Ready receipts require exact deterministic pass counts, digests, and tool names.",
    });
  }

  const truthLabels = record.responsesApi.truthLabels;
  const truthMatches =
    truthLabels !== null &&
    truthLabels.classification === TRUTH_LABELS.classification &&
    truthLabels.provesNativeWebMcpDiscovery === TRUTH_LABELS.provesNativeWebMcpDiscovery &&
    truthLabels.provesCompatibleBrowserAgent === TRUTH_LABELS.provesCompatibleBrowserAgent &&
    truthLabels.liveBrowserAgentStatus === TRUTH_LABELS.liveBrowserAgentStatus &&
    truthLabels.euDataResidency === TRUTH_LABELS.euDataResidency;
  if (
    record.responsesApi.status !== "passed" ||
    record.responsesApi.model === null ||
    record.responsesApi.startedAt === null ||
    record.responsesApi.completedAt === null ||
    record.responsesApi.aggregateScore !== 100 ||
    record.responsesApi.casePassCount !== 7 ||
    record.responsesApi.caseFailCount !== 0 ||
    record.responsesApi.contractDigest === null ||
    !arraysEqualProduct(record.responsesApi.caseIds ?? [], RESPONSES_CASE_IDS) ||
    !truthMatches
  ) {
    context.addIssue({
      code: "custom",
      path: ["responsesApi"],
      message: "Ready receipts require exact Responses pass counts, case IDs, and truth labels.",
    });
  }

  if (
    record.publicDeployment.status !== "ready" ||
    record.publicDeployment.releaseId === null ||
    record.publicDeployment.state === null ||
    record.publicDeployment.sourceCommit === null ||
    record.publicDeployment.deploymentCommit === null ||
    record.publicDeployment.deploymentId === null ||
    record.publicDeployment.publicOrigin === null ||
    record.publicDeployment.deployedAt === null ||
    record.publicDeployment.verifiedAt === null ||
    record.publicDeployment.httpReceiptDigest === null ||
    record.publicDeployment.nativeReceiptDigest === null
  ) {
    context.addIssue({
      code: "custom",
      path: ["publicDeployment"],
      message: "Ready receipts require complete public deployment identifiers and digests.",
    });
  }

  if (
    record.nativeWebMcp.status !== "passed" ||
    record.nativeWebMcp.product === null ||
    record.nativeWebMcp.version === null ||
    record.nativeWebMcp.headed !== true ||
    record.nativeWebMcp.toolCountBefore !== 9 ||
    record.nativeWebMcp.toolCountAfter !== 9 ||
    record.nativeWebMcp.executionStatus !== "passed" ||
    record.nativeWebMcp.publicOrigin === null ||
    record.nativeWebMcp.entryPath === null ||
    record.nativeWebMcp.entrySha256 === null ||
    record.nativeWebMcp.entryByteCount === null ||
    record.nativeWebMcp.cspParity !== true ||
    record.nativeWebMcp.applicationErrorTotal !== 0
  ) {
    context.addIssue({
      code: "custom",
      path: ["nativeWebMcp"],
      message: "Ready receipts require complete native WebMCP pass evidence.",
    });
  }

  if (
    record.compatibleBrowserAgent.status !== "verified" ||
    record.compatibleBrowserAgent.browserAgentName === null ||
    record.compatibleBrowserAgent.browserVersion === null ||
    record.compatibleBrowserAgent.testedOrigin === null ||
    record.compatibleBrowserAgent.appBuildIdentifier === null ||
    record.compatibleBrowserAgent.verifiedAt === null ||
    record.compatibleBrowserAgent.casePassCount !== 12 ||
    record.compatibleBrowserAgent.caseFailCount !== 0 ||
    record.compatibleBrowserAgent.evidencePaths === null
  ) {
    context.addIssue({
      code: "custom",
      path: ["compatibleBrowserAgent"],
      message: "Ready receipts require complete compatible browser-agent verification evidence.",
    });
  }

  if (
    record.productInvariants.status !== "passed" ||
    record.productInvariants.canonicalEuResidencyStatus !== "unknown" ||
    record.productInvariants.humanOnlyAbsentFromTools !== true
  ) {
    context.addIssue({
      code: "custom",
      path: ["productInvariants"],
      message: "Ready receipts require passing product invariants with EU unknown.",
    });
  }
}

function assertNoSensitiveContent(serialized: string, context: z.RefinementCtx): void {
  if (serialized.includes("/Users/") || serialized.includes(":\\")) {
    context.addIssue({
      code: "custom",
      message: "Receipt must not contain absolute paths.",
    });
  }
  if (/https?:\/\/[^/\s:@]+:[^/\s@]+@/.test(serialized)) {
    context.addIssue({
      code: "custom",
      message: "Receipt must not contain credential-bearing URLs.",
    });
  }
  if (/sk-[A-Za-z0-9]{8,}/.test(serialized)) {
    context.addIssue({
      code: "custom",
      message: "Receipt must not contain secret-like values.",
    });
  }
}

export const rcGateReceiptSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    generatedAt: utcDateTimeSchema,
    status: z.enum(["ready", "blocked"]),
    recordingEvidenceReady: z.boolean(),
    submissionTechnicalEvidenceReady: z.boolean(),
    candidate: z.strictObject({
      head: commitSchema,
      filteredClean: z.boolean(),
      filteredStatusDigest: sha256Schema,
      filteredStatusEntryCount: z.number().int().nonnegative().max(10_000),
    }),
    lanes: z.strictObject({
      localCandidate: laneReceiptSchema,
      publicDeployment: laneReceiptSchema,
      nativeWebMcp: laneReceiptSchema,
      responsesApi: laneReceiptSchema,
      compatibleBrowserAgent: laneReceiptSchema,
      deterministic: laneReceiptSchema,
      productInvariants: laneReceiptSchema,
    }),
    localQa: z.strictObject({
      sourcePath: repoPathSchema,
      digest: sha256Schema.nullable(),
      status: z.enum(["passed", "failed", "missing", "invalid"]),
      candidateCommit: commitSchema.nullable(),
      workspaceStatusDigest: sha256Schema.nullable(),
      workspaceParity: z.boolean().nullable(),
      stepSummary: z
        .array(
          z.strictObject({
            id: z.string().max(80),
            status: z.enum(["passed", "failed"]),
          }),
        )
        .max(24),
      evalArtifactDigests: z.strictObject({
        deterministicReport: sha256Schema.nullable(),
        responsesCurrent: sha256Schema.nullable(),
        liveAgentCurrent: sha256Schema.nullable(),
      }),
    }),
    deterministic: z.strictObject({
      sourcePath: repoPathSchema,
      digest: sha256Schema,
      manifestDigest: sha256Schema.nullable(),
      expectedSequenceDigest: sha256Schema.nullable(),
      passedCases: z.number().int().nonnegative().max(100).nullable(),
      failedCases: z.number().int().nonnegative().max(100).nullable(),
      assertions: z.number().int().nonnegative().max(10_000).nullable(),
      toolNames: z.array(z.string().max(80)).max(12).nullable(),
      status: z.enum(["passed", "failed", "invalid"]),
    }),
    responsesApi: z.strictObject({
      sourcePath: repoPathSchema,
      digest: sha256Schema,
      status: z.enum(["passed", "failed", "not_run", "invalid"]),
      model: z.string().max(120).nullable(),
      startedAt: utcDateTimeSchema.nullable(),
      completedAt: utcDateTimeSchema.nullable(),
      caseIds: z.array(z.string().max(80)).max(12).nullable(),
      aggregateScore: z.number().finite().min(0).max(100).nullable(),
      casePassCount: z.number().int().nonnegative().max(12).nullable(),
      caseFailCount: z.number().int().nonnegative().max(12).nullable(),
      contractDigest: sha256Schema.nullable(),
      truthLabels: truthLabelsSchema,
    }),
    publicDeployment: z.strictObject({
      sourcePath: repoPathSchema,
      digest: sha256Schema,
      releaseId: z.string().max(120).nullable(),
      state: z.string().max(40).nullable(),
      sourceCommit: commitSchema.nullable(),
      deploymentCommit: commitSchema.nullable(),
      deploymentId: z.string().max(120).nullable(),
      publicOrigin: z.string().max(240).nullable(),
      deployedAt: utcDateTimeSchema.nullable(),
      verifiedAt: utcDateTimeSchema.nullable(),
      httpReceiptDigest: sha256Schema.nullable(),
      nativeReceiptDigest: sha256Schema.nullable(),
      status: z.enum(["ready", "stale", "blocked", "invalid"]),
    }),
    nativeWebMcp: z.strictObject({
      sourcePath: repoPathSchema,
      digest: sha256Schema.nullable(),
      status: laneStatusSchema,
      product: z.string().max(80).nullable(),
      version: z.string().max(40).nullable(),
      headed: z.boolean().nullable(),
      toolCountBefore: z.number().int().nonnegative().max(20).nullable(),
      toolCountAfter: z.number().int().nonnegative().max(20).nullable(),
      executionStatus: z.string().max(40).nullable(),
      publicOrigin: z.string().max(240).nullable(),
      entryPath: z.string().max(240).nullable(),
      entrySha256: sha256Schema.nullable(),
      entryByteCount: z.number().int().nonnegative().max(50_000_000).nullable(),
      cspParity: z.boolean().nullable(),
      applicationErrorTotal: z.number().int().nonnegative().max(10_000).nullable(),
    }),
    compatibleBrowserAgent: z.strictObject({
      sourcePath: repoPathSchema,
      digest: sha256Schema,
      status: z.enum(["verified", "failed", "not_run", "invalid"]),
      browserAgentName: z.string().max(120).nullable(),
      browserVersion: z.string().max(120).nullable(),
      testedOrigin: z.string().max(240).nullable(),
      appBuildIdentifier: z.string().max(120).nullable(),
      verifiedAt: utcDateTimeSchema.nullable(),
      casePassCount: z.number().int().nonnegative().max(12).nullable(),
      caseFailCount: z.number().int().nonnegative().max(12).nullable(),
      evidencePaths: z.array(repoPathSchema).max(12).nullable(),
    }),
    productInvariants: z.strictObject({
      status: z.enum(["passed", "failed"]),
      digest: sha256Schema,
      toolNames: z.array(z.string().max(80)).length(9),
      humanOnlyActionNames: z.array(z.string().max(80)).length(7),
      judgeVisibleApprovalGates: z.array(z.string().max(80)).length(2),
      canonicalEuResidencyStatus: z.literal("unknown"),
      humanOnlyAbsentFromTools: z.boolean(),
    }),
    blockingReasons: z.array(blockingReasonSchema).max(48),
  })
  .superRefine((record, context) => {
    assertReceiptByteSize(record, context);
    const serialized = JSON.stringify(record);
    assertNoSensitiveContent(serialized, context);

    if (
      record.recordingEvidenceReady !== record.submissionTechnicalEvidenceReady ||
      record.recordingEvidenceReady !== (record.status === "ready")
    ) {
      context.addIssue({
        code: "custom",
        path: ["recordingEvidenceReady"],
        message: "Readiness booleans must match blocked or ready status.",
      });
    }

    const codes = record.blockingReasons.map((reason) => `${reason.code}|${reason.lane}`);
    if (new Set(codes).size !== codes.length) {
      context.addIssue({
        code: "custom",
        path: ["blockingReasons"],
        message: "Blocking reasons must be canonical and unique per lane.",
      });
    }

    if (record.status === "ready" && record.blockingReasons.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Ready receipts cannot contain blocking reasons.",
      });
    }
    if (record.status === "blocked" && record.blockingReasons.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["blockingReasons"],
        message: "Blocked receipts must contain at least one blocking reason.",
      });
    }

    if (record.status === "ready") {
      if (!record.candidate.filteredClean) {
        context.addIssue({
          code: "custom",
          path: ["candidate", "filteredClean"],
          message: "Ready receipts require a clean filtered worktree.",
        });
      }
      if (record.localQa.status !== "passed" || record.localQa.workspaceParity !== true) {
        context.addIssue({
          code: "custom",
          path: ["localQa", "status"],
          message: "Ready receipts require a passing local QA receipt with workspace parity.",
        });
      }
      if (
        record.localQa.evalArtifactDigests.deterministicReport === null ||
        record.localQa.evalArtifactDigests.responsesCurrent === null ||
        record.localQa.evalArtifactDigests.liveAgentCurrent === null
      ) {
        context.addIssue({
          code: "custom",
          path: ["localQa", "evalArtifactDigests"],
          message: "Ready receipts require all eval artifact digests.",
        });
      }
      assertReadyReceiptSemantics(record, context);
    }

    if (
      !arraysEqualProduct(record.productInvariants.toolNames, CANONICAL_PRODUCT_TOOL_NAMES) ||
      !arraysEqualProduct(record.productInvariants.humanOnlyActionNames, CANONICAL_HUMAN_ONLY_ACTION_NAMES) ||
      !arraysEqualProduct(record.productInvariants.judgeVisibleApprovalGates, JUDGE_VISIBLE_APPROVAL_GATES)
    ) {
      context.addIssue({
        code: "custom",
        path: ["productInvariants"],
        message: "Product invariant arrays must match canonical literals.",
      });
    }
  });

export function validateRcGateReceiptDocument(value: unknown): RcGateReceipt {
  const bytes = Buffer.byteLength(JSON.stringify(value), "utf8");
  if (bytes > RC_GATE_MAX_RECEIPT_BYTES) {
    throw new Error("Receipt exceeds the bounded UTF-8 size.");
  }
  return rcGateReceiptSchema.parse(value) as RcGateReceipt;
}
