#!/bin/bash
# Install or update inkdash from the latest GitHub release.
# Sets up the binary, systemd service, and desktop entry.
# Run with: bash install.sh

set -e

REPO="vinothpandian/inkdash"
INSTALL_DIR="$HOME/Applications/inkdash"
BINARY="$INSTALL_DIR/bin/inkdash"
SERVICE_NAME="inkdash"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
DESKTOP_FILE="$HOME/.local/share/applications/${SERVICE_NAME}.desktop"

# ── 1. Fetch latest release ────────────────────────────────────────────────────

echo "Fetching latest inkdash release..."

RELEASE_JSON=$(mktemp)

    if ! curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" -o "$RELEASE_JSON"; then
    echo "Error: no releases found or GitHub API unavailable for https://github.com/$REPO/releases"
    exit 1
fi

RELEASE_TAG=$(awk -F '"' '/"tag_name"/ { print $4; exit }' "$RELEASE_JSON")
HOST_ARCH="$(uname -m)"

case "$HOST_ARCH" in
    aarch64|arm64|armv7l|armv7) ARCH_PATTERN='(arm64|aarch64|raspi-arm64|raspi-aarch64|armv7|armv7l)'
    ;;
    x86_64|amd64) ARCH_PATTERN='(amd64|x86_64|x64)'
    ;;
    *) ARCH_PATTERN='(linux|arm64|aarch64|amd64|x86_64|x64|armv7|armv7l)'
    ;;
esac

DOWNLOAD_URL="$(awk -F '"' '/browser_download_url/ {print $4}' "$RELEASE_JSON" \
    | grep -Ei "/.*(linux)?.*${ARCH_PATTERN}.*\\.tar\\.gz$" \
    | head -n 1)"

if [ -z "$DOWNLOAD_URL" ]; then
    DOWNLOAD_URL="$(awk -F '"' '/browser_download_url/ {print $4}' "$RELEASE_JSON" \
        | grep -Ei '\\.tar\\.gz$' \
        | head -n 1)"
fi

if [ -z "$DOWNLOAD_URL" ]; then
    echo "Error: no downloadable tar.gz release asset found at https://github.com/$REPO/releases"
    echo "Available assets:"
    awk -F '"' '/browser_download_url/ {print "  - " $4}' "$RELEASE_JSON"
    exit 1
fi

ARCHIVE_NAME="$(basename "$DOWNLOAD_URL")"
VERSION="${RELEASE_TAG:-$ARCHIVE_NAME}"
echo "Installing inkdash $VERSION..."

# ── 2. Download and extract ────────────────────────────────────────────────────

if [ -d "$INSTALL_DIR" ]; then
    mv "$INSTALL_DIR" "${INSTALL_DIR}.backup"
fi

TMP=$(mktemp -d)
cleanup() {
    rm -f "$RELEASE_JSON"
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

if [ -x "$BINARY" ]; then
    chmod +x "$BINARY"
elif [ -x "$INSTALL_DIR/bin/inkdash-zig" ]; then
    BINARY="$INSTALL_DIR/bin/inkdash-zig"
    chmod +x "$BINARY"
else
    BINARY_CANDIDATE="$(find "$INSTALL_DIR/bin" -maxdepth 1 -type f -perm /111 2>/dev/null | head -n 1)"
    if [ -n "$BINARY_CANDIDATE" ]; then
        BINARY="$BINARY_CANDIDATE"
        chmod +x "$BINARY"
    else
        echo "Error: no executable found in $INSTALL_DIR/bin"
        exit 1
    fi
fi

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
