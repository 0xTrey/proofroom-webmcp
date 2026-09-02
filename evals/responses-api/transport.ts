import type {
  ResponsesRequest,
  ResponsesResult,
  ResponsesTransport,
  ResponsesTransportError,
} from "./types.ts";

export type ScriptedTransportStep =
  | { kind: "result"; result: ResponsesResult }
  | { kind: "error"; error: ResponsesTransportError }
  | { kind: "unsupported_replay" };

export class FakeResponsesTransport implements ResponsesTransport {
  readonly requests: ResponsesRequest[] = [];
  private index = 0;
  private script: ScriptedTransportStep[];

  constructor(script: ScriptedTransportStep[]) {
    this.script = script;
  }

  async create(request: ResponsesRequest): Promise<ResponsesResult> {
    this.requests.push(structuredClone(request));
    const step = this.script[this.index++];
    if (!step) {
      throw new Error("Fake transport script exhausted.");
    }
    if (step.kind === "unsupported_replay") {
      const error: ResponsesTransportError = {
        kind: "http",
        status: 400,
        message: "reasoning.encrypted_content is not supported for this model.",
      };
      throw error;
    }
    if (step.kind === "error") {
      throw step.error;
    }
    return structuredClone(step.result);
  }
}

export type LiveTransportOptions = {
  apiKey: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export { isRetryableStatus };

export function isUnsupportedStatelessReplayError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("reasoning.encrypted_content") ||
    normalized.includes("unsupported_stateless_replay")
  );
}

export function createLiveResponsesTransport(options: LiveTransportOptions): ResponsesTransport {
  const timeoutMs = options.timeoutMs ?? 45000;
  const maxRetries = options.maxRetries ?? 2;
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async create(request: ResponsesRequest): Promise<ResponsesResult> {
      let attempt = 0;
      while (true) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetchImpl("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${options.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
            signal: controller.signal,
          });
          clearTimeout(timer);
          const bodyText = await response.text();
          if (!response.ok) {
            if (isRetryableStatus(response.status) && attempt < maxRetries) {
              attempt += 1;
              await sleep(250 * attempt);
              continue;
            }
            if (isUnsupportedStatelessReplayError(bodyText)) {
              const error: ResponsesTransportError = {
                kind: "http",
                status: response.status,
                message: "unsupported_stateless_replay",
              };
              throw error;
            }
            const error: ResponsesTransportError = {
              kind: "http",
              status: response.status,
              message: `HTTP ${response.status}`,
            };
            throw error;
          }
          const parsed = JSON.parse(bodyText) as ResponsesResult;
          return parsed;
        } catch (error) {
          clearTimeout(timer);
          if (error instanceof Error && error.name === "AbortError") {
            const timeoutError: ResponsesTransportError = {
              kind: "http",
              status: 408,
              message: "request_timeout",
            };
            throw timeoutError;
          }
          if (
            typeof error === "object" &&
            error !== null &&
            "kind" in error &&
            (error as ResponsesTransportError).kind === "http"
          ) {
            throw error;
          }
          const transportError: ResponsesTransportError = {
            kind: "http",
            status: 0,
            message: error instanceof Error ? error.message : "transport_error",
          };
          throw transportError;
        }
      }
    },
  };
}

export function assistantTextResult(text: string, usage?: ResponsesResult["usage"]): ResponsesResult {
  return {
    status: "completed",
    output: [
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text }],
      },
    ],
    usage,
  };
}

export function functionCallResult(
  callId: string,
  name: string,
  args: unknown,
  usage?: ResponsesResult["usage"],
): ResponsesResult {
  return {
    status: "completed",
    output: [
      {
        type: "reasoning",
        id: `rs_${callId}`,
        encrypted_content: "encrypted-placeholder",
      },
      {
        type: "function_call",
        call_id: callId,
        name,
        arguments: JSON.stringify(args),
      },
    ],
    usage,
  };
}

export function multiFunctionCallResult(
  calls: Array<{ callId: string; name: string; args: unknown }>,
): ResponsesResult {
  return {
    status: "completed",
    output: calls.map((call) => ({
      type: "function_call",
      call_id: call.callId,
      name: call.name,
      arguments: JSON.stringify(call.args),
    })),
  };
}
