import type { ToolName } from "../contract.ts";
import { proposeBuyerContextInputSchema } from "../../src/domain/actions/inputs.ts";
import { inputDigest } from "../../src/domain/hash.ts";
import type { AdaptedToolRegistry } from "./adapter.ts";
import { executeAdaptedToolCall } from "./adapter.ts";
import { RESPONSES_GUARD_INSTRUCTIONS } from "./guard.ts";
import { redactErrorMessage } from "./redaction.ts";
import type { RoomStoreHandle } from "../../src/state/createRoomStore.ts";
import { isUnsupportedStatelessReplayError } from "./transport.ts";
import type {
  CaseLoopResult,
  ResponsesRequest,
  ResponsesResult,
  ResponsesTransport,
  ResponsesTransportError,
  ResponseOutputItem,
  RoomStateReadCapture,
  ToolCallRecord,
} from "./types.ts";
import { RESPONSES_MAX_OUTPUT_TOKENS } from "./types.ts";

const DEFAULT_MAX_MODEL_TURNS = 8;
const DEFAULT_MAX_TOTAL_CALLS = 16;

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function captureRoomStateRead(structured: Record<string, unknown>): RoomStateReadCapture | undefined {
  const template = record(structured.buyerContextStagingTemplate);
  if (!template.source || !template.profileId || !template.input) {
    return undefined;
  }
  let validated;
  try {
    validated = proposeBuyerContextInputSchema.parse(template.input);
  } catch {
    return undefined;
  }
  return {
    stagingTemplateSource: String(template.source),
    stagingTemplateProfileId: String(template.profileId),
    stagingTemplateInputDigest: inputDigest(validated),
  };
}

function summarizeToolResult(tool: ToolName, result: WebMcpToolResult): Record<string, unknown> {
  const payload = (result.structuredContent ?? {}) as Record<string, unknown>;
  if (result.isError) {
    return {
      code: payload.code,
      mutated: payload.mutated === true,
    };
  }
  switch (tool) {
    case "search_product_evidence": {
      const results = Array.isArray(payload.results) ? payload.results : [];
      return {
        returnedIds: results.map((entry) => (entry as Record<string, unknown>).id),
        returnedUntrustedFlags: results.map(
          (entry) => (entry as Record<string, unknown>).untrustedContent === true,
        ),
        matched: payload.matched,
        returned: payload.returned,
      };
    }
    case "calculate_roi":
      return {
        paybackMonths: payload.paybackMonths,
        withinBudget: (payload.budgetComparison as Record<string, unknown> | undefined)?.withinBudget,
      };
    case "evaluate_requirement":
      return {
        requirementId: payload.requirementId,
        proposedStatus: payload.proposedStatus,
        gapLabels: payload.gapLabels,
      };
    case "get_room_state":
      return {
        revision: payload.revision,
        hasStagingTemplate: Boolean(payload.buyerContextStagingTemplate),
      };
    default:
      return { revision: payload.revision };
  }
}

function extractAssistantText(output: ResponseOutputItem[]): string {
  const chunks: string[] = [];
  for (const item of output) {
    if (item.type !== "message" || item.role !== "assistant") {
      continue;
    }
    const content = item.content;
    if (!Array.isArray(content)) {
      continue;
    }
    for (const part of content) {
      if (part && typeof part === "object" && part.type === "output_text" && typeof part.text === "string") {
        chunks.push(part.text);
      }
    }
  }
  return chunks.join("\n").trim();
}

function extractFunctionCalls(output: ResponseOutputItem[]): ResponseOutputItem[] {
  return output.filter((item) => item.type === "function_call");
}

function errorCode(result: WebMcpToolResult): string | null {
  if (!result.isError) {
    return null;
  }
  const structured = result.structuredContent;
  if (structured && typeof structured.code === "string") {
    return structured.code;
  }
  return "UNKNOWN_ERROR";
}

