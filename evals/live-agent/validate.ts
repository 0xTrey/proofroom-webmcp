import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { EVAL_CASE_IDS } from "../contract.ts";
import { TOOL_NAMES } from "../../src/webmcp/toolDefinitions.ts";

const manifest = JSON.parse(
  readFileSync(resolve(process.cwd(), "evals", "manifest.json"), "utf8"),
) as { cases: Array<{ id: (typeof EVAL_CASE_IDS)[number]; prompt: string }> };

export const LIVE_AGENT_PROMPT_DIGESTS = Object.fromEntries(
  manifest.cases.map((entry) => [
    entry.id,
    createHash("sha256").update(entry.prompt).digest("hex"),
  ]),
) as Record<(typeof EVAL_CASE_IDS)[number], string>;

const evidencePathSchema = z
  .string()
  .min(1)
  .max(240)
  .refine(
    (path) => !path.startsWith("/") && !path.split("/").includes(".."),
    "Evidence paths must be repository-relative.",
  );

const environmentSchema = z.strictObject({
  browserAgentName: z
    .string()
    .min(1)
    .max(120)
    .refine((value) => value.toLowerCase() !== "unknown"),
  browserVersion: z.string().min(1).max(120).regex(/\d/),
  testedUrl: z
    .string()
    .url()
    .refine((value) => value.startsWith("https://") || value.startsWith("http://")),
  appBuildIdentifier: z.string().min(1).max(120),
});

const liveCaseSchema = z.strictObject({
  promptId: z.enum(EVAL_CASE_IDS),
  promptTextSha256: z.string().regex(/^[a-f0-9]{64}$/),
  outcome: z.enum(["pass", "fail"]),
  observedToolSequence: z.array(z.enum(TOOL_NAMES)).max(24),
  resultEvidencePath: evidencePathSchema,
});

const notRunSchema = z.strictObject({
  schemaVersion: z.literal(2),
  status: z.literal("not_run"),
  reason: z.string().min(20).max(500),
  environment: z.strictObject({
    browserAgentName: z.null(),
    browserVersion: z.null(),
    testedUrl: z.null(),
    appBuildIdentifier: z.null(),
  }),
  toolDiscoveryEvidencePath: z.null(),
  verifiedAt: z.null(),
  verifierLabel: z.null(),
  knownDeviations: z.array(z.never()).length(0),
  cases: z.array(z.never()).length(0),
});

const completedSchema = z
  .strictObject({
    schemaVersion: z.literal(2),
    status: z.enum(["verified", "failed"]),
    reason: z.string().min(20).max(500),
    environment: environmentSchema,
    toolDiscoveryEvidencePath: evidencePathSchema,
    verifiedAt: z.string().datetime({ offset: true }),
    verifierLabel: z.string().min(1).max(120),
    knownDeviations: z.array(z.string().min(1).max(500)).max(24),
    cases: z.array(liveCaseSchema).length(12),
  })
  .superRefine((record, context) => {
    const ids = record.cases.map((entry) => entry.promptId);
    const missing = EVAL_CASE_IDS.filter((id) => !ids.includes(id));
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (missing.length > 0 || duplicates.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["cases"],
        message: "Completed evidence must contain each manifest case exactly once.",
      });
    }
    for (const [index, liveCase] of record.cases.entries()) {
      if (liveCase.promptTextSha256 !== LIVE_AGENT_PROMPT_DIGESTS[liveCase.promptId]) {
        context.addIssue({
          code: "custom",
          path: ["cases", index, "promptTextSha256"],
          message: "Prompt text digest must match the exact manifest prompt.",
        });
      }
    }
    const allPassed = record.cases.every((entry) => entry.outcome === "pass");
    if ((record.status === "verified") !== allPassed) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "verified requires every case to pass; any failed case requires failed status.",
      });
    }
  });

export const liveAgentRecordSchema = z.union([notRunSchema, completedSchema]);
export type LiveAgentRecord = z.infer<typeof liveAgentRecordSchema>;

export function validateLiveAgentRecord(path: string): LiveAgentRecord {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  return liveAgentRecordSchema.parse(parsed);
}

if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) {
  const path = process.argv[2] ?? resolve(process.cwd(), "evals", "live-agent", "current.json");
  try {
    const record = validateLiveAgentRecord(path);
    console.log(
      record.status === "not_run"
        ? "Live browser-agent evidence: NOT RUN (valid and unverified)."
        : `Live browser-agent evidence: ${record.status.toUpperCase()} (${record.cases.length} cases).`,
    );
  } catch {
    console.error("Live browser-agent evidence is invalid.");
    process.exitCode = 1;
  }
}
