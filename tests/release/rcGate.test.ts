import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync, fstatSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { computeContractDigest } from "../../evals/responses-api/contractDigest.ts";
import { validateResponsesRecordData } from "../../evals/responses-api/validate.ts";
import { TRUTH_LABELS } from "../../evals/responses-api/types.ts";
import { RESPONSES_CASE_IDS } from "../../evals/responses-api/cases.ts";
import { liveAgentRecordSchema } from "../../evals/live-agent/validate.ts";
import { validateDeterministicReportData } from "../../scripts/rc-gate/deterministicValidator.ts";
import { buildRcGateReceipt, validatePersistedReceiptParity } from "../../scripts/rc-gate/classify.ts";
import { sha256Hex } from "../../scripts/rc-gate/digest.ts";
import { compileRcGateJsonSchemaValidator } from "../../scripts/rc-gate/jsonSchema.ts";
import { validateLocalQaReceipt } from "../../scripts/rc-gate/localQaReceipt.ts";
import {
  CANONICAL_HUMAN_ONLY_ACTION_NAMES,
  CANONICAL_PRODUCT_TOOL_NAMES,
  computeProductInvariantDigest,
} from "../../scripts/rc-gate/productInvariants.ts";
import { blockingReason, BLOCKING_REASON_CODE_TO_LANES, dedupeBlockingReasons } from "../../scripts/rc-gate/reasons.ts";
import {
  RC_GATE_MAX_RECEIPT_BYTES,
  validateRcGateReceiptDocument,
} from "../../scripts/rc-gate/receiptSchema.ts";
import {
  readBoundedContainedJson,
  readBoundedReleaseReceipt,
  validateDeterministicSource,
  validateLiveAgentSource,
  validateReleaseSources,
  validateResponsesSource,
} from "../../scripts/rc-gate/sourceValidation.ts";
import type { SafeReadFsHooks } from "../../scripts/rc-gate/safeRead.ts";
import { filterPorcelainEntries } from "../../scripts/rc-gate/workspace.ts";
import { HUMAN_ONLY_ACTION_NAMES } from "../../src/domain/actions/index.ts";
import { TOOL_NAMES } from "../../src/webmcp/toolDefinitions.ts";
import currentReceipt from "../../artifacts/rc-gate/current.json";
import {
  DIGEST,
  HEAD,
  OTHER_DIGEST,
  OTHER_HEAD,
  deterministicReport,
  httpReceipt,
  liveAgentVerified,
  localQaReceipt,
  nativeReceipt,
  readySourceValidation,
  readySources,
  releaseReceipt,
  releaseReceiptBytes,
  responsesPassed,
  validatedResponsesPassed,
} from "./fixtures/rcGate/helpers.ts";

const CONTRACT_DIGEST = computeContractDigest();
const validateAjv = compileRcGateJsonSchemaValidator();

function assertValidatorParity(fixture: unknown, shouldPass: boolean): void {
  if (shouldPass) {
    expect(() => validateRcGateReceiptDocument(fixture)).not.toThrow();
    expect(validateAjv(fixture)).toBe(true);
  } else {
    expect(() => validateRcGateReceiptDocument(fixture)).toThrow();
    expect(validateAjv(fixture)).toBe(false);
  }
}

function fullReadySources(overrides: Partial<ReturnType<typeof readySources>> = {}) {
  const contractDigest =
    typeof overrides.contractDigest === "string" ? overrides.contractDigest : CONTRACT_DIGEST;
  const head = overrides.head ?? HEAD;
  return readySources({
    contractDigest,
    sourceValidation: readySourceValidation(contractDigest, head, overrides.sourceValidation),
    ...overrides,
  });
}

