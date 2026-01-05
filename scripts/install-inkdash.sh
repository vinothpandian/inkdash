#!/bin/bash
# Install inkdash AppImage on Linux

set -e

APPIMAGE_PATH="$HOME/Downloads/inkdash_0.1.0_aarch64.AppImage"

# Check if AppImage exists
if [ ! -f "$APPIMAGE_PATH" ]; then
    echo "Error: AppImage not found at $APPIMAGE_PATH"
    echo "Please download it first from GitHub releases"
    exit 1
fi

echo "Installing inkdash..."

# Create Applications directory
mkdir -p ~/Applications

# Move and make executable
mv "$APPIMAGE_PATH" ~/Applications/inkdash.AppImage
chmod +x ~/Applications/inkdash.AppImage

echo "Moved AppImage to ~/Applications/"

# Create desktop entry
mkdir -p ~/.local/share/applications
cat > ~/.local/share/applications/inkdash.desktop << 'EOF'
[Desktop Entry]
Name=inkdash
Comment=Personal Dashboard
Exec=/home/vinoth/Applications/inkdash.AppImage
Icon=inkdash
Terminal=false
Type=Application
Categories=Utility;
StartupWMClass=inkdash
EOF

echo "Created desktop entry"

# Extract and install icon
cd ~/Applications
./inkdash.AppImage --appimage-extract usr/share/icons/hicolor/256x256/apps/inkdash.png 2>/dev/null || true
mkdir -p ~/.local/share/icons
if [ -f squashfs-root/usr/share/icons/hicolor/256x256/apps/inkdash.png ]; then
    mv squashfs-root/usr/share/icons/hicolor/256x256/apps/inkdash.png ~/.local/share/icons/
    echo "Installed icon"
fi
rm -rf squashfs-root 2>/dev/null || true

# Update desktop database
update-desktop-database ~/.local/share/applications/ 2>/dev/null || true

echo ""
echo "✓ inkdash installed successfully!"
echo "  You can find it in your Applications menu"
echo "  Or run: ~/Applications/inkdash.AppImage"
