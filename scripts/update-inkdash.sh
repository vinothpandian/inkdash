#!/bin/bash
# Update inkdash to the latest version from GitHub releases

set -e

INSTALL_DIR="$HOME/Applications"
APPIMAGE_PATH="$INSTALL_DIR/inkdash.AppImage"
REPO="vinothpandian/inkdash"

echo "Checking for latest inkdash release..."

# Get latest release download URL for ARM64 AppImage
DOWNLOAD_URL=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" | \
    grep "browser_download_url.*aarch64.AppImage" | \
    cut -d '"' -f 4)

if [ -z "$DOWNLOAD_URL" ]; then
    echo "Error: Could not find ARM64 AppImage in latest release"
    exit 1
fi

# Get version from URL
VERSION=$(echo "$DOWNLOAD_URL" | grep -oP 'inkdash_\K[0-9.]+(?=_aarch64)')
echo "Latest version: $VERSION"

# Create install directory if it doesn't exist
mkdir -p "$INSTALL_DIR"

# Backup existing version
if [ -f "$APPIMAGE_PATH" ]; then
    echo "Backing up current version..."
    mv "$APPIMAGE_PATH" "$APPIMAGE_PATH.backup"
fi

# Download latest version
echo "Downloading inkdash $VERSION..."
curl -L "$DOWNLOAD_URL" -o "$APPIMAGE_PATH"
chmod +x "$APPIMAGE_PATH"

# Remove backup if download succeeded
if [ -f "$APPIMAGE_PATH.backup" ]; then
    rm "$APPIMAGE_PATH.backup"
fi

echo ""
echo "✓ inkdash updated to v$VERSION"
echo "  Run: ~/Applications/inkdash.AppImage"
