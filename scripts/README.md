# Build Scripts

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
