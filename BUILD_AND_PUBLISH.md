# Building and Publishing Codeodoro

This guide covers how to build the Codeodoro desktop application and publish it to users.

## Prerequisites

- **Node.js** 16+ and npm
- **Rust** (for Tauri) - Install from https://rustup.rs/
- **GitHub CLI** (for signing releases) - Install from https://cli.github.com
- **Platform-specific requirements:**
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Windows**: Microsoft Visual Studio Build Tools
  - **Linux**: gcc, libssl-dev, libgtk-3-dev, etc. (see Tauri docs)

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

## Publishing to Users

### Option 1: GitHub Releases (Recommended)

1. **Create a release:**
   ```bash
   # Build for all platforms
   npm run tauri:build
   npm run tauri:build:macos
   npm run tauri:build:macos-arm64
   npm run tauri:build:windows
   npm run tauri:build:linux
   ```

2. **Create a GitHub Release:**
   ```bash
   gh release create v0.2.0 \
     src-tauri/target/release/bundle/macos/*.dmg \
     src-tauri/target/release/bundle/macos-arm64/*.dmg \
     src-tauri/target/release/bundle/windows/*.msi \
     src-tauri/target/release/bundle/linux/*.AppImage \
     --notes "Release notes here"
   ```

3. **Share the release URL**: https://github.com/harishmaddali/codeodoro/releases

### Option 2: Tauri Updater

Enable automatic updates by configuring `src-tauri/tauri.conf.json`:

```json
{
  "updater": {
    "active": true,
    "endpoints": [
      "https://releases.example.com/{{target}}/{{arch}}/{{current_version}}"
    ],
    "dialog": true,
    "pubkey": "your_public_key_here"
  }
}
```

See [Tauri Updater docs](https://tauri.app/v1/guides/distribution/updater/) for details.

### Option 3: Self-Hosted Distribution

Host the binaries on your own server and provide download links:
- Static hosting: Vercel, Netlify, GitHub Pages
- Direct downloads: Put `.dmg`, `.msi`, `.exe`, `.AppImage` files on a web server

## Code Signing (for Distribution)

### macOS Code Signing

```bash
# Set up credentials
export APPLE_CERTIFICATE=path/to/certificate.p8
export APPLE_CERTIFICATE_PASSWORD=password
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name"

npm run tauri:build:macos
npm run tauri:build:macos-arm64
```

### Windows Code Signing

```bash
# Set up certificate
export WINDOWS_SIGN_TOOL="path/to/signtool.exe"
export WINDOWS_SIGN_CERTIFICATE="path/to/certificate.pfx"
export WINDOWS_SIGN_PASSWORD="password"

npm run tauri:build:windows
```

## Versioning

Update the version in:
1. `package.json`: `"version": "0.2.0"`
2. `src-tauri/Cargo.toml`: `version = "0.2.0"`
3. `src-tauri/tauri.conf.json`: `"version": "0.2.0"`

## Troubleshooting

**Build fails with Rust errors:**
```bash
rustup update
cargo clean
npm run tauri:build
```

**macOS: Code signing issues:**
```bash
# List available identities
security find-identity -v -p codesigning

# Export the cert for code signing
# See: https://tauri.app/v1/guides/distribution/sign-macos/
```

**Windows: MSI generation fails:**
- Ensure WiX Toolset is installed: https://wixtoolset.org/releases/
- Update Visual Studio Build Tools

## App Configuration

**Default window size** (mobile width):
- Width: 420px (min: 380px)
- Height: 620px (min: 500px)

Edit in `src-tauri/tauri.conf.json` under `app.windows[0]`

## Resources

- [Tauri Documentation](https://tauri.app/v1/guides/)
- [Tauri Distribution](https://tauri.app/v1/guides/distribution/)
- [Tauri Code Signing](https://tauri.app/v1/guides/distribution/sign-macos/)
- [GitHub Releases API](https://docs.github.com/en/rest/releases/)
