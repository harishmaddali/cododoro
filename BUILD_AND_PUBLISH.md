# Building and Publishing cododoro

This guide covers how to build the cododoro desktop application and publish it to users with **automatic updates via GitHub Releases**.

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
npm run tauri:build:macos          # Intel Macs
npm run tauri:build:macos-arm64    # Apple Silicon (M1/M2/M3)
npm run tauri:build:windows        # Windows
npm run tauri:build:linux          # Linux
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

Push a version tag to trigger the automated build workflow:

```bash
# Update versions in all files
npm version minor  # or patch/major

# This updates:
# - package.json
# - src-tauri/Cargo.toml
# - src-tauri/tauri.conf.json

# Push to GitHub
git push origin main --tags
```

The `.github/workflows/publish-release.yml` workflow will:
1. **Build** for macOS (Intel + ARM), Windows, and Linux
2. **Sign** each artifact with your private key
3. **Create a GitHub Release** with all binaries

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
# Build locally for all platforms
npm run tauri:build
npm run tauri:build:macos
npm run tauri:build:macos-arm64
npm run tauri:build:windows
npm run tauri:build:linux

# Create GitHub release manually
gh release create v0.2.0 \
  src-tauri/target/release/bundle/macos/*.dmg \
  src-tauri/target/release/bundle/macos-arm64/*.dmg \
  src-tauri/target/release/bundle/windows/*.msi \
  src-tauri/target/release/bundle/linux/*.AppImage \
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

Versions must be consistent across all files and follow [Semantic Versioning](https://semver.org/).

### Automatic Versioning (Recommended)

Use npm version to update all files at once:

```bash
# Patch (0.1.0 → 0.1.1) - bug fixes
npm version patch

# Minor (0.1.0 → 0.2.0) - new features
npm version minor

# Major (0.1.0 → 1.0.0) - breaking changes
npm version major
```

This updates:
- `package.json` version
- Git tag created: `v0.1.1`
- Commit message: `v0.1.1`

### Manual Versioning

If using npm version doesn't work, update manually:

1. `package.json`:
   ```json
   "version": "0.2.0"
   ```

2. `src-tauri/Cargo.toml`:
   ```toml
   [package]
   version = "0.2.0"
   ```

3. `src-tauri/tauri.conf.json`:
   ```json
   "version": "0.2.0"
   ```

Then create the git tag:
```bash
git tag v0.2.0
git push origin v0.2.0
```

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

- [ ] Run `./scripts/setup-updater.sh` and save the public key
- [ ] Update `src-tauri/tauri.conf.json` with public key
- [ ] Add `TAURI_SIGNING_PRIVATE_KEY` to GitHub Secrets
- [ ] Add `TAURI_SIGNING_PASSWORD` to GitHub Secrets
- [ ] Add `src-tauri/private_key.pem` to `.gitignore`
- [ ] Test locally: `npm run tauri:dev`
- [ ] Update version: `npm version minor`
- [ ] Push with tags: `git push origin main --tags`
- [ ] Monitor GitHub Actions for successful build
- [ ] Verify release created: https://github.com/harishmaddali/cododoro/releases

## Resources

- [Tauri Updater Docs](https://tauri.app/v1/guides/distribution/updater/)
- [Tauri CLI Guide](https://tauri.app/v1/guides/cli/)
- [GitHub Releases API](https://docs.github.com/en/rest/releases/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)