export async function runResponsesLoop(options: {
  transport: ResponsesTransport;
  registry: AdaptedToolRegistry;
  handle: RoomStoreHandle;
  model: string;
  prompt: string;
  maxModelTurns?: number;
  maxTotalCalls?: number;
}): Promise<CaseLoopResult> {
  const inputItems: unknown[] = [
    {
      type: "message",
      role: "user",
      content: `${options.prompt}\n\n${RESPONSES_GUARD_INSTRUCTIONS}`,
    },
  ];
  const toolCalls: ToolCallRecord[] = [];
  const tokenUsage: CaseLoopResult["tokenUsage"] = {};
  let modelTurns = 0;
  let stopReason: CaseLoopResult["stopReason"] = "assistant_text";
  let protocolError: string | null = null;
  let finalAssistantText: string | null = null;

  const maxModelTurns = options.maxModelTurns ?? DEFAULT_MAX_MODEL_TURNS;
  const maxTotalCalls = options.maxTotalCalls ?? DEFAULT_MAX_TOTAL_CALLS;

  while (modelTurns < maxModelTurns) {
    if (toolCalls.length >= maxTotalCalls) {
      stopReason = "call_limit";
      break;
    }
    modelTurns += 1;
    const request: ResponsesRequest = {
      model: options.model,
      input: inputItems,
      tools: options.registry.tools,
      store: false,
      parallel_tool_calls: false,
      tool_choice: "auto",
      include: ["reasoning.encrypted_content"],
      max_output_tokens: RESPONSES_MAX_OUTPUT_TOKENS,
    };

    let response: ResponsesResult;
    try {
      response = await options.transport.create(request);
    } catch (error) {
      const transportError = error as ResponsesTransportError;
      if (isUnsupportedStatelessReplayError(transportError?.message ?? "")) {
        stopReason = "unsupported_stateless_replay";
        protocolError = "unsupported_stateless_replay";
      } else {
        stopReason = "transport_error";
        protocolError = redactErrorMessage(transportError?.message ?? "transport_error");
      }
      break;
    }

    if (response.usage) {
      tokenUsage.input_tokens =
        (tokenUsage.input_tokens ?? 0) + (response.usage.input_tokens ?? 0);
      tokenUsage.output_tokens =
        (tokenUsage.output_tokens ?? 0) + (response.usage.output_tokens ?? 0);
      tokenUsage.total_tokens =
        (tokenUsage.total_tokens ?? 0) + (response.usage.total_tokens ?? 0);
    }

    if (response.status !== "completed") {
      stopReason = "protocol_error";
      protocolError = `Unexpected terminal status: ${response.status}`;
      break;
    }

    const output = response.output ?? [];
    const functionCalls = extractFunctionCalls(output);
    if (functionCalls.length > 1) {
      stopReason = "protocol_error";
      protocolError = "More than one function_call in a single response.";
      break;
    }

    inputItems.push(...output);

    if (functionCalls.length === 0) {
      finalAssistantText = extractAssistantText(output);
      stopReason = "assistant_text";
      break;
    }

    const callItem = functionCalls[0]!;
    const callId = String(callItem.call_id ?? "");
    const name = String(callItem.name ?? "");
    const argumentsJson = String(callItem.arguments ?? "");
    if (!callId) {
      stopReason = "protocol_error";
      protocolError = "Missing call_id on function_call.";
      break;
    }
    const seenCallIds = new Set(toolCalls.map((call) => call.callId));
    if (seenCallIds.has(callId)) {
      stopReason = "protocol_error";
      protocolError = "Duplicate call_id detected.";
      break;
    }

    const roomBefore = options.handle.store.getState().room;
    let executed;
    try {
      executed = await executeAdaptedToolCall(options.registry, callId, name, argumentsJson);
    } catch (executionError) {
      stopReason = "protocol_error";
      protocolError =
        executionError instanceof Error
          ? redactErrorMessage(executionError.message)
          : "tool_execution_protocol_error";
      break;
    }

    const roomAfter = options.handle.store.getState().room;
    const structured = (executed.result.structuredContent ?? {}) as Record<string, unknown>;
    const readCapture =
      executed.name === "get_room_state" && !executed.result.isError
        ? captureRoomStateRead(structured)
        : undefined;

    toolCalls.push({
      index: toolCalls.length + 1,
      name: executed.name,
      callId: executed.callId,
      inputDigest: executed.inputDigest,
      outcome: executed.result.isError ? "error" : "success",
      errorCode: errorCode(executed.result),
      revisionBefore: roomBefore.revision,
      revisionAfter: roomAfter.revision,
      ledgerCountBefore: roomBefore.activityLedger.length,
      ledgerCountAfter: roomAfter.activityLedger.length,
      resultSummary: summarizeToolResult(executed.name, executed.result),
      readCapture,
    });

    inputItems.push({
      type: "function_call_output",
      call_id: executed.callId,
      output: executed.output,
    });
  }

  if (modelTurns >= maxModelTurns && stopReason === "assistant_text" && !finalAssistantText) {
    stopReason = "turn_limit";
  }

  return {
    stopReason,
    protocolError,
    finalAssistantText,
    toolCalls,
    modelTurns,
    tokenUsage,
  };
}