describe("release-candidate gate classification", () => {
  it("accepts full ready parity with every lane positive", () => {
    const receipt = buildRcGateReceipt(
      fullReadySources({
        localQaRaw: localQaReceipt(HEAD, {
          deterministicReport: DIGEST,
          responsesCurrent: DIGEST,
          liveAgentCurrent: DIGEST,
        }),
      }),
    );
    expect(receipt.status).toBe("ready");
    expect(receipt.recordingEvidenceReady).toBe(true);
    expect(receipt.submissionTechnicalEvidenceReady).toBe(true);
    expect(receipt.blockingReasons).toEqual([]);
    expect(receipt.lanes.localCandidate.status).toBe("ready");
    expect(receipt.lanes.publicDeployment.status).toBe("ready");
    expect(receipt.lanes.nativeWebMcp.status).toBe("passed");
    expect(receipt.lanes.responsesApi.status).toBe("passed");
    expect(receipt.lanes.compatibleBrowserAgent.status).toBe("verified");
    expect(receipt.lanes.deterministic.status).toBe("passed");
    expect(receipt.lanes.productInvariants.status).toBe("passed");
    expect(receipt.lanes.productInvariants.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.responsesApi.status).toBe("passed");
    expect(receipt.compatibleBrowserAgent.status).toBe("verified");
  });

  it("blocks on a dirty worktree", () => {
    const receipt = buildRcGateReceipt(
      fullReadySources({
        workspace: { algorithm: "sha256", digest: OTHER_DIGEST, entryCount: 1 },
        workspaceClean: false,
      }),
    );
    expect(receipt.status).toBe("blocked");
    expect(receipt.blockingReasons.map((reason) => reason.code)).toContain("WORKTREE_DIRTY");
  });

  it("blocks when generated RC files are excluded but another dirty path remains", () => {
    const entries = filterPorcelainEntries([
      " M README.md",
      " M artifacts/rc-gate/current.json",
      " M artifacts/rc-gate/local-qa.json",
    ]);
    expect(entries.entryCount).toBe(1);
    const receipt = buildRcGateReceipt(
      fullReadySources({
        workspace: entries,
        workspaceClean: false,
      }),
    );
    expect(receipt.blockingReasons.map((reason) => reason.code)).toContain("WORKTREE_DIRTY");
  });

  it("blocks on missing, failed, stale-commit, stale-status, and stale-eval local QA receipts", () => {
    const missing = buildRcGateReceipt(fullReadySources({ localQaRaw: null }));
    expect(missing.blockingReasons.map((reason) => reason.code)).toContain("LOCAL_QA_MISSING");

    const failed = buildRcGateReceipt(
      fullReadySources({
        localQaRaw: {
          ...localQaReceipt(),
          status: "failed",
          steps: [
            {
              id: "lint",
              command: "npm",
              args: ["run", "lint"],
              exitCode: 1,
              status: "failed",
            },
          ],
        },
      }),
    );
    expect(failed.blockingReasons.map((reason) => reason.code)).toContain("LOCAL_QA_FAILED");

    const staleCommit = buildRcGateReceipt(fullReadySources({ localQaRaw: localQaReceipt(OTHER_HEAD) }));
    expect(staleCommit.blockingReasons.map((reason) => reason.code)).toContain(
      "LOCAL_QA_STALE_COMMIT",
    );

    const baseQa = localQaReceipt();
    const staleStatus = buildRcGateReceipt(
      fullReadySources({
        localQaRaw: {
          ...baseQa,
          workspace: {
            ...(baseQa.workspace as Record<string, unknown>),
            statusAfter: { algorithm: "sha256", digest: OTHER_DIGEST, entryCount: 0 },
          },
        },
      }),
    );
    expect(staleStatus.blockingReasons.map((reason) => reason.code)).toContain(
      "LOCAL_QA_STALE_STATUS",
    );

    const staleEval = buildRcGateReceipt(
      fullReadySources({
        localQaRaw: localQaReceipt(HEAD, {
          deterministicReport: OTHER_DIGEST,
          responsesCurrent: DIGEST,
          liveAgentCurrent: DIGEST,
        }),
      }),
    );
    expect(staleEval.blockingReasons.map((reason) => reason.code)).toContain(
      "LOCAL_QA_STALE_EVAL_DIGEST",
    );
  });

  it("blocks canonical deterministic validation failures", () => {
    const count = buildRcGateReceipt(
      readySources({
        deterministicRaw: deterministicReport({
          totals: {
            total: 12,
            passed: 11,
            failed: 1,
            explicit: 4,
            ambiguous: 4,
            safety: 4,
            toolCalls: 41,
            assertions: 60,
          },
        }),
        contractDigest: CONTRACT_DIGEST,
      }),
    );
    expect(count.blockingReasons.map((reason) => reason.code)).toContain("SOURCE_INVALID");

    const tools = buildRcGateReceipt(
      readySources({
        deterministicRaw: deterministicReport({
          tools: { count: 8, names: TOOL_NAMES.slice(0, 8) },
        }),
        contractDigest: CONTRACT_DIGEST,
      }),
    );
    expect(tools.blockingReasons.map((reason) => reason.code)).toContain("SOURCE_INVALID");

    expect(() =>
      validateDeterministicReportData(
        deterministicReport({ overallPass: false }),
      ),
    ).toThrow();
  });

  it("blocks responses not_run, failed, stale contract, wrong totals, and forged truth labels", () => {
    const notRun = buildRcGateReceipt(
      fullReadySources({
        sourceValidation: readySourceValidation(CONTRACT_DIGEST, HEAD, {
          validatedResponses: {
            schemaVersion: 1,
            status: "not_run",
            reason: "Responses API model-selection evidence has not been run in this lane.",
            model: null,
            startedAt: null,
            completedAt: null,
            caseIds: [...RESPONSES_CASE_IDS],
            aggregateScore: null,
            casePassCount: null,
            caseFailCount: null,
            cases: [],
            knownDeviations: [],
            contractDigest: CONTRACT_DIGEST,
            truthLabels: { ...TRUTH_LABELS },
          } as never,
        }),
      }),
    );
    expect(notRun.blockingReasons.map((reason) => reason.code)).toContain("RESPONSES_NOT_RUN");

    const failed = buildRcGateReceipt(
      fullReadySources({
        sourceValidation: readySourceValidation(CONTRACT_DIGEST, HEAD, {
          validatedResponses: {
            ...validatedResponsesPassed(CONTRACT_DIGEST),
            status: "failed",
          } as never,
        }),
      }),
    );
    expect(failed.blockingReasons.map((reason) => reason.code)).toContain("RESPONSES_FAILED");

    const staleContract = buildRcGateReceipt(
      fullReadySources({
        sourceValidation: readySourceValidation(CONTRACT_DIGEST, HEAD, {
          validatedResponses: validatedResponsesPassed(OTHER_DIGEST),
        }),
      }),
    );
    expect(staleContract.blockingReasons.map((reason) => reason.code)).toContain(
      "RESPONSES_STALE_CONTRACT",
    );

    const wrongTotals = buildRcGateReceipt(
      fullReadySources({
        sourceValidation: readySourceValidation(CONTRACT_DIGEST, HEAD, {
          validatedResponses: {
            ...validatedResponsesPassed(CONTRACT_DIGEST),
            casePassCount: 6,
            caseFailCount: 1,
          } as never,
        }),
      }),
    );
    expect(wrongTotals.blockingReasons.map((reason) => reason.code)).toContain("RESPONSES_INVALID");

    const forgedTruth = buildRcGateReceipt(
      fullReadySources({
        sourceValidation: readySourceValidation(CONTRACT_DIGEST, HEAD, {
          validatedResponses: {
            ...validatedResponsesPassed(CONTRACT_DIGEST),
            truthLabels: { ...TRUTH_LABELS, provesNativeWebMcpDiscovery: true },
          } as never,
        }),
      }),
    );
    expect(forgedTruth.blockingReasons.map((reason) => reason.code)).toContain(
      "RESPONSES_TRUTH_LABEL_FORGED",
    );
    expect(forgedTruth.responsesApi.status).not.toBe("passed");
  });

  it("proves a responses pass cannot satisfy native or compatible-browser lanes alone", () => {
    const receipt = buildRcGateReceipt(
      fullReadySources({
        releaseReceiptRaw: releaseReceipt(OTHER_HEAD),
        liveAgentRaw: {
          schemaVersion: 2,
          status: "not_run",
          reason: "No eligible live browser agent was available in this work order.",
          environment: {
            browserAgentName: null,
            browserVersion: null,
            testedUrl: null,
            appBuildIdentifier: null,
          },
          toolDiscoveryEvidencePath: null,
          verifiedAt: null,
          verifierLabel: null,
          knownDeviations: [],
          cases: [],
        },
        sourceValidation: readySourceValidation(CONTRACT_DIGEST, HEAD, {
          validatedRelease: releaseReceipt(OTHER_HEAD),
          validatedLiveAgent: liveAgentRecordSchema.parse({
            schemaVersion: 2,
            status: "not_run",
            reason: "No eligible live browser agent was available in this work order.",
            environment: {
              browserAgentName: null,
              browserVersion: null,
              testedUrl: null,
              appBuildIdentifier: null,
            },
            toolDiscoveryEvidencePath: null,
            verifiedAt: null,
            verifierLabel: null,
            knownDeviations: [],
            cases: [],
          }),
        }),
      }),
    );
    expect(receipt.responsesApi.status).toBe("passed");
    expect(receipt.lanes.nativeWebMcp.status).not.toBe("passed");
    expect(receipt.lanes.compatibleBrowserAgent.status).toBe("not_run");
    expect(receipt.blockingReasons.map((reason) => reason.code)).toContain(
      "COMPATIBLE_BROWSER_AGENT_NOT_RUN",
    );
    expect(receipt.blockingReasons.map((reason) => reason.code)).toContain("PUBLIC_RELEASE_STALE");
  });

  it("blocks public release commit mismatch and stale receipts", () => {
    const stale = buildRcGateReceipt(
      fullReadySources({
        releaseReceiptRaw: releaseReceipt(OTHER_HEAD),
        sourceValidation: readySourceValidation(CONTRACT_DIGEST, HEAD, {
          validatedRelease: releaseReceipt(OTHER_HEAD),
        }),
      }),
    );
    expect(stale.publicDeployment.status).toBe("stale");
    expect(stale.blockingReasons.map((reason) => reason.code)).toContain("PUBLIC_RELEASE_STALE");
    expect(stale.blockingReasons.map((reason) => reason.code)).toContain("NATIVE_WEBMCP_STALE");

    const mismatch = buildRcGateReceipt(
      fullReadySources({
        releaseReceiptRaw: {
          ...releaseReceipt(HEAD),
          deployment: {
            ...(releaseReceipt(HEAD).deployment as Record<string, unknown>),
            gitCommit: OTHER_HEAD,
          },
        },
        sourceValidation: readySourceValidation(CONTRACT_DIGEST, HEAD, {
          validatedRelease: {
            ...releaseReceipt(HEAD),
            deployment: {
              ...(releaseReceipt(HEAD).deployment as Record<string, unknown>),
              gitCommit: OTHER_HEAD,
            },
          },
        }),
      }),
    );
    expect(mismatch.blockingReasons.map((reason) => reason.code)).toContain(
      "PUBLIC_RELEASE_COMMIT_MISMATCH",
    );
  });

  it("blocks compatible browser agent not_run, build mismatch, and failed cases", () => {
    const notRun = buildRcGateReceipt(
      fullReadySources({
        sourceValidation: readySourceValidation(CONTRACT_DIGEST, HEAD, {
          validatedLiveAgent: liveAgentRecordSchema.parse({
            schemaVersion: 2,
            status: "not_run",
            reason: "No eligible live browser agent was available in this work order.",
            environment: {
              browserAgentName: null,
              browserVersion: null,
              testedUrl: null,
              appBuildIdentifier: null,
            },
            toolDiscoveryEvidencePath: null,
            verifiedAt: null,
            verifierLabel: null,
            knownDeviations: [],
            cases: [],
          }),
        }),
      }),
    );
    expect(notRun.blockingReasons.map((reason) => reason.code)).toContain(
      "COMPATIBLE_BROWSER_AGENT_NOT_RUN",
    );

    const buildMismatch = buildRcGateReceipt(
      fullReadySources({
        liveAgentRaw: liveAgentVerified(OTHER_HEAD),
        sourceValidation: readySourceValidation(CONTRACT_DIGEST, HEAD, {
          validatedLiveAgent: liveAgentRecordSchema.parse(liveAgentVerified(OTHER_HEAD)),
        }),
      }),
    );
    expect(buildMismatch.blockingReasons.map((reason) => reason.code)).toContain(
      "COMPATIBLE_BROWSER_AGENT_BUILD_MISMATCH",
    );
  });

  it("blocks product invariant drift and duplicate reason codes", () => {
    const exposed = buildRcGateReceipt(
      fullReadySources({
        productInvariants: {
          toolNames: [...TOOL_NAMES, HUMAN_ONLY_ACTION_NAMES[0]],
          humanOnlyActionNames: [...HUMAN_ONLY_ACTION_NAMES],
          judgeVisibleApprovalGates: ["approve_buyer_context", "approve_decision"],
          canonicalEuResidencyStatus: "unknown",
        },
        productInvariantDigest: computeProductInvariantDigest({
          toolNames: [...TOOL_NAMES, HUMAN_ONLY_ACTION_NAMES[0]],
          humanOnlyActionNames: [...HUMAN_ONLY_ACTION_NAMES],
          judgeVisibleApprovalGates: ["approve_buyer_context", "approve_decision"],
          canonicalEuResidencyStatus: "unknown",
        }),
      }),
    );
    expect(exposed.blockingReasons.map((reason) => reason.code)).toContain(
      "PRODUCT_INVARIANT_TOOL_MISMATCH",
    );
    expect(exposed.blockingReasons.map((reason) => reason.code)).toContain(
      "PRODUCT_INVARIANT_HUMAN_ONLY_EXPOSED",
    );

    const deduped = dedupeBlockingReasons([
      {
        code: "WORKTREE_DIRTY",
        lane: "localCandidate",
        message: "first",
      },
      {
        code: "WORKTREE_DIRTY",
        lane: "localCandidate",
        message: "second",
      },
    ]);
    expect(deduped).toHaveLength(1);
  });

  it("rejects invalid local QA receipts at the schema boundary", () => {
    expect(() =>
      validateLocalQaReceipt({
        schemaVersion: 1,
        generatedAt: "2026-08-31T16:00:00.000Z",
        status: "passed",
        candidateCommit: HEAD,
        workspace: {
          filteredClean: true,
          statusBefore: { algorithm: "sha256", digest: DIGEST, entryCount: 0 },
          statusAfter: { algorithm: "sha256", digest: OTHER_DIGEST, entryCount: 0 },
          statusParity: true,
        },
        steps: [],
        visualArtifacts: {
          before: { algorithm: "sha256", digest: DIGEST, fileCount: 1, totalBytes: 1 },
          after: { algorithm: "sha256", digest: DIGEST, fileCount: 1, totalBytes: 1 },
          byteIdentical: true,
        },
        evalArtifacts: {
          deterministicReportDigest: DIGEST,
          responsesCurrentDigest: DIGEST,
          liveAgentCurrentDigest: DIGEST,
        },
      }),
    ).toThrow();
  });

  it("detects source changes after receipt generation and accepts blocked validate but rejects hard gate", () => {
    const sources = fullReadySources();
    const receipt = buildRcGateReceipt(sources);
    expect(receipt.status).toBe("ready");

    const changed = validatePersistedReceiptParity(receipt, {
      ...sources,
      head: OTHER_HEAD,
    });
    expect(changed.map((reason) => reason.code)).toContain("RECEIPT_SOURCE_CHANGED");

    const blocked = buildRcGateReceipt(
      fullReadySources({
        workspaceClean: false,
        workspace: { algorithm: "sha256", digest: OTHER_DIGEST, entryCount: 2 },
      }),
    );
    expect(blocked.status).toBe("blocked");
    expect(blocked.blockingReasons.length).toBeGreaterThan(0);
  });

  it("keeps exact production counts in ready fixtures", () => {
    const receipt = buildRcGateReceipt(fullReadySources());
    expect(receipt.deterministic.passedCases).toBe(12);
    expect(receipt.deterministic.failedCases).toBe(0);
    expect(receipt.deterministic.assertions).toBe(60);
    expect(receipt.deterministic.toolNames).toHaveLength(9);
    expect(receipt.productInvariants.humanOnlyActionNames).toHaveLength(7);
    expect(receipt.productInvariants.judgeVisibleApprovalGates).toEqual([
      "approve_buyer_context",
      "approve_decision",
    ]);
    expect(receipt.productInvariants.canonicalEuResidencyStatus).toBe("unknown");
    expect(receipt.responsesApi.caseIds).toEqual([...RESPONSES_CASE_IDS]);
  });
});

