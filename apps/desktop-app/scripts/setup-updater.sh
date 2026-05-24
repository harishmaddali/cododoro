#!/bin/bash

# Setup script for Tauri updater with GitHub Releases
# This script generates the keypair needed for automatic updates

set -e

echo "🔐 cododoro Updater Setup"
echo "=========================="
echo ""

# Check if private key already exists
if [ -f "src-tauri/private_key.pem" ]; then
    echo "⚠️  Private key already exists at src-tauri/private_key.pem"
    read -p "Do you want to generate a new one? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping key generation"
        exit 0
    fi
    rm src-tauri/private_key.pem
    rm -f src-tauri/private_key.pem.pub
fi

echo "Enter a secure password to protect the private key:"
read -s PASSWORD

echo ""
echo "Generating keypair..."

npx tauri signer generate -w ./src-tauri/private_key.pem -p "$PASSWORD"

PUBLIC_KEY=$(cat ./src-tauri/private_key.pem.pub)

echo ""
echo "✅ Keypair generated successfully!"
echo ""
echo "📝 Public Key (for tauri.conf.json):"
echo "$PUBLIC_KEY"
echo ""
echo "💾 Private key saved to: src-tauri/private_key.pem"
echo "💾 Public key saved to: src-tauri/private_key.pem.pub"
echo ""
echo "Next steps:"
echo "1. Add the public key to src-tauri/tauri.conf.json updater.pubkey"
echo "2. Store the password securely (needed for GitHub Actions)"
echo "3. Add TAURI_SIGNING_PASSWORD to GitHub Secrets"
echo ""
