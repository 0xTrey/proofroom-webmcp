/**
 * Typed domain errors.
 *
 * Actions return results instead of throwing. A thrown error would make atomic
 * failure harder to guarantee and would let a stack trace reach a tool response.
 */
import type { z } from "zod";

export const DOMAIN_ERROR_CODES = [
  "INVALID_INPUT",
  "NOT_FOUND",
  "EVIDENCE_INELIGIBLE",
  "EVIDENCE_INSUFFICIENT",
  "PROPOSAL_STALE",
  "PROPOSAL_EXPIRED",
  "PROPOSAL_RESOLVED",
  "DECISION_BLOCKED",
  "PERSISTENCE_UNAVAILABLE",
] as const;

export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[number];

export type FieldIssue = {
  path: string;
  message: string;
};

export type DomainError = {
  code: DomainErrorCode;
  message: string;
  /** Field level issues, safe to render next to an input. */
  issues: FieldIssue[];
  /** Entity IDs the caller can act on, such as a blocking requirement ID. */
  relatedIds: string[];
};

/**
 * The failure half of a result. It is deliberately not generic, so a failure can
 * be returned from any action without weakening the inference of the success
 * value type.
 */
export type ActionFailure = { ok: false; error: DomainError };

export type ActionResult<Value> = { ok: true; value: Value } | ActionFailure;

export function domainError(
  code: DomainErrorCode,
  message: string,
  options: { issues?: FieldIssue[]; relatedIds?: string[] } = {},
): DomainError {
  return {
    code,
    message,
    issues: options.issues ?? [],
    relatedIds: options.relatedIds ?? [],
  };
}

export function failure(
  code: DomainErrorCode,
  message: string,
  options: { issues?: FieldIssue[]; relatedIds?: string[] } = {},
): ActionFailure {
  return { ok: false, error: domainError(code, message, options) };
}

export function success<Value>(value: Value): ActionResult<Value> {
  return { ok: true, value };
}

export function isFailure<Value>(
  result: ActionResult<Value>,
): result is { ok: false; error: DomainError } {
  return result.ok === false;
}

/**
 * Converts a Zod failure into the same error shape a tool response or an
 * accessible UI notice renders. Messages stay field scoped and never include
 * the raw submitted value.
 */
export function fromZodError(error: z.ZodError, message = "The input did not match the schema."): DomainError {
  const issues: FieldIssue[] = error.issues.slice(0, 12).map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "(root)",
    message: issue.message,
  }));

  return domainError("INVALID_INPUT", message, { issues });
}

/**
 * Parses input with a strict schema and returns a domain result. Every tool and
 * every UI action funnels input through this helper.
 */
export function parseInput<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
  message?: string,
): ActionResult<z.infer<Schema>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: fromZodError(parsed.error, message) };
  }
  return { ok: true, value: parsed.data };
}
