#!/usr/bin/env node
// Computes the next release version from Conventional Commits.
//
//   node scripts/next-version.mjs
//
// Looks at every commit since the most recent `v*` tag (or the whole history
// if no tag exists yet) and decides the semver bump:
//
//   • a commit with `!` after the type, or a `BREAKING CHANGE:` footer  → major
//   • any `feat:` commit                                                → minor
//   • any `fix:` / `perf:` / `revert:` commit                           → patch
//   • commits with no Conventional prefix at all                        → patch
//   • only `docs/chore/style/refactor/test/build/ci` (and nothing else) → none
//
// "none" means there is nothing worth releasing, so the workflow stops.
//
// Output:
//   • human-readable summary on stderr
//   • when running in GitHub Actions, `released`, `next_version`, `level`,
//     `prev_tag` and `is_bootstrap` are appended to $GITHUB_OUTPUT
//   • prints `<version>` (or empty) on stdout for shell capture
//
// `is_bootstrap=true` is emitted when no v* tag exists yet AND we decided to
// release. In that case the version files already match next_version, so the
// release workflow has nothing to commit — but it still needs to push the
// initial tag to trigger the publish pipeline.

import { execFileSync } from "node:child_process";
import { readFileSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function git(args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function parseSemver(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(v);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

function compare(a, b) {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

function bump(v, level) {
  if (level === "major") return `${v.major + 1}.0.0`;
  if (level === "minor") return `${v.major}.${v.minor + 1}.0`;
  return `${v.major}.${v.minor}.${v.patch + 1}`;
}

const NON_RELEASING = new Set([
  "docs",
  "chore",
  "style",
  "refactor",
  "test",
  "build",
  "ci",
]);
const HEADER = /^(?<type>[a-z]+)(?:\([^)]*\))?(?<bang>!)?:\s/i;
const RANK = { none: 0, patch: 1, minor: 2, major: 3 };

// --- Most recent v* tag (semver-sorted), or none on a fresh repo -----------
let prevTag = "";
try {
  prevTag = git(["tag", "--list", "v*", "--sort=-version:refname"])
    .split("\n")
    .filter(Boolean)[0] || "";
} catch {
  prevTag = "";
}

// --- Commit messages in range ---------------------------------------------
const range = prevTag ? `${prevTag}..HEAD` : "HEAD";
const RS = "\x1e"; // record separator between commit messages
const raw = git(["log", range, `--format=%B${RS}`]);
const messages = raw
  .split(RS)
  .map((m) => m.trim())
  .filter(Boolean);

// --- Classify --------------------------------------------------------------
let level = "none";

for (const msg of messages) {
  const header = msg.split("\n", 1)[0];
  const m = HEADER.exec(header);
  const breaking = /^BREAKING[ -]CHANGE:/m.test(msg);

  if (!m) {
    // Plain, non-Conventional commit — still ship it as a patch.
    if (RANK.patch > RANK[level]) level = "patch";
    continue;
  }

  const type = m.groups.type.toLowerCase();
  if (breaking || m.groups.bang) {
    level = "major";
  } else if (type === "feat") {
    if (RANK.minor > RANK[level]) level = "minor";
  } else if (type === "fix" || type === "perf" || type === "revert") {
    if (RANK.patch > RANK[level]) level = "patch";
  } else if (!NON_RELEASING.has(type)) {
    // Unrecognised type — treat like a plain commit.
    if (RANK.patch > RANK[level]) level = "patch";
  }
}

// --- Decide the next version ----------------------------------------------
const pkg = JSON.parse(
  readFileSync(join(repoRoot, "package.json"), "utf8"),
);
const pkgVer = parseSemver(pkg.version);
if (!pkgVer) {
  console.error(`package.json version is not semver: ${pkg.version}`);
  process.exit(1);
}

let base = pkgVer;
const tagVer = prevTag ? parseSemver(prevTag.replace(/^v/, "")) : null;
if (tagVer && compare(tagVer, base) > 0) base = tagVer;

let released = false;
let nextVersion = "";

if (messages.length === 0) {
  console.error(`No commits since ${prevTag || "the start"} — nothing to release.`);
} else if (level === "none") {
  console.error(
    `Only non-releasing commits (docs/chore/etc.) since ${prevTag || "the start"} — skipping release.`,
  );
} else if (!prevTag) {
  // First release ever: ship the current version as-is, don't bump past it.
  released = true;
  nextVersion = `${base.major}.${base.minor}.${base.patch}`;
} else {
  released = true;
  nextVersion = bump(base, level);
}

const isBootstrap = released && !prevTag;

// --- Emit ------------------------------------------------------------------
console.error(
  `prev_tag=${prevTag || "<none>"}  commits=${messages.length}  level=${level}  ` +
    `released=${released}  next=${nextVersion || "<none>"}  bootstrap=${isBootstrap}`,
);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `released=${released}\n` +
      `next_version=${nextVersion}\n` +
      `level=${level}\n` +
      `prev_tag=${prevTag}\n` +
      `is_bootstrap=${isBootstrap}\n`,
  );
}

if (nextVersion) process.stdout.write(nextVersion + "\n");
process.exit(0);