describe("release-candidate gate attack surface", () => {
  it("rejects unsafe release paths before reading evidence", () => {
    const forgedRelease = {
      ...releaseReceipt(),
      verification: {
        ...(releaseReceipt().verification as Record<string, unknown>),
        httpVerifier: {
          ...((releaseReceipt().verification as Record<string, unknown>).httpVerifier as Record<
            string,
            unknown
          >),
          receiptPath: "/etc/passwd",
        },
      },
    };
    const forgedBytes = Buffer.from(JSON.stringify(forgedRelease), "utf8");
    const absolute = validateReleaseSources("/tmp", {
      releaseBytes: forgedBytes,
      releaseDigest: sha256Hex(forgedBytes),
    });
    expect(absolute.releaseDocument.reasonCode).toBe("RELEASE_DOCUMENT_INVALID");

    const traversalRelease = {
      ...releaseReceipt(),
      verification: {
        ...(releaseReceipt().verification as Record<string, unknown>),
        httpVerifier: {
          ...((releaseReceipt().verification as Record<string, unknown>).httpVerifier as Record<
            string,
            unknown
          >),
          receiptPath: "../outside/http.json",
        },
      },
    };
    const traversalBytes = Buffer.from(JSON.stringify(traversalRelease), "utf8");
    const traversal = validateReleaseSources("/tmp", {
      releaseBytes: traversalBytes,
      releaseDigest: sha256Hex(traversalBytes),
    });
    expect(traversal.releaseDocument.reasonCode).toBe("RELEASE_DOCUMENT_INVALID");
  });

  it("rejects forged release digests before reading referenced evidence", () => {
    const bytes = releaseReceiptBytes();
    const forged = validateReleaseSources("/tmp", {
      releaseBytes: bytes,
      releaseDigest: OTHER_DIGEST,
    });
    expect(forged.releaseDocument.reasonCode).toBe("RELEASE_DOCUMENT_INVALID");
    expect(forged.releaseEvidence.reasonCode).toBe("RELEASE_EVIDENCE_INVALID");
    expect(forged.validatedReleaseEvidence).toBeNull();

    const exact = validateReleaseSources("/tmp", {
      releaseBytes: bytes,
      releaseDigest: sha256Hex(bytes),
    });
    expect(exact.releaseDocument.valid).toBe(true);
    expect(exact.releaseEvidence.valid).toBe(false);
  });

  it("rejects symlink escape and malformed release receipts in temp repositories", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "proofroom-rc-gate-"));
    try {
      const outsideDir = join(tempDir, "outside");
      const repoDir = join(tempDir, "repo");
      mkdirSync(outsideDir, { recursive: true });
      mkdirSync(join(repoDir, "artifacts/release"), { recursive: true });
      writeFileSync(join(outsideDir, "leak.json"), JSON.stringify(httpReceipt()), "utf8");
      symlinkSync(join(outsideDir, "leak.json"), join(repoDir, "artifacts/release/http-verification.json"));
      const receipt = {
        ...releaseReceipt(),
        verification: {
          ...(releaseReceipt().verification as Record<string, unknown>),
          httpVerifier: {
            result: "passed",
            receiptPath: "artifacts/release/http-verification.json",
            receiptDigest: DIGEST,
          },
        },
      };
      writeFileSync(join(repoDir, "artifacts/release/release-receipt.json"), JSON.stringify(receipt), "utf8");
      const loaded = readBoundedReleaseReceipt(repoDir);
      const validated = validateReleaseSources(repoDir, {
        releaseBytes: loaded.releaseBytes,
        releaseDigest: loaded.releaseDigest,
      });
      expect(validated.releaseEvidence.valid).toBe(false);
      expect(validated.releaseEvidence.reasonCode).toBe("RELEASE_EVIDENCE_INVALID");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("blocks digest, origin, native substitution, and forged source attacks", () => {
    const digestMismatch = buildRcGateReceipt(
      fullReadySources({
        sourceValidation: readySourceValidation(CONTRACT_DIGEST, HEAD, {
          validatedReleaseEvidence: {
            httpReceipt: httpReceipt(),
            nativeReceipt: nativeReceipt(),
            httpReceiptDigest: OTHER_DIGEST,
            nativeReceiptDigest: DIGEST,
          },
        }),
      }),
    );
    expect(digestMismatch.blockingReasons.map((reason) => reason.code)).toContain(
      "PUBLIC_RELEASE_DIGEST_MISMATCH",
    );

    const nativeDigestMismatch = buildRcGateReceipt(
      fullReadySources({
        sourceValidation: readySourceValidation(CONTRACT_DIGEST, HEAD, {
          validatedReleaseEvidence: {
            httpReceipt: httpReceipt(),
            nativeReceipt: nativeReceipt(),
            httpReceiptDigest: DIGEST,
            nativeReceiptDigest: OTHER_DIGEST,
          },
        }),
      }),
    );
    expect(nativeDigestMismatch.blockingReasons.map((reason) => reason.code)).toContain(
      "NATIVE_WEBMCP_DIGEST_MISMATCH",
    );

    const originMismatch = buildRcGateReceipt(
      fullReadySources({
        sourceValidation: readySourceValidation(CONTRACT_DIGEST, HEAD, {
          validatedReleaseEvidence: {
            httpReceipt: httpReceipt({ origin: "https://other.example/" }),
            nativeReceipt: nativeReceipt({ origin: "https://other.example/" }),
            httpReceiptDigest: DIGEST,
            nativeReceiptDigest: DIGEST,
          },
        }),
      }),
    );
    expect(originMismatch.blockingReasons.map((reason) => reason.code)).toContain(
      "PUBLIC_RELEASE_ORIGIN_MISMATCH",
    );
    expect(originMismatch.blockingReasons.map((reason) => reason.code)).toContain(
      "NATIVE_WEBMCP_ORIGIN_MISMATCH",
    );

    const toolSubstitution = buildRcGateReceipt(
      fullReadySources({
        sourceValidation: readySourceValidation(CONTRACT_DIGEST, HEAD, {
          validatedReleaseEvidence: {
            httpReceipt: httpReceipt(),
            nativeReceipt: nativeReceipt({
              toolNames: [...TOOL_NAMES].sort((left, right) => right.localeCompare(left)),
            }),
            httpReceiptDigest: DIGEST,
            nativeReceiptDigest: DIGEST,
          },
        }),
      }),
    );
    expect(toolSubstitution.blockingReasons.map((reason) => reason.code)).toContain(
      "NATIVE_WEBMCP_TOOL_MISMATCH",
    );

    const reloadSubstitution = buildRcGateReceipt(
      fullReadySources({
        sourceValidation: readySourceValidation(CONTRACT_DIGEST, HEAD, {
          validatedReleaseEvidence: {
            httpReceipt: httpReceipt(),
            nativeReceipt: nativeReceipt({
              reloadToolNames: [...TOOL_NAMES].sort((left, right) => right.localeCompare(left)),
            }),
            httpReceiptDigest: DIGEST,
            nativeReceiptDigest: DIGEST,
          },
        }),
      }),
    );
    expect(reloadSubstitution.blockingReasons.map((reason) => reason.code)).toContain(
      "NATIVE_WEBMCP_RELOAD_MISMATCH",
    );

    const entryMismatch = buildRcGateReceipt(
      fullReadySources({
        sourceValidation: readySourceValidation(CONTRACT_DIGEST, HEAD, {
          validatedRelease: releaseReceipt(),
          validatedReleaseEvidence: {
            httpReceipt: httpReceipt(),
            nativeReceipt: nativeReceipt({
              entryIntegrity: {
                passed: true,
                sha256: OTHER_DIGEST,
                path: "/assets/index-fixture.js",
                byteCount: 1001,
              },
            }),
            httpReceiptDigest: DIGEST,
            nativeReceiptDigest: DIGEST,
          },
        }),
      }),
    );
    expect(entryMismatch.blockingReasons.map((reason) => reason.code)).toContain(
      "NATIVE_WEBMCP_ENTRY_INTEGRITY_FAILED",
    );
  });

  it("rejects forged responses, live-agent, deterministic, and product attacks", () => {
    expect(() => validateResponsesRecordData(responsesPassed(CONTRACT_DIGEST))).toThrow();
    expect(validateResponsesSource(responsesPassed(CONTRACT_DIGEST)).responses.reasonCode).toBe(
      "SOURCE_INVALID",
    );

    const duplicateCase = {
      ...liveAgentVerified(),
      cases: [
        ...(liveAgentVerified().cases as unknown[]),
        ...(liveAgentVerified().cases as unknown[]).slice(0, 1),
      ],
    };
    expect(validateLiveAgentSource(duplicateCase).liveAgent.reasonCode).toBe("SOURCE_INVALID");

    expect(
      validateDeterministicSource(
        deterministicReport({ unknownKey: true }),
      ).deterministic.reasonCode,
    ).toBe("SOURCE_INVALID");

    const arbitraryTools = buildRcGateReceipt(
      fullReadySources({
        productInvariants: {
          toolNames: [...TOOL_NAMES].reverse(),
          humanOnlyActionNames: [...HUMAN_ONLY_ACTION_NAMES],
          judgeVisibleApprovalGates: ["approve_buyer_context", "approve_decision"],
          canonicalEuResidencyStatus: "unknown",
        },
        productInvariantDigest: DIGEST,
      }),
    );
    expect(arbitraryTools.blockingReasons.map((reason) => reason.code)).toContain(
      "PRODUCT_INVARIANT_TOOL_MISMATCH",
    );

    const arbitraryHumanOnly = buildRcGateReceipt(
      fullReadySources({
        productInvariants: {
          toolNames: [...TOOL_NAMES],
          humanOnlyActionNames: [...HUMAN_ONLY_ACTION_NAMES].reverse(),
          judgeVisibleApprovalGates: ["approve_buyer_context", "approve_decision"],
          canonicalEuResidencyStatus: "unknown",
        },
        productInvariantDigest: DIGEST,
      }),
    );
    expect(arbitraryHumanOnly.blockingReasons.map((reason) => reason.code)).toContain(
      "PRODUCT_INVARIANT_HUMAN_ONLY_MISMATCH",
    );
  });

  it("emits RECEIPT_SOURCE_CHANGED for every persisted digest drift", () => {
    const sources = fullReadySources();
    const receipt = buildRcGateReceipt(sources);
    const fields: Array<Partial<typeof sources>> = [
      { deterministicDigest: OTHER_DIGEST },
      { responsesDigest: OTHER_DIGEST },
      { liveAgentDigest: OTHER_DIGEST },
      { releaseReceiptDigest: OTHER_DIGEST },
      { httpReceiptDigest: OTHER_DIGEST },
      { nativeReceiptDigest: OTHER_DIGEST },
      { productInvariantDigest: OTHER_DIGEST },
    ];
    for (const drift of fields) {
      const reasons = validatePersistedReceiptParity(receipt, { ...sources, ...drift });
      expect(reasons.map((reason) => reason.code)).toContain("RECEIPT_SOURCE_CHANGED");
    }
  });
});

