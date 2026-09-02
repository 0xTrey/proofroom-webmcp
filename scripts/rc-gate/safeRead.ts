import { createHash } from "node:crypto";
import { constants, closeSync, fstatSync, openSync, readSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

export type SafeReadResult = {
  parsed: unknown;
  byteCount: number;
  digest: string;
};

export type SafeReadFsHooks = {
  openSyncFn?: typeof openSync;
  fstatSyncFn?: typeof fstatSync;
  readSyncFn?: typeof readSync;
  closeSyncFn?: typeof closeSync;
  realpathSyncFn?: typeof realpathSync;
};

type FileIdentity = {
  dev: number;
  ino: number;
  size: number;
  mtimeMs: number;
};

function repositoryRelativePath(value: string): string {
  if (
    value.length === 0 ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.split("/").some((segment) => segment === "" || segment === ".")
  ) {
    throw new Error("Referenced path is invalid.");
  }
  if (value.split("/").includes("..")) {
    throw new Error("Referenced path is invalid.");
  }
  return value;
}

function resolveContainedPath(
  repositoryRoot: string,
  relativePath: string,
  realpathSyncFn: typeof realpathSync,
): string {
  const safePath = repositoryRelativePath(relativePath);
  let root: string;
  try {
    root = realpathSyncFn(repositoryRoot);
  } catch {
    throw new Error("Repository root is missing or unreadable.");
  }
  const candidate = resolve(root, safePath);
  const lexicalRelative = relative(root, candidate);
  if (
    lexicalRelative === "" ||
    lexicalRelative === ".." ||
    lexicalRelative.startsWith(`..${sep}`) ||
    isAbsolute(lexicalRelative)
  ) {
    throw new Error("Referenced path is invalid.");
  }
  let realPath: string;
  try {
    realPath = realpathSyncFn(candidate);
  } catch {
    throw new Error("Referenced evidence is missing or unreadable.");
  }
  const physicalRelative = relative(root, realPath);
  if (
    physicalRelative === "" ||
    physicalRelative === ".." ||
    physicalRelative.startsWith(`..${sep}`) ||
    isAbsolute(physicalRelative)
  ) {
    throw new Error("Referenced path is invalid.");
  }
  return realPath;
}

function readFileIdentity(
  fd: number,
  fstatSyncFn: typeof fstatSync,
): { stats: ReturnType<typeof fstatSync>; identity: FileIdentity } {
  const stats = fstatSyncFn(fd);
  if (!stats.isFile()) {
    throw new Error("Referenced evidence must be a regular file.");
  }
  return {
    stats,
    identity: {
      dev: stats.dev,
      ino: stats.ino,
      size: stats.size,
      mtimeMs: stats.mtimeMs,
    },
  };
}

function identitiesMatch(left: FileIdentity, right: FileIdentity): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs
  );
}

function openReadOnly(realPath: string, openSyncFn: typeof openSync): number {
  const flags = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0);
  try {
    return openSyncFn(realPath, flags);
  } catch {
    throw new Error("Referenced evidence is missing or unreadable.");
  }
}

export function readBoundedContainedJson(
  repositoryRoot: string,
  relativePath: string,
  maxBytes: number,
  hooks: SafeReadFsHooks = {},
): SafeReadResult {
  const openSyncFn = hooks.openSyncFn ?? openSync;
  const fstatSyncFn = hooks.fstatSyncFn ?? fstatSync;
  const readSyncFn = hooks.readSyncFn ?? readSync;
  const closeSyncFn = hooks.closeSyncFn ?? closeSync;
  const realpathSyncFn = hooks.realpathSyncFn ?? realpathSync;

  const realPath = resolveContainedPath(repositoryRoot, relativePath, realpathSyncFn);
  const fd = openReadOnly(realPath, openSyncFn);
  try {
    const before = readFileIdentity(fd, fstatSyncFn);
    if (before.identity.size > maxBytes) {
      throw new Error("Referenced evidence exceeds the bounded file size.");
    }
    const buffer = Buffer.alloc(before.identity.size);
    const bytesRead = readSyncFn(fd, buffer, 0, before.identity.size, 0);
    if (bytesRead !== before.identity.size) {
      throw new Error("Referenced evidence is missing or unreadable.");
    }
    const after = readFileIdentity(fd, fstatSyncFn);
    if (!identitiesMatch(before.identity, after.identity)) {
      throw new Error("Referenced evidence changed during read.");
    }
    const finalPath = resolveContainedPath(repositoryRoot, relativePath, realpathSyncFn);
    const finalStats = statSync(finalPath);
    if (finalStats.dev !== before.identity.dev || finalStats.ino !== before.identity.ino) {
      throw new Error("Referenced evidence changed during read.");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(buffer.toString("utf8")) as unknown;
    } catch {
      throw new Error("Referenced evidence must contain valid JSON.");
    }
    return {
      parsed,
      byteCount: buffer.byteLength,
      digest: createHash("sha256").update(buffer).digest("hex"),
    };
  } finally {
    closeSyncFn(fd);
  }
}
