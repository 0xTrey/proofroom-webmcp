import type { ToolName } from "../contract.ts";

export type ResponsesFunctionTool = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  strict: false;
};

export const RESPONSES_MAX_OUTPUT_TOKENS = 4096;

export type ResponsesRequest = {
  model: string;
  input: unknown[];
  tools: ResponsesFunctionTool[];
  store: false;
  parallel_tool_calls: false;
  tool_choice: "auto";
  include: ["reasoning.encrypted_content"];
  max_output_tokens: typeof RESPONSES_MAX_OUTPUT_TOKENS;
};

export type ResponseOutputItem = Record<string, unknown>;

export type ResponsesUsage = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
};

export type ResponsesResult = {
  status: string;
  output: ResponseOutputItem[];
  usage?: ResponsesUsage;
};

export type ResponsesTransportError = {
  kind: "http";
  status: number;
  message: string;
};

export type ResponsesTransport = {
  create(request: ResponsesRequest): Promise<ResponsesResult>;
};

export type RoomStateReadCapture = {
  stagingTemplateSource: string;
  stagingTemplateProfileId: string;
  stagingTemplateInputDigest: string;
};

export type ToolCallRecord = {
  index: number;
  name: ToolName;
  callId: string;
  inputDigest: string;
  outcome: "success" | "error";
  errorCode: string | null;
  revisionBefore: number;
  revisionAfter: number;
  ledgerCountBefore: number;
  ledgerCountAfter: number;
  resultSummary: Record<string, unknown>;
  readCapture?: RoomStateReadCapture;
};

export type LoopStopReason =
  | "assistant_text"
  | "protocol_error"
  | "turn_limit"
  | "call_limit"
  | "unsupported_stateless_replay"
  | "transport_error";

export type CaseLoopResult = {
  stopReason: LoopStopReason;
  protocolError: string | null;
  finalAssistantText: string | null;
  toolCalls: ToolCallRecord[];
  modelTurns: number;
  tokenUsage: ResponsesUsage;
};

export type AssertionDimension =
  | "tool_selection"
  | "argument_grounding"
  | "state_safety"
  | "truth_boundary"
  | "completion";

export const ASSERTION_DIMENSIONS: readonly AssertionDimension[] = [
  "tool_selection",
  "argument_grounding",
  "state_safety",
  "truth_boundary",
  "completion",
];

export type NamedAssertionResult = {
  id: string;
  dimension: AssertionDimension;
  critical: boolean;
  description: string;
  pass: boolean;
  detail: string;
};

export type CaseTerminalSummary = {
  revision: number;
  ledgerEventCount: number;
  requirementStatuses: Record<string, string>;
  buyerContextProposalStatus: string | null;
  approvedBuyerContextPresent: boolean;
  decisionProposalStatus: string | null;
  approvedDecisionPresent: boolean;
  euResidencyStatus: string | null;
};

export type EvaluatedCaseResult = {
  id: string;
  outcome: "pass" | "fail";
  score: number;
  toolSequence: ToolName[];
  callOutcome: "completed" | "protocol_error" | "limit" | "transport_error";
  safeInputDigests: string[];
  assertions: NamedAssertionResult[];
  terminal: CaseTerminalSummary;
  boundedFinalAssistantText: string | null;
  tokenUsage: ResponsesUsage;
  stopReason: LoopStopReason;
};

export const TRUTH_LABELS = {
  classification: "local_openai_responses_model_selection",
  provesNativeWebMcpDiscovery: false,
  provesCompatibleBrowserAgent: false,
  liveBrowserAgentStatus: "not_run",
  euDataResidency: "unknown",
} as const;

export type ResponsesEvalRecord = {
  schemaVersion: 1;
  status: "not_run" | "passed" | "failed";
  reason?: string;
  model: string | null;
  startedAt: string | null;
  completedAt: string | null;
  caseIds: string[];
  aggregateScore: number | null;
  casePassCount: number | null;
  caseFailCount: number | null;
  cases: EvaluatedCaseResult[];
  knownDeviations: string[];
  contractDigest: string;
  truthLabels: typeof TRUTH_LABELS;
};
