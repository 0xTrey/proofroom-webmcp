#!/usr/bin/env node
/**
 * Repository writing guard.
 *
 * ProofRoom forbids the em dash character in authored code, comments, UI copy,
 * fixtures, and documentation. This check runs as part of `npm run lint` so the
 * rule is enforced instead of remembered.
 */
import { readFile, readdir } from "node:fs/promises";
import { join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".hermes",
  ".wrangler",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);

const CHECKED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
  ".html",
  ".json",
  ".jsonc",
  ".md",
  ".svg",
  ".txt",
  ".yml",
  ".yaml",
]);

const FORBIDDEN = [
  { name: "em dash", pattern: /\u2014/g },
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }
      files.push(...(await collectFiles(join(directory, entry.name))));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const path = join(directory, entry.name);
    if (entry.name === "package-lock.json") {
      continue;
    }
    if (!CHECKED_EXTENSIONS.has(extname(entry.name)) && entry.name !== "LICENSE") {
      continue;
    }
    files.push(path);
  }

  return files;
}

const files = await collectFiles(repoRoot);
const violations = [];

for (const path of files) {
  const contents = await readFile(path, "utf8");
  const lines = contents.split("\n");

  for (const rule of FORBIDDEN) {
    lines.forEach((line, index) => {
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(line)) {
        violations.push(`${relative(repoRoot, path)}:${index + 1} contains a ${rule.name}`);
      }
    });
  }
}

if (violations.length > 0) {
  console.error("Writing guard failed:");
  for (const violation of violations) {
    console.error(`  ${violation}`);
  }
  process.exit(1);
}

console.log(`Writing guard passed across ${files.length} files.`);
