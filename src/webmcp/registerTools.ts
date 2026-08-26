/**
 * Tool registration lifecycle.
 *
 * Registration is imperative, uses one `AbortSignal` for cleanup, and settles
 * every registration so a single rejection cannot take down the page or hide the
 * other eight tools. Partial failure is reported, not swallowed.
 */

export type RegistrationFailure = {
  name: string;
  message: string;
};

export type RegistrationOutcome = {
  registered: string[];
  failures: RegistrationFailure[];
  duplicates: string[];
};

export function getModelContext(target: Document | undefined = globalThis.document):
  | WebMcpModelContext
  | null {
  const modelContext = target?.modelContext;
  if (!modelContext || typeof modelContext.registerTool !== "function") {
    return null;
  }
  return modelContext;
}

export function isWebMcpSupported(target: Document | undefined = globalThis.document): boolean {
  return getModelContext(target) !== null;
}

function safeMessage(error: unknown): string {
  if (error instanceof Error) {
    // Message only. A raw stack trace must never reach the status surface.
    return error.message.slice(0, 200);
  }
  if (typeof error === "string") {
    return error.slice(0, 200);
  }
  return "The browser rejected this tool registration.";
}

export async function registerRoomTools(
  definitions: readonly WebMcpToolDefinition[],
  options: { modelContext: WebMcpModelContext; signal: AbortSignal },
): Promise<RegistrationOutcome> {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  const unique: WebMcpToolDefinition[] = [];

  for (const definition of definitions) {
    if (seen.has(definition.name)) {
      duplicates.push(definition.name);
      continue;
    }
    seen.add(definition.name);
    unique.push(definition);
  }

  const settled = await Promise.allSettled(
    unique.map(async (definition) => {
      await options.modelContext.registerTool(definition, { signal: options.signal });
      return definition.name;
    }),
  );

  const registered: string[] = [];
  const failures: RegistrationFailure[] = [];

  settled.forEach((outcome, index) => {
    const name = unique[index]?.name ?? "unknown_tool";
    if (outcome.status === "fulfilled") {
      registered.push(name);
    } else {
      failures.push({ name, message: safeMessage(outcome.reason) });
    }
  });

  return { registered, failures, duplicates };
}

/**
 * Best effort explicit cleanup. The abort signal is the contract; this covers a
 * browser that also offers `unregisterTool`.
 */
export function unregisterRoomTools(
  modelContext: WebMcpModelContext,
  names: readonly string[],
): void {
  if (typeof modelContext.unregisterTool !== "function") {
    return;
  }
  for (const name of names) {
    try {
      modelContext.unregisterTool(name);
    } catch {
      // Cleanup is never allowed to break unmount.
    }
  }
}
