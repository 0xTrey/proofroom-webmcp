/**
 * Action runtime.
 *
 * Every room read and every room mutation runs through `executeAction`, so the
 * revision rule, the ledger rule, and atomic failure are implemented once.
 *
 * Rules enforced here:
 *   - Input is parsed by the action's strict schema before any logic runs.
 *   - A failed action changes nothing at all, including the activity ledger.
 *   - A successful mutating action increments revision exactly once and appends
 *     exactly one event.
 *   - A successful read-only action appends exactly one event and leaves the
 *     revision alone.
 */
import type { z } from "zod";
import { parseInput, type ActionResult } from "../errors.ts";
import { MAX_LEDGER_EVENTS } from "../invariants.ts";
import type { ActionOrigin, ActivityEvent, Panel, RoomState } from "../types.ts";

export type ActionInvocation = {
  origin: ActionOrigin;
  nowIso: string;
};

export type ActionContext = ActionInvocation & {
  /** Revision the room will carry if this action succeeds. */
  nextRevision: number;
  /** Sequence the ledger event will carry if this action succeeds. */
  nextSequence: number;
};

export type ActionOutcome<Value> = {
  value: Value;
  /**
   * State transformation for a mutating action. It must not touch `revision` or
   * `activityLedger`; the runtime owns both.
   */
  patch?: (state: RoomState) => RoomState;
  affectedIds?: string[];
  /** Redacted one line description of the input. Never raw buyer text. */
  inputSummary: string;
  untrustedContent?: boolean;
};

/**
 * Wraps a successful outcome. Actions use this instead of the generic `success`
 * helper so `Value` is inferred from the outcome's own `value` property.
 */
export function outcome<Value>(value: ActionOutcome<Value>): ActionResult<ActionOutcome<Value>> {
  return { ok: true, value };
}

export type ActionDefinition<Schema extends z.ZodType, Value> = {
  /** Ledger action name. Matches the WebMCP tool name where one exists. */
  action: string;
  toolName: string | null;
  panel: Panel;
  mutating: boolean;
  schema: Schema;
  run: (
    state: RoomState,
    input: z.output<Schema>,
    context: ActionContext,
  ) => ActionResult<ActionOutcome<Value>>;
};

export function defineAction<Schema extends z.ZodType, Value>(
  definition: ActionDefinition<Schema, Value>,
): ActionDefinition<Schema, Value> {
  return definition;
}

export function nextSequenceFor(state: RoomState): number {
  const last = state.activityLedger.at(-1);
  return (last?.sequence ?? 0) + 1;
}

export function eventId(sequence: number): string {
  return `evt_${String(sequence).padStart(4, "0")}`;
}

function appendEvent(state: RoomState, event: ActivityEvent): RoomState {
  const ledger = [...state.activityLedger, event];
  return {
    ...state,
    activityLedger: ledger.length > MAX_LEDGER_EVENTS ? ledger.slice(-MAX_LEDGER_EVENTS) : ledger,
  };
}

export function executeAction<Schema extends z.ZodType, Value>(
  state: RoomState,
  definition: ActionDefinition<Schema, Value>,
  rawInput: unknown,
  invocation: ActionInvocation,
  digestOf: (value: unknown) => string,
): ActionResult<{ value: Value; state: RoomState }> {
  const parsed = parseInput(definition.schema, rawInput, `Invalid input for ${definition.action}.`);
  if (!parsed.ok) {
    return parsed;
  }

  const revisionBefore = state.revision;
  const revisionAfter = definition.mutating ? revisionBefore + 1 : revisionBefore;
  const nextSequence = nextSequenceFor(state);

  const outcome = definition.run(state, parsed.value, {
    ...invocation,
    nextRevision: revisionAfter,
    nextSequence,
  });

  if (!outcome.ok) {
    return outcome;
  }

  const patched =
    definition.mutating && outcome.value.patch ? outcome.value.patch(state) : state;

  const event: ActivityEvent = {
    id: eventId(nextSequence),
    sequence: nextSequence,
    origin: invocation.origin,
    action: definition.action,
    toolName: definition.toolName,
    inputDigest: digestOf(parsed.value),
    inputSummary: outcome.value.inputSummary,
    resultStatus: "ok",
    revisionBefore,
    revisionAfter,
    affectedIds: outcome.value.affectedIds ?? [],
    panel: definition.panel,
    mutating: definition.mutating,
    untrustedContent: outcome.value.untrustedContent ?? false,
    createdAt: invocation.nowIso,
  };

  const committed = appendEvent(
    definition.mutating ? { ...patched, revision: revisionAfter } : patched,
    event,
  );

  return { ok: true, value: { value: outcome.value.value, state: committed } };
}
