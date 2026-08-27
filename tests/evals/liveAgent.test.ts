import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { EVAL_CASE_IDS } from "../../evals/contract.ts";
import {
  LIVE_AGENT_PROMPT_DIGESTS,
  liveAgentRecordSchema,
  validateLiveAgentRecord,
} from "../../evals/live-agent/validate.ts";

function verifiedRecord(): any {
  return {
    schemaVersion: 2,
    status: "verified",
    reason: "All twelve prompts were verified in a supported browser agent.",
    environment: {
      browserAgentName: "Supported browser agent",
      browserVersion: "140.0.7339.81",
      testedUrl: "http://127.0.0.1:4173",
      appBuildIdentifier: "local-build-abc123",
    },
    toolDiscoveryEvidencePath: "artifacts/qa/live-agent/tool-discovery.json",
    verifiedAt: "2026-08-26T12:00:00.000Z",
    verifierLabel: "release verifier",
    knownDeviations: [],
    cases: EVAL_CASE_IDS.map((promptId) => ({
      promptId,
      promptTextSha256: LIVE_AGENT_PROMPT_DIGESTS[promptId],
      outcome: "pass",
      observedToolSequence: [],
      resultEvidencePath: `artifacts/qa/live-agent/${promptId}.json`,
    })),
  };
}

describe("live browser-agent evidence boundary", () => {
  it("accepts the explicit current not-run record without counting it as verified", () => {
    const record = validateLiveAgentRecord(
      resolve(process.cwd(), "evals", "live-agent", "current.json"),
    );

    expect(record.status).toBe("not_run");
    expect(record.cases).toEqual([]);
    expect(record.environment).toEqual({
      browserAgentName: null,
      browserVersion: null,
      testedUrl: null,
      appBuildIdentifier: null,
    });
    expect(record.toolDiscoveryEvidencePath).toBeNull();
    expect(record.verifiedAt).toBeNull();
    expect(record.verifierLabel).toBeNull();
    expect(record.knownDeviations).toEqual([]);
  });

  it("accepts a complete future verified provenance record", () => {
    expect(liveAgentRecordSchema.parse(verifiedRecord()).status).toBe("verified");
  });

  it.each([
    ["browser-agent name", (record: any) => delete record.environment.browserAgentName],
    ["exact browser version", (record: any) => delete record.environment.browserVersion],
    ["tested URL", (record: any) => delete record.environment.testedUrl],
    ["app build identifier", (record: any) => delete record.environment.appBuildIdentifier],
    ["prompt ID", (record: any) => delete record.cases[0].promptId],
    ["prompt text digest", (record: any) => delete record.cases[0].promptTextSha256],
    ["observed tool sequence", (record: any) => delete record.cases[0].observedToolSequence],
    ["tool-discovery evidence", (record: any) => delete record.toolDiscoveryEvidencePath],
    ["result evidence", (record: any) => delete record.cases[0].resultEvidencePath],
    ["verification timestamp", (record: any) => delete record.verifiedAt],
    ["verifier label", (record: any) => delete record.verifierLabel],
    ["known deviations", (record: any) => delete record.knownDeviations],
  ])("rejects a verified claim missing %s provenance", (_label, removeField) => {
    const record = verifiedRecord();
    removeField(record);

    expect(() => liveAgentRecordSchema.parse(record)).toThrow();
  });

  it("rejects a prompt digest that does not match the exact manifest prompt", () => {
    const record = verifiedRecord();
    record.cases[0].promptTextSha256 = "0".repeat(64);

    expect(() => liveAgentRecordSchema.parse(record)).toThrow(/Prompt text digest/);
  });
});
