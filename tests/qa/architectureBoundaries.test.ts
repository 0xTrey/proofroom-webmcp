import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { HUMAN_ONLY_ACTION_NAMES } from "../../src/domain/actions/index.ts";
import { createToolDefinitions, TOOL_NAMES } from "../../src/webmcp/toolDefinitions.ts";
import { createTestRoom } from "../support/room.ts";

const sourceRoot = resolve(process.cwd(), "src");

function filesUnder(relativeDirectory: string): string[] {
  const root = resolve(sourceRoot, relativeDirectory);
  const walk = (directory: string): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const child = join(directory, entry.name);
      if (entry.isDirectory()) {
        return walk(child);
      }
      return entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")
        ? [child]
        : [];
    });
  return walk(root);
}

function contents(paths: readonly string[]): string {
  return paths.map((path) => readFileSync(path, "utf8")).join("\n");
}

describe("release-candidate architecture boundaries", () => {
  it("keeps direct room-store writes out of components, app, features, and WebMCP", () => {
    const presentation = contents([
      ...filesUnder("components/"),
      ...filesUnder("app/"),
      ...filesUnder("features/"),
      ...filesUnder("webmcp/"),
    ]);

    expect(presentation).not.toMatch(/\b(?:roomStore|roomStoreHandle\.store|store)\.setState\s*\(/);
    expect(presentation).not.toMatch(/\buseRoomStore\.setState\s*\(/);
  });

  it("exposes exactly nine production tools and no human-only action", () => {
    const room = createTestRoom();
    const definitions = createToolDefinitions(room.agentActions);
    const names = definitions.map((definition) => definition.name);

    expect(names).toEqual(TOOL_NAMES);
    expect(names).toHaveLength(9);
    expect(names.some((name) => HUMAN_ONLY_ACTION_NAMES.includes(name as never))).toBe(false);
  });

  it("keeps the canonical reset room constructor in one fixture source", () => {
    const source = contents(filesUnder(""));
    const declarations = source.match(/export function createCanonicalRoom\s*\(/g) ?? [];
    const resetSource = readFileSync(
      join(sourceRoot, "domain", "actions", "reset.ts"),
      "utf8",
    );

    expect(declarations).toHaveLength(1);
    expect(resetSource).toContain("createCanonicalRoom(nowIso)");
  });
});
