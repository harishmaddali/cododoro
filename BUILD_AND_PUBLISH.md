# Building and Publishing cododoro

This guide covers how to build the cododoro desktop application and publish it to users with **automatic updates via GitHub Releases**.

> **TL;DR** — Releases are automated. Push Conventional-Commit changes to
> `main` and the **Release** workflow versions, tags and publishes a new
> multi-platform build. See [Step 4: Publish a Release](#step-4-publish-a-release).
> One-time signing setup is required first — see the
> [Quick Reference Checklist](#quick-reference-checklist).

## Prerequisites

- **Node.js** 18+ and npm
- **Rust** (for Tauri) - Install from https://rustup.rs/
- **GitHub CLI** - Install from https://cli.github.com
- **Git** for version control
- **Platform-specific requirements:**
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Windows**: Microsoft Visual Studio Build Tools
  - **Linux**: gcc, libssl-dev, libgtk-3-dev, libayatana-appindicator3-dev, librsvg2-dev

## Build Scripts

```bash
# Development - runs the app with hot reload
npm run tauri:dev

# Production build for current platform
npm run tauri:build

# Platform-specific builds
npm run tauri:build:macos             # Intel Macs (x86_64-apple-darwin)
npm run tauri:build:macos-arm64       # Apple Silicon / M1+ (aarch64-apple-darwin)
npm run tauri:build:macos-universal   # Universal binary (Intel + Apple Silicon)
npm run tauri:build:windows           # Windows (x86_64-pc-windows-msvc)
npm run tauri:build:linux             # Linux (x86_64-unknown-linux-gnu)
```

## Where Builds Go

Built binaries are located in `src-tauri/target/release/bundle/`:

- **macOS**: `.dmg` and `.app.tar.gz` files
- **Windows**: `.msi` and `.exe` files  
- **Linux**: `.AppImage` and `.deb` files

## Development

```bash
# Install dependencies
npm install

# Start development server with Tauri
npm run tauri:dev

# Type checking
npm run typecheck

# Web build only (no Tauri)
npm run build
```

## Publishing to Users with Automatic Updates

cododoro is configured for **automatic updates via GitHub Releases**. Users will be notified when a new version is available and can install it with one click.

### Step 1: Generate Updater Keypair

The updater uses cryptographic signing to ensure updates are authentic. Generate the keypair:

**macOS/Linux:**
```bash
./scripts/setup-updater.sh
```

**Windows:**
```cmd
scripts\setup-updater.bat
```

The script will:
1. Prompt for a secure password
2. Generate `src-tauri/private_key.pem` (keep this secret!)
3. Display your **public key**

### Step 2: Add Public Key to Rust Configuration

The updater configuration will be added in the Rust code. Copy the public key from Step 1 for use in the next step.

**Note**: The updater will be configured in the Tauri setup code to enable automatic update checks against GitHub Releases.

### Step 3: Configure GitHub Secrets

Add these secrets to your repository (Settings → Secrets and variables → Actions):

1. **`TAURI_SIGNING_PRIVATE_KEY`**: Contents of `src-tauri/private_key.pem`
   ```bash
   cat src-tauri/private_key.pem | base64
   ```

2. **`TAURI_SIGNING_PASSWORD`**: The password you set in Step 1

**Never commit the private key!** Add to `.gitignore`:
```bash
echo "src-tauri/private_key.pem" >> .gitignore
```

### Step 4: Publish a Release

**Releases are automatic.** Just merge/push to `main`:

```bash
git push origin main
```

The `.github/workflows/release.yml` workflow will:

1. **Decide the next version** from your commit messages using
   [Conventional Commits](https://www.conventionalcommits.org/):
   - `fix:` / `perf:` → patch (`0.1.0` → `0.1.1`)
   - `feat:` → minor (`0.1.0` → `0.2.0`)
   - `feat!:` or a `BREAKING CHANGE:` footer → major (`0.1.0` → `1.0.0`)
   - a plain (non-Conventional) commit → patch
   - only `docs/chore/style/refactor/test/build/ci` commits → **no release**
2. **Bump every version file** (`package.json`, `package-lock.json`,
   `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`)
   via `scripts/set-version.mjs`, commit it back to `main` as
   `chore(release): vX.Y.Z [skip ci]`, and push a `vX.Y.Z` tag.
3. **Call `.github/workflows/publish-release.yml`** on that tag, which:
   - **Builds** for macOS (Intel + ARM), Windows, and Linux
   - **Signs** each artifact with your private key
   - **Creates a GitHub Release** with all binaries

Pushes that change **only** docs (`**/*.md`, `docs/**`), CI (`.github/**`),
`LICENSE` or `.gitignore` are ignored. To skip a release for any other push,
put `[skip release]` in the commit message.

> The first ever release ships the current `package.json` version as-is
> (so it becomes `v0.1.0`); every release after that is bumped from the
> previous tag.

**Manual / local alternative** — cut a release without waiting for `main`:

```bash
npm run version:next        # preview the version that would be released
npm run release:local       # compute, bump, commit, tag and push it
npm run release:local -- --dry-run   # show what it would do, change nothing
npm run release:local -- 0.4.0       # force an explicit version
```

Pushing a `v*` tag (by any means) always triggers the build/publish workflow.

### Step 5: Users Get Automatic Updates

When users run the app:
1. ✅ App checks GitHub Releases for new versions
2. ✅ Shows update dialog if newer version available
3. ✅ Downloads and installs update
4. ✅ Verifies signature with public key
5. ✅ Restarts with new version

### How It Works Under the Hood

```
┌─────────────────────────────────────────┐
│   User launches cododoro v0.1.0        │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  App queries GitHub Releases endpoint   │
│  (every session)                        │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  New v0.2.0 available!                  │
│  [Update Now] [Skip] [Remind Later]     │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Download .dmg/.msi/.AppImage           │
│  Verify signature with public key       │
│  Install and restart                    │
└─────────────────────────────────────────┘
```

### Alternative: Manual Release (Without Automation)

If you want to publish without GitHub Actions:

```bash
# Build locally (run each on its matching host OS)
npm run tauri:build:macos-universal   # on macOS
npm run tauri:build:windows           # on Windows
npm run tauri:build:linux             # on Linux

# Create GitHub release manually (bundles land under target/<triple>/release/bundle)
gh release create v0.2.0 \
  src-tauri/target/universal-apple-darwin/release/bundle/dmg/*.dmg \
  src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/*.msi \
  src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/appimage/*.AppImage \
  --title "cododoro v0.2.0" \
  --notes "See assets to download and install"
```

## Code Signing (Optional: OS-level Code Signing)

For production apps, you can additionally sign binaries with Apple/Microsoft certificates (separate from update signing):

### macOS Code Signing

```bash
# Set environment variables
export APPLE_CERTIFICATE="path/to/certificate.p8"
export APPLE_CERTIFICATE_PASSWORD="password"
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name"

npm run tauri:build:macos
npm run tauri:build:macos-arm64
```

See [Apple Developer docs](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution) for notarization.

### Windows Code Signing

```bash
# Set environment variables
export WINDOWS_SIGN_TOOL="path/to/signtool.exe"
export WINDOWS_SIGN_CERTIFICATE="path/to/certificate.pfx"
export WINDOWS_SIGN_PASSWORD="password"

npm run tauri:build:windows
```

This is optional—the Tauri update signing is sufficient for security.

## Version Management

The version is pinned in **five** places and they must stay identical:

- `package.json`
- `package-lock.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/tauri.conf.json`

> ⚠️ `npm version` only updates `package.json`/`package-lock.json` — it does
> **not** touch the `src-tauri/*` files, so it must not be used to release.
> Use the scripts below instead; they keep all five in lockstep.

### Automatic (Recommended)

You don't set the version by hand. On push to `main`, `release.yml` runs
`scripts/next-version.mjs` to derive the next version from
[Conventional Commits](https://www.conventionalcommits.org/) and
`scripts/set-version.mjs` to write it everywhere. See
[Step 4: Publish a Release](#step-4-publish-a-release) for the bump rules.

```bash
npm run version:next   # preview the next version (reads git history, no writes)
```

### Manual

Set an explicit version across all five files, then tag:

```bash
npm run version:set -- 0.2.0          # writes all five files
# or do the full bump+commit+tag+push in one step:
npm run release:local -- 0.2.0
```

`scripts/set-version.mjs` validates the argument is semver and edits only the
version field in each file (verified to produce a minimal, surgical diff).

## Security: Protecting Your Private Key

**Never commit the private key!** It's used to sign updates and could be exploited if leaked.

```bash
# Add to .gitignore
echo "src-tauri/private_key.pem" >> .gitignore
echo ".env*" >> .gitignore

# If accidentally committed, contact GitHub to rotate secrets
git rm --cached src-tauri/private_key.pem
git commit -m "Remove private key from history"
```

**Store safely:**
- Local development: `src-tauri/private_key.pem` (local only)
- CI/CD: Use GitHub Secrets (`TAURI_SIGNING_PRIVATE_KEY`)
- Backups: Encrypted secure storage (not email/Slack)

## Troubleshooting

**"Keypair generation failed"**
```bash
# Ensure you're in the repo root
cd /path/to/cododoro
./scripts/setup-updater.sh
```

**Build fails with Rust errors:**
```bash
rustup update
rustup target install wasm32-unknown-unknown
cargo clean
npm install
npm run tauri:build
```

**"TAURI_SIGNING_PRIVATE_KEY not found" in GitHub Actions:**
1. Ensure the secret is added to repository settings
2. Check the secret name matches: `TAURI_SIGNING_PRIVATE_KEY`
3. Verify it's base64 encoded (see Step 3 above)

**macOS: "The app can't be opened"**
- App is not signed/notarized (for macOS 12+)
- Users can right-click → Open to bypass
- To resolve: Set up code signing (see above)

**Windows: MSI generation fails:**
- Ensure WiX Toolset 3.x is installed: https://wixtoolset.org/releases/
- Restart Visual Studio Build Tools
- Run in Administrator command prompt

**GitHub Actions: Workflow not triggering**
- Check tag format: `v0.2.0` (starts with `v`)
- Verify workflow file syntax: `.github/workflows/publish-release.yml`
- Check if `on.push.tags` filter matches your tag

## App Configuration

**Default window size** (mobile width):
- Width: 420px (min: 380px)
- Height: 620px (min: 500px)

Edit in `src-tauri/tauri.conf.json` under `app.windows[0]`

## Quick Reference Checklist

One-time setup (required before the first automated release can sign builds):

- [ ] Run `./scripts/setup-updater.sh` and save the public key
- [ ] Update `src-tauri/tauri.conf.json` `plugins.updater.pubkey` with the public key
- [ ] Add `TAURI_SIGNING_PRIVATE_KEY` to GitHub Secrets
- [ ] Add `TAURI_SIGNING_PASSWORD` to GitHub Secrets
- [ ] Confirm `src-tauri/private_key.pem` is git-ignored (already in `.gitignore`)
- [ ] Allow GitHub Actions to push to `main` (Settings → Actions → Workflow
      permissions → *Read and write*; if `main` is a protected branch, allow
      the `github-actions[bot]` to bypass it or releases can't commit the bump)

Every release (automatic):

- [ ] Use Conventional Commit messages (`feat:`, `fix:`, `feat!:`, …)
- [ ] Merge/push to `main`
- [ ] Watch the **Release** workflow, then the **Publish Release** workflow in GitHub Actions
- [ ] Verify the release: https://github.com/harishmaddali/cododoro/releases

## Resources

- [Tauri Updater Docs](https://tauri.app/v1/guides/distribution/updater/)
- [Tauri CLI Guide](https://tauri.app/v1/guides/cli/)
- [GitHub Releases API](https://docs.github.com/en/rest/releases/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)
