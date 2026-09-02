import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { RC_GATE_SCHEMA_PATH } from "./paths.ts";

export function compileRcGateJsonSchemaValidator(): ReturnType<Ajv2020["compile"]> {
  const schema = JSON.parse(
    readFileSync(resolve(process.cwd(), RC_GATE_SCHEMA_PATH), "utf8"),
  ) as Record<string, unknown>;
  const ajv = new Ajv2020({
    strict: true,
    allErrors: true,
  });
  addFormats(ajv);
  return ajv.compile(schema);
}

export function validateRcGateReceiptJsonSchema(value: unknown): void {
  const validate = compileRcGateJsonSchemaValidator();
  if (!validate(value)) {
    const details = (validate.errors ?? [])
      .slice(0, 8)
      .map((error) => `${error.instancePath || "/"} ${error.message ?? error.keyword}`)
      .join(" | ");
    throw new Error(`RC gate JSON Schema validation failed: ${details || "unknown schema error"}`);
  }
}
