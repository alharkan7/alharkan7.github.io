#!/bin/bash
#
# Installation script for Reading List Sync Native Messaging Host
#
# This script:
# 1. Makes the native host Python script executable
# 2. Creates the native messaging host manifest with correct extension ID
# 3. Installs the manifest to Chrome's native messaging hosts directory
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST_NAME="com.alharkan.readinglist"
NATIVE_HOST_PATH="$SCRIPT_DIR/native_host.py"
MANIFEST_TEMPLATE="$SCRIPT_DIR/$HOST_NAME.json"

# Chrome Native Messaging Hosts directory (macOS)
CHROME_NATIVE_HOSTS_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"

echo "=========================================="
echo "Reading List Sync - Native Host Installer"
echo "=========================================="
echo

# Get extension ID from user
if [ -z "$1" ]; then
    echo "Usage: ./install_native_host.sh <EXTENSION_ID>"
    echo
    echo "To find your extension ID:"
    echo "1. Go to chrome://extensions/"
    echo "2. Enable 'Developer mode'"
    echo "3. Find 'Reading List Sync' and copy its ID"
    echo
    read -p "Enter Extension ID: " EXTENSION_ID
else
    EXTENSION_ID="$1"
fi

if [ -z "$EXTENSION_ID" ]; then
    echo "Error: Extension ID is required"
    exit 1
fi

echo "Extension ID: $EXTENSION_ID"
echo

# Step 1: Make native host executable
echo "1. Making native host executable..."
chmod +x "$NATIVE_HOST_PATH"
echo "   ✓ $NATIVE_HOST_PATH"

# Step 2: Create manifest with correct extension ID
echo "2. Creating native messaging host manifest..."

# Create the manifest directory if it doesn't exist
mkdir -p "$CHROME_NATIVE_HOSTS_DIR"

# Create the manifest file
cat > "$CHROME_NATIVE_HOSTS_DIR/$HOST_NAME.json" << EOF
{
  "name": "$HOST_NAME",
  "description": "Reading List Sync Native Host",
  "path": "$NATIVE_HOST_PATH",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXTENSION_ID/"
  ]
}
EOF

echo "   ✓ Manifest created at: $CHROME_NATIVE_HOSTS_DIR/$HOST_NAME.json"

# Step 3: Verify installation
echo "3. Verifying installation..."
if [ -f "$CHROME_NATIVE_HOSTS_DIR/$HOST_NAME.json" ]; then
    echo "   ✓ Native messaging host installed successfully!"
else
    echo "   ✗ Installation failed"
    exit 1
fi

echo
echo "=========================================="
echo "Installation Complete!"
echo "=========================================="
echo
echo "Next steps:"
echo "1. Reload the extension in chrome://extensions/"
echo "2. Click the extension icon and test 'Sync Now'"
echo
echo "The reading list will sync to:"
echo "  ~/Documents/Repositories/alharkan7.github.io/public/os-bookmarks/bookmarks.db"
echo
echo "Logs are saved to:"
echo "  ~/.reading_list_sync.log"
echo