describe("RC gate schema parity and attacks", () => {
  it("accepts ready and honest blocked fixtures in both Zod and Ajv", () => {
    const ready = buildRcGateReceipt(fullReadySources());
    assertValidatorParity(ready, true);
    assertValidatorParity(currentReceipt, true);
    expect(currentReceipt.status).toBe("blocked");
  });

  it("rejects malicious receipt shapes in both validators", () => {
    const ready = buildRcGateReceipt(fullReadySources()) as Record<string, unknown>;
    const unknownLaneKey = {
      ...ready,
      lanes: {
        ...(ready.lanes as Record<string, unknown>),
        localCandidate: {
          ...((ready.lanes as Record<string, unknown>).localCandidate as Record<string, unknown>),
          forged: true,
        },
      },
    };
    assertValidatorParity(unknownLaneKey, false);

    const oversizedTruth = {
      ...ready,
      responsesApi: {
        ...(ready.responsesApi as Record<string, unknown>),
        truthLabels: { classification: "x".repeat(200) },
      },
    };
    assertValidatorParity(oversizedTruth, false);

    const wrongLane = {
      ...ready,
      status: "blocked",
      recordingEvidenceReady: false,
      submissionTechnicalEvidenceReady: false,
      blockingReasons: [
        {
          code: "WORKTREE_DIRTY",
          lane: "responsesApi",
          message: "Wrong lane pairing.",
        },
      ],
    };
    assertValidatorParity(wrongLane, false);

    const duplicateIdentical = {
      ...wrongLane,
      blockingReasons: [
        {
          code: "WORKTREE_DIRTY",
          lane: "localCandidate",
          message: "first",
        },
        {
          code: "WORKTREE_DIRTY",
          lane: "localCandidate",
          message: "first",
        },
      ],
    };
    assertValidatorParity(duplicateIdentical, false);

    const duplicateDifferentMessage = {
      ...wrongLane,
      blockingReasons: [
        {
          code: "WORKTREE_DIRTY",
          lane: "localCandidate",
          message: "first",
        },
        {
          code: "WORKTREE_DIRTY",
          lane: "localCandidate",
          message: "second",
        },
      ],
    };
    assertValidatorParity(duplicateDifferentMessage, false);

    const unknownCode = {
      ...wrongLane,
      blockingReasons: [
        {
          code: "FORGED_BLOCKER",
          lane: "localCandidate",
          message: "Unknown code.",
        },
      ],
    };
    assertValidatorParity(unknownCode, false);

    const noncanonicalMultiLane = {
      ...wrongLane,
      blockingReasons: [
        {
          code: "SOURCE_INVALID",
          lane: "productInvariants",
          message: "Noncanonical lane for multi-lane code.",
        },
      ],
    };
    assertValidatorParity(noncanonicalMultiLane, false);

    const readyWithBlockers = {
      ...ready,
      blockingReasons: [
        blockingReason("WORKTREE_DIRTY", "localCandidate", "Should not be ready."),
      ],
    };
    assertValidatorParity(readyWithBlockers, false);

    const readyWithBlockedLocalLane = {
      ...ready,
      lanes: {
        ...(ready.lanes as Record<string, unknown>),
        localCandidate: {
          ...((ready.lanes as Record<string, unknown>).localCandidate as Record<string, unknown>),
          status: "blocked",
        },
      },
    };
    assertValidatorParity(readyWithBlockedLocalLane, false);

    const blockedWithoutBlockers = {
      ...ready,
      status: "blocked",
      recordingEvidenceReady: false,
      submissionTechnicalEvidenceReady: false,
      blockingReasons: [],
    };
    assertValidatorParity(blockedWithoutBlockers, false);

    const productSubstitution = {
      ...ready,
      productInvariants: {
        ...(ready.productInvariants as Record<string, unknown>),
        toolNames: [...CANONICAL_PRODUCT_TOOL_NAMES].reverse(),
      },
    };
    assertValidatorParity(productSubstitution, false);

    const oversizedReceipt = {
      ...ready,
      responsesApi: {
        ...(ready.responsesApi as Record<string, unknown>),
        model: "m".repeat(RC_GATE_MAX_RECEIPT_BYTES),
      },
    };
    assertValidatorParity(oversizedReceipt, false);
  });

  it("rejects ready receipts with null or wrong positive fields in both validators", () => {
    const ready = buildRcGateReceipt(fullReadySources()) as Record<string, unknown>;
    const readySections = [
      {
        name: "localQa digest",
        value: {
          ...ready,
          localQa: {
            ...(ready.localQa as Record<string, unknown>),
            digest: null,
          },
        },
      },
      {
        name: "deterministic passedCases",
        value: {
          ...ready,
          deterministic: {
            ...(ready.deterministic as Record<string, unknown>),
            passedCases: null,
          },
        },
      },
      {
        name: "responses aggregateScore",
        value: {
          ...ready,
          responsesApi: {
            ...(ready.responsesApi as Record<string, unknown>),
            aggregateScore: null,
          },
        },
      },
      {
        name: "public deployment releaseId",
        value: {
          ...ready,
          publicDeployment: {
            ...(ready.publicDeployment as Record<string, unknown>),
            releaseId: null,
          },
        },
      },
      {
        name: "native headed",
        value: {
          ...ready,
          nativeWebMcp: {
            ...(ready.nativeWebMcp as Record<string, unknown>),
            headed: null,
          },
        },
      },
      {
        name: "compatible browser status",
        value: {
          ...ready,
          compatibleBrowserAgent: {
            ...(ready.compatibleBrowserAgent as Record<string, unknown>),
            status: "not_run",
          },
        },
      },
      {
        name: "product invariants humanOnlyAbsentFromTools",
        value: {
          ...ready,
          productInvariants: {
            ...(ready.productInvariants as Record<string, unknown>),
            humanOnlyAbsentFromTools: false,
          },
        },
      },
      {
        name: "lane summary digest",
        value: {
          ...ready,
          lanes: {
            ...(ready.lanes as Record<string, unknown>),
            responsesApi: {
              ...((ready.lanes as Record<string, unknown>).responsesApi as Record<string, unknown>),
              digest: null,
            },
          },
        },
      },
    ];
    for (const section of readySections) {
      assertValidatorParity(section.value, false);
    }
  });

  it("rejects same-count product substitutions against independent literals", () => {
    const reversedTools = buildRcGateReceipt(
      fullReadySources({
        productInvariants: {
          toolNames: [...CANONICAL_PRODUCT_TOOL_NAMES].reverse(),
          humanOnlyActionNames: [...CANONICAL_HUMAN_ONLY_ACTION_NAMES],
          judgeVisibleApprovalGates: ["approve_buyer_context", "approve_decision"],
          canonicalEuResidencyStatus: "unknown",
        },
        productInvariantDigest: computeProductInvariantDigest({
          toolNames: [...CANONICAL_PRODUCT_TOOL_NAMES].reverse(),
          humanOnlyActionNames: [...CANONICAL_HUMAN_ONLY_ACTION_NAMES],
          judgeVisibleApprovalGates: ["approve_buyer_context", "approve_decision"],
          canonicalEuResidencyStatus: "unknown",
        }),
      }),
    );
    expect(reversedTools.blockingReasons.map((reason) => reason.code)).toContain(
      "PRODUCT_INVARIANT_TOOL_MISMATCH",
    );
  });

  it("rejects deterministic unknown keys, oversized nested values, and non-finite totals", () => {
    expect(
      validateDeterministicSource(
        deterministicReport({ unknownKey: true }),
      ).deterministic.reasonCode,
    ).toBe("SOURCE_INVALID");

    const oversizedCase = deterministicReport();
    const firstCase = (oversizedCase.cases as Record<string, unknown>[])[0]!;
    firstCase.id = "x".repeat(300);
    expect(validateDeterministicSource(oversizedCase).deterministic.reasonCode).toBe(
      "SOURCE_INVALID",
    );

    const oversizedArray = deterministicReport();
    (oversizedArray.cases as Record<string, unknown>[])[0]!.calls = new Array(300).fill({});
    expect(validateDeterministicSource(oversizedArray).deterministic.reasonCode).toBe(
      "SOURCE_INVALID",
    );

    const multibyte = deterministicReport();
    (multibyte.cases as Record<string, unknown>[])[0]!.family = "é".repeat(200_000);
    expect(validateDeterministicSource(multibyte).deterministic.reasonCode).toBe(
      "SOURCE_INVALID",
    );

    const nonFinite = deterministicReport({
      totals: {
        total: 12,
        passed: 12,
        failed: 0,
        explicit: 4,
        ambiguous: 4,
        safety: 4,
        toolCalls: Number.POSITIVE_INFINITY,
        assertions: 60,
      },
    });
    expect(validateDeterministicSource(nonFinite).deterministic.reasonCode).toBe(
      "SOURCE_INVALID",
    );
  });

  it("rejects wrong blocking-reason lane pairings at construction time", () => {
    expect(() =>
      blockingReason("WORKTREE_DIRTY", "responsesApi", "Wrong lane."),
    ).toThrow();
    expect(BLOCKING_REASON_CODE_TO_LANES.RELEASE_DOCUMENT_INVALID).toContain("nativeWebMcp");
  });
});

