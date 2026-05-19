# Build Scripts

## next-version.mjs

Computes the next release version from [Conventional Commits](https://www.conventionalcommits.org/)
since the most recent `v*` tag (or the whole history if there is no tag yet).

```bash
npm run version:next        # or: node scripts/next-version.mjs
```

Bump rules: `fix:`/`perf:` → patch, `feat:` → minor, `feat!:` or a
`BREAKING CHANGE:` footer → major, a plain non-Conventional commit → patch,
and only `docs/chore/style/refactor/test/build/ci` → no release. Prints the
next version to stdout (empty if nothing is releasable) and, under GitHub
Actions, writes `released` / `next_version` / `level` / `prev_tag` to
`$GITHUB_OUTPUT`. Read-only — never writes files or git.

## set-version.mjs

Writes a version consistently into **all five** files that pin it:
`package.json`, `package-lock.json`, `src-tauri/Cargo.toml`,
`src-tauri/Cargo.lock` and `src-tauri/tauri.conf.json`. (Exists because
`npm version` only updates `package.json`.)

```bash
npm run version:set -- 0.2.0    # or: node scripts/set-version.mjs 0.2.0
```

## local-release.sh

Cut a release from your machine (same logic the CI uses): compute the next
version, set it everywhere, commit, tag and push. Pushing the tag triggers
`publish-release.yml`, which builds and publishes the installers.

```bash
./scripts/local-release.sh              # compute → bump → commit → tag → push
./scripts/local-release.sh --dry-run    # show what would happen, change nothing
./scripts/local-release.sh 0.4.0        # force an explicit version
```

## setup-updater.sh / setup-updater.bat

Generates the cryptographic keypair needed for signing application updates.

**Usage:**

macOS/Linux:
```bash
./scripts/setup-updater.sh
```

Windows:
```cmd
scripts\setup-updater.bat
```

**What it does:**
1. Prompts for a secure password
2. Generates `src-tauri/private_key.pem` (keeps this secret!)
3. Outputs the **public key** to copy into `src-tauri/tauri.conf.json`

**Output:**
```
✅ Keypair generated successfully!

📝 Public Key (for tauri.conf.json):
<your_public_key_here>

💾 Private key saved to: src-tauri/private_key.pem

Next steps:
1. Add the public key to src-tauri/tauri.conf.json updater.pubkey
2. Store the password securely (needed for GitHub Actions)
3. Add TAURI_SIGNING_PASSWORD to GitHub Secrets
```

See [BUILD_AND_PUBLISH.md](../BUILD_AND_PUBLISH.md) for complete setup instructions.
