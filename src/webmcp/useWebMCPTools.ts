/**
 * React binding for tool registration.
 *
 * The hook registers after the action interface is stable, aborts on cleanup, and
 * returns a status the page can announce. Every state the spec asks for is
 * representable: supported, registered, unavailable, partial, and error.
 */
import { useEffect, useMemo, useState } from "react";
import type { AgentActions } from "../domain/actions/index.ts";
import { createToolDefinitions, TOOL_NAMES } from "./toolDefinitions.ts";
import {
  getModelContext,
  registerRoomTools,
  unregisterRoomTools,
  type RegistrationFailure,
} from "./registerTools.ts";

export type WebMcpPhase =
  | "idle"
  | "registering"
  | "registered"
  | "partial"
  | "unavailable"
  | "error";

export type WebMcpStatus = {
  support: "supported" | "unavailable";
  phase: WebMcpPhase;
  expectedToolCount: number;
  registeredToolNames: string[];
  failures: RegistrationFailure[];
  message: string;
};

export const UNAVAILABLE_MESSAGE =
  "Agent tools are not available in this browser. Every part of this evaluation still works with the page controls.";

export function initialStatus(supported: boolean): WebMcpStatus {
  return {
    support: supported ? "supported" : "unavailable",
    phase: supported ? "idle" : "unavailable",
    expectedToolCount: TOOL_NAMES.length,
    registeredToolNames: [],
    failures: [],
    message: supported
      ? "Agent tools are supported in this browser and are being registered."
      : UNAVAILABLE_MESSAGE,
  };
}

export function useWebMcpTools(actions: AgentActions): WebMcpStatus {
  const definitions = useMemo(() => createToolDefinitions(actions), [actions]);
  const [status, setStatus] = useState<WebMcpStatus>(() =>
    initialStatus(getModelContext() !== null),
  );

  useEffect(() => {
    const modelContext = getModelContext();

    if (!modelContext) {
      setStatus(initialStatus(false));
      return;
    }

    const controller = new AbortController();
    let active = true;

    setStatus((current) => ({
      ...current,
      support: "supported",
      phase: "registering",
      message: "Registering agent tools.",
    }));

    registerRoomTools(definitions, { modelContext, signal: controller.signal })
      .then((outcome) => {
        if (!active) {
          return;
        }

        const phase: WebMcpPhase =
          outcome.registered.length === 0
            ? "error"
            : outcome.failures.length > 0
              ? "partial"
              : "registered";

        setStatus({
          support: "supported",
          phase,
          expectedToolCount: definitions.length,
          registeredToolNames: outcome.registered,
          failures: outcome.failures,
          message:
            phase === "registered"
              ? `${outcome.registered.length} agent tools are registered on this page.`
              : phase === "partial"
                ? `${outcome.registered.length} of ${definitions.length} agent tools registered. ${outcome.failures.length} failed and the page controls still cover every step.`
                : "No agent tool could be registered. The page controls still cover every step.",
        });
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setStatus({
          support: "supported",
          phase: "error",
          expectedToolCount: definitions.length,
          registeredToolNames: [],
          failures: [
            {
              name: "registration",
              message:
                error instanceof Error
                  ? error.message.slice(0, 200)
                  : "Registration failed for an unknown reason.",
            },
          ],
          message: "Agent tool registration failed. The page controls still cover every step.",
        });
      });

    return () => {
      active = false;
      controller.abort();
      unregisterRoomTools(modelContext, definitions.map((definition) => definition.name));
    };
  }, [definitions]);

  return status;
}