describe("RC gate safe evidence reader attacks", () => {
  it("rejects absolute, traversal, directory, oversize, and malformed JSON reads", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "proofroom-safe-read-"));
    try {
      const repoDir = join(tempDir, "repo");
      const outsideDir = join(tempDir, "outside");
      mkdirSync(join(repoDir, "artifacts/release"), { recursive: true });
      mkdirSync(outsideDir, { recursive: true });
      writeFileSync(join(outsideDir, "leak.json"), "{}", "utf8");
      writeFileSync(join(repoDir, "artifacts/release/valid.json"), "{}", "utf8");
      writeFileSync(join(repoDir, "artifacts/release/malformed.json"), "{", "utf8");
      writeFileSync(join(repoDir, "artifacts/release/huge.json"), "[]", "utf8");
      mkdirSync(join(repoDir, "artifacts/release/folder.json"), { recursive: true });
      symlinkSync(join(outsideDir, "leak.json"), join(repoDir, "artifacts/release/link.json"));

      expect(() => readBoundedContainedJson(repoDir, "/etc/passwd", 1000)).toThrow();
      expect(() => readBoundedContainedJson(repoDir, "../outside/leak.json", 1000)).toThrow();
      expect(() => readBoundedContainedJson(repoDir, "artifacts/release/folder.json", 1000)).toThrow();
      expect(() => readBoundedContainedJson(repoDir, "artifacts/release/malformed.json", 1000)).toThrow();
      expect(() => readBoundedContainedJson(repoDir, "artifacts/release/huge.json", 1)).toThrow();
      expect(() => readBoundedContainedJson(repoDir, "artifacts/release/link.json", 1000)).toThrow();
      expect(() => readBoundedContainedJson(repoDir, "artifacts/release/valid.json", 1000)).not.toThrow();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects descriptor identity drift during bound reads", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "proofroom-safe-read-race-"));
    try {
      const repoDir = join(tempDir, "repo");
      mkdirSync(join(repoDir, "artifacts/release"), { recursive: true });
      writeFileSync(join(repoDir, "artifacts/release/target.json"), "{}", "utf8");

      let fstatCalls = 0;
      const hooks: SafeReadFsHooks = {
        fstatSyncFn: ((fd) => {
          fstatCalls += 1;
          const stats = fstatSync(fd);
          if (fstatCalls === 2) {
            const forged = Object.create(Object.getPrototypeOf(stats)) as typeof stats;
            Object.assign(forged, stats, { ino: stats.ino + 1 });
            return forged;
          }
          return stats;
        }) as SafeReadFsHooks["fstatSyncFn"],
      };

      expect(() =>
        readBoundedContainedJson(repoDir, "artifacts/release/target.json", 1000, hooks),
      ).toThrow(/changed during read/);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
