import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { RC_GATE_WORKSPACE_EXCLUSIONS } from "./paths.ts";

export type StatusDigest = {
  algorithm: "sha256";
  digest: string;
  entryCount: number;
};

const EXCLUSION_SET = new Set<string>(RC_GATE_WORKSPACE_EXCLUSIONS);

function parsePorcelainZ(output: Buffer): string[] {
  if (output.length === 0) {
    return [];
  }
  return output
    .toString("utf8")
    .split("\0")
    .filter((entry) => entry.length > 0);
}

function filterStatusEntries(entries: string[]): string[] {
  return entries
    .filter((entry) => {
      const path = entry.slice(3);
      return !EXCLUSION_SET.has(path);
    })
    .sort((left, right) => left.localeCompare(right));
}

export function digestStatusEntries(entries: string[]): StatusDigest {
  const hash = createHash("sha256");
  for (const entry of entries) {
    hash.update(entry);
    hash.update("\0");
  }
  return {
    algorithm: "sha256",
    digest: hash.digest("hex"),
    entryCount: entries.length,
  };
}

export function readFilteredGitStatus(repositoryRoot: string): StatusDigest {
  const raw = execSync("git status --porcelain=v1 -z", {
    cwd: repositoryRoot,
    encoding: "buffer",
    maxBuffer: 16 * 1024 * 1024,
  });
  const filtered = filterStatusEntries(parsePorcelainZ(raw));
  return digestStatusEntries(filtered);
}

export function filterPorcelainEntries(entries: string[]): StatusDigest {
  return digestStatusEntries(filterStatusEntries(entries));
}

export function readHeadCommit(repositoryRoot: string): string {
  const head = execSync("git rev-parse HEAD", {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim();
  if (!/^[0-9a-f]{40}$/.test(head)) {
    throw new Error("HEAD must be a full 40-character Git commit.");
  }
  return head;
}
