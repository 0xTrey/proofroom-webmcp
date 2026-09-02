#!/usr/bin/env node
/**
 * README parity gate for judge-first documentation.
 *
 * Ensures the root README uses current control labels, 016 gallery paths, lifecycle
 * language, and resolvable local link targets contained within the repository.
 */
import { access } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const readmePath = join(repoRoot, "README.md");

const REQUIRED_GALLERY_PATHS = [
  "artifacts/visual-audit/016-submission-gallery/01-landing-hero-1600.png",
  "artifacts/visual-audit/016-submission-gallery/02-untrusted-evidence-1600.png",
  "artifacts/visual-audit/016-submission-gallery/03-approved-decision-1600.png",
];

const REQUIRED_CONTROL_LABELS = [
  "Open the fictional review",
  "Review the sample buyer profile",
  "Use this buyer profile",
  "Check evidence",
  "Run the sample evidence check",
  "Review decision",
  "Preview calculation",
  "Prepare the sample not-ready recommendation",
  "Prepare recommendation",
  "Approve recommendation",
];

const FORBIDDEN_STALE_LABELS = [
  "Stage fictional Meridian Bank draft",
  "Approve buyer context",
  "Apply fictional review set",
];

const REQUIRED_PHRASES = [
  "verified public baseline",
  "current local candidate",
  "not_run",
  "http://localhost:5173/",
];

const FORBIDDEN_PHRASES = ["work orders 011 through 014a"];

const LINK_PATTERN = /!?\[[^\]]*\]\(([^)]+)\)/g;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasExactInlineCodeToken(text, label) {
  const pattern = new RegExp("`" + escapeRegExp(label) + "`");
  return pattern.test(text);
}

function isExternalOrFragmentTarget(target) {
  const trimmed = target.trim();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("#") ||
    trimmed.length === 0
  );
}

function resolveLocalTarget(target, baseDir) {
  const withoutFragment = target.split("#")[0].trim();
  if (!withoutFragment) {
    return null;
  }
  return resolve(baseDir, withoutFragment);
}

function isPathWithinRepo(resolvedPath) {
  const relativePath = relative(repoRoot, resolvedPath);
  return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

function validateLocalTargetContainment(target, baseDir) {
  const trimmed = target.split("#")[0].trim();
  if (!trimmed) {
    return null;
  }

  if (isAbsolute(trimmed) && !isPathWithinRepo(resolve(trimmed))) {
    return `local link or image target escapes repository: ${target}`;
  }

  if (trimmed.split(/[/\\]/).includes("..")) {
    return `local link or image target escapes repository: ${target}`;
  }

  const resolved = resolveLocalTarget(target, baseDir);
  if (!resolved || !isPathWithinRepo(resolved)) {
    return `local link or image target escapes repository: ${target}`;
  }

  return null;
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const readme = await readFile(readmePath, "utf8");
const failures = [];

for (const galleryPath of REQUIRED_GALLERY_PATHS) {
  if (!readme.includes(galleryPath)) {
    failures.push(`missing required gallery path: ${galleryPath}`);
  }
}

for (const label of REQUIRED_CONTROL_LABELS) {
  if (!hasExactInlineCodeToken(readme, label)) {
    failures.push(`missing exact inline-code control label: \`${label}\``);
  }
}

for (const label of FORBIDDEN_STALE_LABELS) {
  if (readme.includes(label)) {
    failures.push(`stale control label must be removed: ${label}`);
  }
}

for (const phrase of REQUIRED_PHRASES) {
  if (!readme.includes(phrase)) {
    failures.push(`missing required phrase: ${phrase}`);
  }
}

for (const phrase of FORBIDDEN_PHRASES) {
  if (readme.includes(phrase)) {
    failures.push(`forbidden stale lineage phrase present: ${phrase}`);
  }
}

const readmeDir = dirname(readmePath);
const seenTargets = new Set();

for (const match of readme.matchAll(LINK_PATTERN)) {
  const target = match[1];
  if (isExternalOrFragmentTarget(target)) {
    continue;
  }

  const resolved = resolveLocalTarget(target, readmeDir);
  if (!resolved || seenTargets.has(resolved)) {
    continue;
  }
  seenTargets.add(resolved);

  const containmentFailure = validateLocalTargetContainment(target, readmeDir);
  if (containmentFailure) {
    failures.push(containmentFailure);
    continue;
  }

  if (!(await pathExists(resolved))) {
    failures.push(`broken local link or image target: ${target}`);
  }
}

if (failures.length > 0) {
  console.error("README parity gate failed:");
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  process.exit(1);
}

console.log("README parity gate passed.");
