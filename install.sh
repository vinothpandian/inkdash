#!/bin/bash
# Install or update inkdash from the latest GitHub release.
# Sets up the binary, systemd service, and desktop entry.
# Run with: bash install.sh

set -e

REPO="vinothpandian/inkdash-zig"
INSTALL_DIR="$HOME/Applications/inkdash"
BINARY="$INSTALL_DIR/inkdash-zig"
SERVICE_NAME="inkdash"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
DESKTOP_FILE="$HOME/.local/share/applications/${SERVICE_NAME}.desktop"

# ── 1. Fetch latest release ────────────────────────────────────────────────────

echo "Fetching latest inkdash release..."

DOWNLOAD_URL=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
    | grep "browser_download_url.*raspi-arm64\.tar\.gz" \
    | cut -d '"' -f 4)

if [ -z "$DOWNLOAD_URL" ]; then
    echo "Error: no ARM64 release found at https://github.com/$REPO/releases"
    exit 1
fi

VERSION=$(echo "$DOWNLOAD_URL" | grep -oP 'inkdash-\Kv[^-]+(?=-raspi)')
echo "Installing inkdash $VERSION..."

# ── 2. Download and extract ────────────────────────────────────────────────────

if [ -d "$INSTALL_DIR" ]; then
    mv "$INSTALL_DIR" "${INSTALL_DIR}.backup"
fi

TMP=$(mktemp -d)
cleanup() {
    rm -rf "$TMP"
    if [ ! -d "$INSTALL_DIR" ] && [ -d "${INSTALL_DIR}.backup" ]; then
        mv "${INSTALL_DIR}.backup" "$INSTALL_DIR"
        echo "Rolled back to previous version."
    fi
}
trap cleanup EXIT

curl -fsSL "$DOWNLOAD_URL" -o "$TMP/inkdash.tar.gz"
mkdir -p "$INSTALL_DIR"
tar -xzf "$TMP/inkdash.tar.gz" -C "$INSTALL_DIR" --strip-components=1
chmod +x "$BINARY"

rm -rf "${INSTALL_DIR}.backup"

# ── 3. Systemd service ─────────────────────────────────────────────────────────

sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Inkdash Personal Dashboard
After=graphical.target
Wants=graphical.target

[Service]
Type=simple
User=$USER
ExecStart=$BINARY
Restart=on-failure
RestartSec=5
Environment=DISPLAY=:0
Environment=XAUTHORITY=$HOME/.Xauthority

[Install]
WantedBy=graphical.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"

if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    sudo systemctl restart "$SERVICE_NAME"
    echo "Service restarted."
else
    sudo systemctl start "$SERVICE_NAME"
    echo "Service started."
fi

# ── 4. Desktop entry ───────────────────────────────────────────────────────────

mkdir -p "$(dirname "$DESKTOP_FILE")"
cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Name=Inkdash
Comment=Personal Dashboard
Exec=systemctl start $SERVICE_NAME
Icon=utilities-system-monitor
Terminal=false
Type=Application
Categories=Utility;
StartupWMClass=inkdash
EOF

if [ -d "$HOME/Desktop" ]; then
    cp "$DESKTOP_FILE" "$HOME/Desktop/${SERVICE_NAME}.desktop"
fi

# ── Done ───────────────────────────────────────────────────────────────────────

echo ""
echo "inkdash $VERSION installed"
echo "  Binary:  $BINARY"
echo "  Service: systemctl status $SERVICE_NAME"
echo "  Desktop: $DESKTOP_FILE"
