import { describe, expect, it, vi } from "vitest";
import {
  QA_STEPS,
  runQa,
  type QaStep,
  type TreeDigest,
} from "../../scripts/qa.ts";

const stableVisualDigest: TreeDigest = {
  algorithm: "sha256",
  digest: "a".repeat(64),
  fileCount: 49,
  totalBytes: 13_924_973,
};

describe("aggregate QA orchestration", () => {
  it("uses the required named bundle command", () => {
    expect(QA_STEPS.find((step) => step.id === "bundle_budget")).toEqual({
      id: "bundle_budget",
      command: "npm",
      args: ["run", "check:bundle"],
    });
  });

  it("stops after the first failed child and propagates its exact exit code", async () => {
    const steps: QaStep[] = [
      { id: "first", command: "node", args: ["first"] },
      { id: "failing", command: "node", args: ["failing"] },
      { id: "must_not_run", command: "node", args: ["must-not-run"] },
    ];
    const observed: string[] = [];
    const output: string[] = [];
    vi.spyOn(console, "log").mockImplementation((message) => output.push(String(message)));

    const exitCode = await runQa({
      steps,
      stepRunner: async (step) => {
        observed.push(step.id);
        return step.id === "failing" ? 23 : 0;
      },
      digestVisualArtifacts: () => stableVisualDigest,
    });

    expect(exitCode).toBe(23);
    expect(observed).toEqual(["first", "failing"]);
    const summary = JSON.parse(output.at(-1)?.trim() ?? "{}");
    expect(summary).toMatchObject({
      status: "fail",
      completed: ["first"],
      firstFailedStep: "failing",
      liveAgentStatus: "not_run",
      liveAgentIncludedInPassCount: false,
      visualDigestBefore: stableVisualDigest.digest,
      visualDigestAfter: stableVisualDigest.digest,
    });
  });
});
