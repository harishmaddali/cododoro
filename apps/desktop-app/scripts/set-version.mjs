#!/usr/bin/env node
// Sets the application version consistently across every file that pins it.
//
//   node scripts/set-version.mjs 0.2.0
//
// Tauri reads the version from three independent files (package.json,
// src-tauri/Cargo.toml, src-tauri/tauri.conf.json). `npm version` only
// touches package.json, so a release that relies on it ships a binary whose
// reported version disagrees with the Git tag. This script keeps all of them
// in lockstep, plus src-tauri/Cargo.lock, so the bundled app, the updater
// manifest and the GitHub Release tag always match.
//
// The workspace lockfile (pnpm-lock.yaml) lives at the repo root and is
// refreshed by the caller via `pnpm install --lockfile-only` after this runs.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

const version = process.argv[2];
if (!version || !SEMVER.test(version)) {
  console.error(
    `Usage: node scripts/set-version.mjs <version>\n` +
      `  <version> must be semver, e.g. 0.2.0 (got: ${version ?? "<none>"})`,
  );
  process.exit(1);
}

/** Read a file, hand it to `fn`, write it back only if `fn` changed it. */
function rewrite(relPath, fn) {
  const path = join(repoRoot, relPath);
  const before = readFileSync(path, "utf8");
  const after = fn(before);
  if (after === before) {
    console.log(`  = ${relPath} (already ${version})`);
    return;
  }
  writeFileSync(path, after);
  console.log(`  ✓ ${relPath}`);
}

/** Update a top-level "version" key in a JSON file, preserving 2-space style. */
function setJsonVersion(relPath, extra = () => {}) {
  rewrite(relPath, (text) => {
    const json = JSON.parse(text);
    json.version = version;
    extra(json);
    return JSON.stringify(json, null, 2) + "\n";
  });
}

// package.json
setJsonVersion("package.json");

// src-tauri/tauri.conf.json
setJsonVersion("src-tauri/tauri.conf.json");

// src-tauri/Cargo.toml — only the version line inside the [package] table.
rewrite("src-tauri/Cargo.toml", (text) => {
  const lines = text.split("\n");
  const pkgIdx = lines.findIndex((l) => l.trim() === "[package]");
  if (pkgIdx === -1) throw new Error("Cargo.toml: no [package] table found");
  for (let i = pkgIdx + 1; i < lines.length; i++) {
    if (/^\[/.test(lines[i].trim())) break; // next table — give up
    if (/^version\s*=/.test(lines[i])) {
      lines[i] = `version = "${version}"`;
      return lines.join("\n");
    }
  }
  throw new Error("Cargo.toml: no version key inside [package]");
});

// src-tauri/Cargo.lock — the version that belongs to this crate's own entry.
rewrite("src-tauri/Cargo.lock", (text) => {
  const re = /(name = "cododoro"\nversion = ")[^"]+(")/;
  if (!re.test(text)) {
    throw new Error('Cargo.lock: package entry for "cododoro" not found');
  }
  return text.replace(re, `$1${version}$2`);
});

console.log(`\nVersion set to ${version}.`);
