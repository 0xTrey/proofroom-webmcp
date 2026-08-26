import { describe, expect, it } from "vitest";
import {
  AGENT_ACTION_NAMES,
  HUMAN_ONLY_ACTION_NAMES,
} from "../../src/domain/actions/index.ts";
import {
  getModelContext,
  isWebMcpSupported,
  registerRoomTools,
} from "../../src/webmcp/registerTools.ts";
import { createToolDefinitions, TOOL_NAMES } from "../../src/webmcp/toolDefinitions.ts";
import { createModelContextShim } from "../../src/webmcp/testShim.ts";
import { createTestRoom } from "../support/room.ts";

function setup(options: { failingToolNames?: string[]; failAll?: boolean } = {}) {
  const handle = createTestRoom();
  const shim = createModelContextShim(options);
  const definitions = createToolDefinitions(handle.agentActions);
  const controller = new AbortController();
  return { handle, shim, definitions, controller };
}

describe("tool registry", () => {
  it("registers nine uniquely named tools", async () => {
    const { shim, definitions, controller } = setup();

    const outcome = await registerRoomTools(definitions, {
      modelContext: shim.modelContext,
      signal: controller.signal,
    });

    expect(definitions).toHaveLength(9);
    expect(outcome.registered).toHaveLength(9);
    expect(outcome.failures).toHaveLength(0);
    expect(outcome.duplicates).toHaveLength(0);
    expect(shim.toolNames().sort()).toEqual([...TOOL_NAMES].sort());
    expect(new Set(shim.toolNames()).size).toBe(9);
  });

  it("keeps tool names aligned with the agent action names", () => {
    expect([...TOOL_NAMES]).toEqual([...AGENT_ACTION_NAMES]);
  });

  it("never exposes an approval or reset tool", async () => {
    const { shim, definitions, controller } = setup();
    await registerRoomTools(definitions, {
      modelContext: shim.modelContext,
      signal: controller.signal,
    });

    for (const humanOnly of HUMAN_ONLY_ACTION_NAMES) {
      expect(shim.has(humanOnly)).toBe(false);
    }
    expect(shim.toolNames().some((name) => name.includes("approve"))).toBe(false);
  });

  it("skips a duplicate definition instead of registering it twice", async () => {
    const { shim, definitions, controller } = setup();
    const first = definitions[0];
    expect(first).toBeDefined();

    const outcome = await registerRoomTools([...definitions, first!], {
      modelContext: shim.modelContext,
      signal: controller.signal,
    });

    expect(outcome.duplicates).toEqual([first!.name]);
    expect(shim.toolNames()).toHaveLength(9);
  });

  it("unregisters every tool when the abort signal fires", async () => {
    const { shim, definitions, controller } = setup();
    await registerRoomTools(definitions, {
      modelContext: shim.modelContext,
      signal: controller.signal,
    });

    expect(shim.toolNames()).toHaveLength(9);
    controller.abort();
    expect(shim.toolNames()).toHaveLength(0);
  });

  it("reports partial failure without losing the healthy tools", async () => {
    const { shim, definitions, controller } = setup({
      failingToolNames: ["attach_evidence", "calculate_roi"],
    });

    const outcome = await registerRoomTools(definitions, {
      modelContext: shim.modelContext,
      signal: controller.signal,
    });

    expect(outcome.registered).toHaveLength(7);
    expect(outcome.failures.map((failure) => failure.name).sort()).toEqual([
      "attach_evidence",
      "calculate_roi",
    ]);
    expect(outcome.failures[0]?.message).not.toContain("at Object");
  });

  it("reports total failure safely", async () => {
    const { shim, definitions, controller } = setup({ failAll: true });

    const outcome = await registerRoomTools(definitions, {
      modelContext: shim.modelContext,
      signal: controller.signal,
    });

    expect(outcome.registered).toHaveLength(0);
    expect(outcome.failures).toHaveLength(9);
  });

  it("detects an unsupported browser", () => {
    expect(isWebMcpSupported()).toBe(false);
    expect(getModelContext()).toBeNull();

    const shim = createModelContextShim();
    const restore = shim.install();
    expect(isWebMcpSupported()).toBe(true);
    restore();
    expect(isWebMcpSupported()).toBe(false);
  });
});

describe("tool annotations and schemas", () => {
  const { definitions } = setup();
  const byName = new Map(definitions.map((definition) => [definition.name, definition]));

  it("marks the four read only tools and only those", () => {
    const readOnly = definitions
      .filter((definition) => definition.annotations?.readOnlyHint === true)
      .map((definition) => definition.name)
      .sort();

    expect(readOnly).toEqual([
      "calculate_roi",
      "evaluate_requirement",
      "get_room_state",
      "search_product_evidence",
    ]);
  });

  it("marks only evidence search as untrusted content", () => {
    const untrusted = definitions
      .filter((definition) => definition.annotations?.untrustedContentHint === true)
      .map((definition) => definition.name);

    expect(untrusted).toEqual(["search_product_evidence"]);
  });

  it("gives every tool a title, a description, and a strict object schema", () => {
    for (const definition of definitions) {
      expect(definition.title).toBeTruthy();
      expect(definition.description.length).toBeGreaterThan(80);
      expect(definition.inputSchema.type).toBe("object");
      expect(definition.inputSchema.additionalProperties).toBe(false);
    }
  });

  it("states in the staging tool descriptions that approval is not available", () => {
    expect(byName.get("propose_buyer_context")?.description).toContain("cannot approve");
    expect(byName.get("propose_decision_status")?.description).toContain("cannot approve");
    expect(byName.get("stage_requirement")?.description).toContain("cannot set requirement status");
  });

  it("bounds the search query and the evidence list in the published schema", () => {
    const search = byName.get("search_product_evidence")?.inputSchema.properties as
      | Record<string, { maxLength?: number }>
      | undefined;
    expect(search?.query?.maxLength).toBe(160);

    const attach = byName.get("attach_evidence")?.inputSchema.properties as
      | Record<string, { maxItems?: number }>
      | undefined;
    expect(attach?.evidenceIds?.maxItems).toBe(6);
  });
});
