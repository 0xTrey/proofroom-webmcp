/**
 * Tool input schemas.
 *
 * These are the domain action schemas, re-exported. A tool cannot accept a shape
 * the domain action would reject, because there is only one schema per action.
 * JSON Schema for the tool registry is generated from the same object.
 */
import { z } from "zod";
import {
  attachEvidenceInputSchema,
  calculateRoiInputSchema,
  evaluateRequirementInputSchema,
  getRoomStateInputSchema,
  proposeBuyerContextInputSchema,
  proposeDecisionStatusInputSchema,
  saveStakeholderBriefInputSchema,
  searchProductEvidenceInputSchema,
  stageRequirementInputSchema,
} from "../domain/actions/inputs.ts";

export {
  attachEvidenceInputSchema,
  calculateRoiInputSchema,
  evaluateRequirementInputSchema,
  getRoomStateInputSchema,
  proposeBuyerContextInputSchema,
  proposeDecisionStatusInputSchema,
  saveStakeholderBriefInputSchema,
  searchProductEvidenceInputSchema,
  stageRequirementInputSchema,
};

/**
 * Converts a strict Zod object into the JSON Schema a tool registry expects.
 * `additionalProperties: false` is asserted rather than assumed, so a schema that
 * ever stops being strict fails loudly here instead of quietly accepting keys.
 */
export function toToolJsonSchema(schema: z.ZodType): WebMcpJsonSchema {
  const generated = z.toJSONSchema(schema, { target: "draft-7", io: "input" }) as Record<
    string,
    unknown
  >;

  const { $schema: _ignored, ...rest } = generated;

  if (rest.type !== "object") {
    throw new Error("A tool input schema must describe an object.");
  }

  if (rest.additionalProperties !== false) {
    throw new Error("A tool input schema must reject unknown keys.");
  }

  return rest as WebMcpJsonSchema;
}
