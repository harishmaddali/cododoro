#!/usr/bin/env bash
# Cut a release from your machine instead of waiting for the push-to-main
# workflow. Same logic the CI uses: compute the next version from Conventional
# Commits, sync every version file, commit, tag and push.
#
#   ./scripts/local-release.sh              # compute, bump, commit, tag, push
#   ./scripts/local-release.sh --dry-run    # show what would happen, change nothing
#   ./scripts/local-release.sh 0.4.0        # force an explicit version
#
# Pushing the tag triggers .github/workflows/publish-release.yml, which builds
# and publishes the macOS / Windows / Linux installers.

set -euo pipefail

# Run from the apps/desktop-app/ workspace so version files resolve correctly.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$APP_DIR/../.." && pwd)"
cd "$APP_DIR"

DRY_RUN=0
FORCED_VERSION=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) FORCED_VERSION="$arg" ;;
  esac
done

if [ -n "$(git status --porcelain)" ]; then
  echo "✗ Working tree is not clean — commit or stash first." >&2
  exit 1
fi

if [ -n "$FORCED_VERSION" ]; then
  NEXT="$FORCED_VERSION"
else
  NEXT="$(node scripts/next-version.mjs || true)"
fi

if [ -z "$NEXT" ]; then
  echo "Nothing to release (no releasable commits). Use an explicit version to override." >&2
  exit 0
fi

echo "→ Releasing v${NEXT}"

if [ "$DRY_RUN" -eq 1 ]; then
  echo "(dry run) would run: node scripts/set-version.mjs ${NEXT}"
  echo "(dry run) would commit, tag v${NEXT} and push to origin"
  exit 0
fi

node scripts/set-version.mjs "$NEXT"

# Refresh the workspace lockfile so it reflects the new version.
( cd "$REPO_ROOT" && pnpm install --lockfile-only )

( cd "$REPO_ROOT" && git add \
    apps/desktop-app/package.json \
    pnpm-lock.yaml \
    apps/desktop-app/src-tauri/Cargo.toml \
    apps/desktop-app/src-tauri/Cargo.lock \
    apps/desktop-app/src-tauri/tauri.conf.json )
git -C "$REPO_ROOT" commit -m "chore(release): v${NEXT} [skip ci]"
git -C "$REPO_ROOT" tag "v${NEXT}"
git -C "$REPO_ROOT" push origin HEAD
git -C "$REPO_ROOT" push origin "v${NEXT}"

echo "✓ Pushed v${NEXT}. The Publish Release workflow will build the installers."
