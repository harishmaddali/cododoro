@echo off
REM Setup script for Tauri updater with GitHub Releases (Windows)

setlocal enabledelayedexpansion

echo.
echo 🔐 cododoro Updater Setup
echo ==========================
echo.

if exist "src-tauri\private_key.pem" (
    echo ⚠️  Private key already exists at src-tauri\private_key.pem
    set /p OVERWRITE="Do you want to generate a new one? (y/n): "
    if /i not "!OVERWRITE!"=="y" (
        echo Skipping key generation
        exit /b 0
    )
    del src-tauri\private_key.pem
    if exist "src-tauri\private_key.pem.pub" del src-tauri\private_key.pem.pub
)

echo Enter a secure password to protect the private key:
set /p PASSWORD=

echo.
echo Generating keypair...

npx tauri signer generate -w ./src-tauri/private_key.pem -p "%PASSWORD%"

echo.
echo ✅ Keypair generated successfully!
echo.
echo 📝 Public Key (for tauri.conf.json):
type src-tauri\private_key.pem.pub
echo.
echo 💾 Private key saved to: src-tauri\private_key.pem
echo 💾 Public key saved to: src-tauri\private_key.pem.pub
echo.
echo Next steps:
echo 1. Add the public key to src-tauri\tauri.conf.json updater.pubkey
echo 2. Store the password securely (needed for GitHub Actions)
echo 3. Add TAURI_SIGNING_PASSWORD to GitHub Secrets
echo.
pause
