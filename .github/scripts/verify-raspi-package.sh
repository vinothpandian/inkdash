#!/usr/bin/env sh
set -eu

PACKAGE_DIR=${1:-}
if [ -z "$PACKAGE_DIR" ] || [ ! -d "$PACKAGE_DIR" ]; then
  echo "usage: $0 /path/to/package-dir" >&2
  exit 1
fi

BIN=$(find "$PACKAGE_DIR" -type f -perm -111 \( -name 'inkdash' -o -name 'inkdash-zig' \) | head -n 1)
if [ -z "$BIN" ]; then
  echo "inkdash executable not found in $PACKAGE_DIR" >&2
  exit 1
fi

echo "verifying binary: $BIN"
file "$BIN"

if ! file "$BIN" | grep -q 'ARM aarch64'; then
  echo "expected an aarch64 Linux executable" >&2
  exit 1
fi

NEEDED=$(readelf -d "$BIN" | awk '/NEEDED/ { print }')
printf '%s\n' "$NEEDED"

printf '%s\n' "$NEEDED" | grep -q 'libwebkitgtk-6.0.so.4'
printf '%s\n' "$NEEDED" | grep -q 'libgtk-4.so.1'

if printf '%s\n' "$NEEDED" | grep -Ei 'cef|chromium'; then
  echo "unexpected Chromium/CEF dependency in system WebKit build" >&2
  exit 1
fi

if find "$PACKAGE_DIR" -iname '*cef*' -o -iname '*chromium*' | grep -q .; then
  echo "unexpected Chromium/CEF files in package" >&2
  exit 1
fi

if objdump -d "$BIN" | grep -Eq '\b(cas|casa|casal|casl|ldadd|ldadda|ldaddal|ldaddl|swp|swpa|swpal|swpl)\b'; then
  echo "found Arm LSE atomics; rebuild with -Dcpu=baseline for Raspberry Pi 4 compatibility" >&2
  exit 1
fi

echo "raspi package verification passed"
