import { HUMAN_ONLY_ACTION_NAMES } from "../../src/domain/actions/index.ts";
import type { AgentActions } from "../../src/domain/actions/index.ts";
import { inputDigest } from "../../src/domain/hash.ts";
import {
  createToolDefinitions,
  TOOL_NAMES,
  type ToolName,
} from "../../src/webmcp/toolDefinitions.ts";
import type { ResponsesFunctionTool } from "./types.ts";
import { formatFunctionCallOutput } from "./redaction.ts";

export type AdaptedToolRegistry = {
  tools: ResponsesFunctionTool[];
  definitions: WebMcpToolDefinition[];
  byName: Map<ToolName, WebMcpToolDefinition>;
};

export function adaptToolDefinitions(actions: AgentActions): AdaptedToolRegistry {
  const definitions = createToolDefinitions(actions);
  const tools: ResponsesFunctionTool[] = definitions.map((definition) => ({
    type: "function",
    name: definition.name,
    description: definition.description,
    parameters: definition.inputSchema as Record<string, unknown>,
    strict: false,
  }));
  validateAdaptedTools(tools);
  const byName = new Map<ToolName, WebMcpToolDefinition>();
  for (const definition of definitions) {
    byName.set(definition.name as ToolName, definition);
  }
  return { tools, definitions, byName };
}

export function validateAdaptedTools(tools: ResponsesFunctionTool[]): void {
  const names = tools.map((tool) => tool.name);
  if (JSON.stringify(names) !== JSON.stringify(TOOL_NAMES)) {
    throw new Error("Adapted tool names do not match the production TOOL_NAMES order.");
  }
  if (new Set(names).size !== 9) {
    throw new Error("Adapted tool registry must contain exactly nine unique names.");
  }
  for (const humanOnly of HUMAN_ONLY_ACTION_NAMES) {
    if (names.includes(humanOnly)) {
      throw new Error(`Human-only action leaked into adapted tools: ${humanOnly}`);
    }
  }
  for (const tool of tools) {
    if (!tool.description.trim()) {
      throw new Error("Tool " + tool.name + " is missing a description.");
    }
    if (tool.parameters.type !== "object") {
      throw new Error("Tool " + tool.name + " input schema must be an object schema.");
    }
    if (tool.strict !== false) {
      throw new Error("Tool " + tool.name + " must set strict to false explicitly.");
    }
  }
}

export type ExecutedToolCall = {
  name: ToolName;
  callId: string;
  args: unknown;
  inputDigest: string;
  result: WebMcpToolResult;
  output: string;
};

export async function executeAdaptedToolCall(
  registry: AdaptedToolRegistry,
  callId: string,
  name: string,
  argumentsJson: string,
): Promise<ExecutedToolCall> {
  if (!TOOL_NAMES.includes(name as ToolName)) {
    throw new Error(`Unknown tool name: ${name}`);
  }
  if (HUMAN_ONLY_ACTION_NAMES.includes(name as never)) {
    throw new Error(`Human-only action rejected: ${name}`);
  }
  let args: unknown;
  try {
    args = JSON.parse(argumentsJson);
  } catch {
    throw new Error("Malformed tool arguments JSON.");
  }
  const definition = registry.byName.get(name as ToolName);
  if (!definition) {
    throw new Error(`Missing production definition for ${name}.`);
  }
  const result = await Promise.resolve(definition.execute(args));
  return {
    name: name as ToolName,
    callId,
    args,
    inputDigest: inputDigest(args),
    result,
    output: formatFunctionCallOutput(name as ToolName, result),
  };
}
