/**
 * Model context test shim.
 *
 * The shim captures the real tool definitions and executes them against the real
 * action interface. It never re-implements a tool, so a passing shim test is
 * evidence about the shipped tools rather than about a mock.
 */

export type ShimCall = {
  name: string;
  args: unknown;
  result: WebMcpToolResult;
};

export type ModelContextShim = {
  modelContext: WebMcpModelContext;
  /** Registered definitions, in registration order. */
  definitions(): WebMcpToolDefinition[];
  toolNames(): string[];
  has(name: string): boolean;
  definition(name: string): WebMcpToolDefinition | undefined;
  callTool(name: string, args?: unknown): Promise<WebMcpToolResult>;
  calls: ShimCall[];
  /** Installs the shim on a document and returns a restore function. */
  install(target?: Document): () => void;
};

export type ModelContextShimOptions = {
  /** Tool names whose registration should reject, for partial failure tests. */
  failingToolNames?: readonly string[];
  /** Rejects every registration, for total failure tests. */
  failAll?: boolean;
};

export function createModelContextShim(
  options: ModelContextShimOptions = {},
): ModelContextShim {
  const registry = new Map<string, WebMcpToolDefinition>();
  const order: string[] = [];
  const calls: ShimCall[] = [];

  function remove(name: string): void {
    registry.delete(name);
    const index = order.indexOf(name);
    if (index >= 0) {
      order.splice(index, 1);
    }
  }

  const modelContext: WebMcpModelContext = {
    async registerTool(definition, registerOptions) {
      if (options.failAll || options.failingToolNames?.includes(definition.name)) {
        throw new Error(`This browser rejected ${definition.name}.`);
      }

      if (registry.has(definition.name)) {
        throw new Error(`${definition.name} is already registered.`);
      }

      registry.set(definition.name, definition);
      order.push(definition.name);

      const signal = registerOptions?.signal;
      if (signal) {
        if (signal.aborted) {
          remove(definition.name);
          return;
        }
        signal.addEventListener("abort", () => remove(definition.name), { once: true });
      }
    },
    unregisterTool(name) {
      remove(name);
    },
  };

  return {
    modelContext,
    definitions: () =>
      order.map((name) => registry.get(name)).filter((entry): entry is WebMcpToolDefinition => Boolean(entry)),
    toolNames: () => [...order],
    has: (name) => registry.has(name),
    definition: (name) => registry.get(name),
    calls,
    async callTool(name, args) {
      const definition = registry.get(name);
      if (!definition) {
        throw new Error(`${name} is not registered.`);
      }
      const result = await definition.execute(args ?? {});
      calls.push({ name, args: args ?? {}, result });
      return result;
    },
    install(target = globalThis.document) {
      const previous = target.modelContext;
      target.modelContext = modelContext;
      return () => {
        if (previous === undefined) {
          delete target.modelContext;
          return;
        }
        target.modelContext = previous;
      };
    },
  };
}

/** Convenience for tests: pull the structured payload out of a tool result. */
export function structuredOf<Value = Record<string, unknown>>(
  result: WebMcpToolResult,
): Value {
  return result.structuredContent as Value;
}
