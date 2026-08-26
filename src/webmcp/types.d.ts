/**
 * Local declarations for the experimental WebMCP surface.
 *
 * TypeScript DOM types do not describe `document.modelContext` yet. These
 * declarations follow the imperative tool registration shape in the WebMCP
 * repository: a definition with a name, an optional title, a description, a JSON
 * Schema input, annotations, and an execute callback, registered with an optional
 * `AbortSignal` for cleanup. Everything is isolated here so a specification change
 * touches one adapter.
 */

declare global {
  type WebMcpJsonSchema = {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
    [key: string]: unknown;
  };

  type WebMcpTextContent = {
    type: "text";
    text: string;
  };

  type WebMcpToolResult = {
    content: WebMcpTextContent[];
    structuredContent?: Record<string, unknown>;
    isError?: boolean;
  };

  type WebMcpToolAnnotations = {
    title?: string;
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
    idempotentHint?: boolean;
  };

  interface WebMcpToolDefinition {
    name: string;
    title?: string;
    description: string;
    inputSchema: WebMcpJsonSchema;
    annotations?: WebMcpToolAnnotations;
    execute(args: unknown): Promise<WebMcpToolResult> | WebMcpToolResult;
  }

  interface WebMcpRegisterToolOptions {
    signal?: AbortSignal;
  }

  interface WebMcpModelContext {
    registerTool(
      definition: WebMcpToolDefinition,
      options?: WebMcpRegisterToolOptions,
    ): Promise<void> | void;
    unregisterTool?(name: string): void;
  }

  interface Document {
    modelContext?: WebMcpModelContext;
  }
}

export {};
