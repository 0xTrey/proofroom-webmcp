import { expect, type Page } from "@playwright/test";

export async function installBrowserToolShim(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const definitions = new Map<string, WebMcpToolDefinition>();
    const observedTools: string[] = [];
    document.modelContext = {
      async registerTool(definition, options) {
        definitions.set(definition.name, definition);
        options?.signal?.addEventListener("abort", () => definitions.delete(definition.name), {
          once: true,
        });
      },
      unregisterTool(name) {
        definitions.delete(name);
      },
    };
    const hooks = window as unknown as {
      __proofroomCallTool(name: string, args: unknown): Promise<WebMcpToolResult>;
      __proofroomObservedTools: string[];
    };
    hooks.__proofroomObservedTools = observedTools;
    hooks.__proofroomCallTool = async (name, args) => {
      const definition = definitions.get(name);
      if (!definition) throw new Error(`${name} is not registered`);
      observedTools.push(name);
      return definition.execute(args);
    };
  });
}

export async function callTool(
  page: Page,
  name: string,
  args: unknown,
): Promise<WebMcpToolResult> {
  const result = await page.evaluate(
    async ({ toolName, toolArgs }) =>
      (
        window as unknown as {
          __proofroomCallTool(name: string, input: unknown): Promise<WebMcpToolResult>;
        }
      ).__proofroomCallTool(toolName, toolArgs),
    { toolName: name, toolArgs: args },
  );
  expect(result.isError, `${name} should succeed`).toBe(false);
  return result;
}
