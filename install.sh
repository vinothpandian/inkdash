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
RUNTIME_PACKAGES="libwebkitgtk-6.0-4 libgtk-4-1 libglib2.0-0 libgdk-pixbuf-2.0-0 libgraphene-1.0-0 libglib2.0-dev"
REQUIRED_LIBS="libwebkitgtk-6.0.so.4 libgtk-4.so.1 libglib-2.0.so.0 libgdk_pixbuf-2.0.so.0 libgraphene-1.0.so.0"
REQUIRED_SYMBOLS="gtk_uri_launcher_new"

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

check_runtime_deps() {
    if [ ! -x "$BINARY" ]; then
        return
    fi
    if ! command -v ldd >/dev/null 2>&1; then
        return
    fi

    local missing_libs=""
    for lib in $REQUIRED_LIBS; do
        if ! ldd "$BINARY" 2>/dev/null | grep -q "$lib => not found"; then
            continue
        fi
        if [ -z "$missing_libs" ]; then
            missing_libs="$lib"
        else
            missing_libs="$missing_libs $lib"
        fi
    done

    if [ -n "$missing_libs" ]; then
        echo "Error: missing runtime libraries for inkdash:"
        for lib in $missing_libs; do
            echo "  - $lib"
        done
        echo "Install all required libs with:"
        echo "  sudo apt-get update"
        echo "  sudo apt-get install -y $RUNTIME_PACKAGES"
        if [ "${AUTO_INSTALL_DEPS:-0}" = "1" ]; then
            echo "AUTO_INSTALL_DEPS=1 set. Installing dependencies now..."
            sudo apt-get update
            sudo apt-get install -y $RUNTIME_PACKAGES
            echo "Dependency installation complete."
            return
        fi
        echo "Set AUTO_INSTALL_DEPS=1 to let the installer install them automatically."
        exit 1
    fi
}

check_runtime_symbols() {
    if [ ! -x "$BINARY" ]; then
        return
    fi

    if ! command -v ldconfig >/dev/null 2>&1 || ! command -v readelf >/dev/null 2>&1; then
        return
    fi

    local gtk_lib
    gtk_lib="$(ldconfig -p 2>/dev/null | awk '/libgtk-4\\.so\\.1/{print $NF; exit}')"
    if [ -z "$gtk_lib" ]; then
        return
    fi

    local missing_symbols=""
    for sym in $REQUIRED_SYMBOLS; do
        if ! readelf -Ws "$gtk_lib" 2>/dev/null | grep -qE "[[:space:]]$sym(@@|[[:space:]])"; then
            if [ -z "$missing_symbols" ]; then
                missing_symbols="$sym"
            else
                missing_symbols="$missing_symbols $sym"
            fi
        fi
    done

    if [ -n "$missing_symbols" ]; then
        echo "Error: installed GTK runtime is too old for this inkdash build."
        echo "Missing GTK symbol(s):"
        for sym in $missing_symbols; do
            echo "  - $sym"
        done
        echo "Detected GTK: $gtk_lib"
        echo "You likely need a newer GTK4 runtime (and matching libwebkit stack) than what is currently installed."
        echo "Try:"
        echo "  sudo apt-get update"
        echo "  sudo apt-get install -y libgtk-4-1 libgtk-4-common"
        echo "  sudo apt-get install -y libwebkitgtk-6.0-4 libjavascriptcoregtk-6.0-1"
        echo "If using a non-stable Pi image, prefer the latest official repository packages for these libraries."
        echo "If these packages are still too old for your OS, rebuild inkdash on this machine instead of using the prebuilt release."
        echo "Build fallback command:"
        echo "  git clone https://github.com/$REPO.git /tmp/inkdash && cd /tmp/inkdash && npm install --prefix frontend"
        echo "  npx --yes zero-native doctor --manifest app.zon"
        echo "  zig build package -Dplatform=linux -Dpackage-target=linux -Doptimize=ReleaseFast -Dweb-engine=system"
        exit 1
    fi
}

check_runtime_deps
check_runtime_symbols

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
WorkingDirectory=$INSTALL_DIR/resources
ExecStart=$BINARY
Restart=on-failure
RestartSec=5
Environment=DISPLAY=:0
Environment=XAUTHORITY=$HOME/.Xauthority
Environment=NO_AT_BRIDGE=1

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
