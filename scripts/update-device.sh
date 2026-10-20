#!/usr/bin/env bash
set -euo pipefail

# Run as vinoth, with OPEN_THREADS_POCKETBASE_TOKEN exported.
# Usage: bash update-device.sh [inkdash.service]
service="${1:-inkdash.service}"
[[ "$service" == *.service ]] || service="$service.service"
if [[ ! "$service" =~ ^[a-zA-Z0-9_.@:-]+\.service$ ]]; then
  echo "Invalid service name." >&2
  exit 1
fi
: "${OPEN_THREADS_POCKETBASE_TOKEN:?Export OPEN_THREADS_POCKETBASE_TOKEN before running this script.}"

if [[ "$(id -un)" != vinoth ]]; then
  echo "Run this script as vinoth, without sudo. It will request sudo for service commands." >&2
  exit 1
fi
if [[ "$(uname -s)" != Linux || "$(uname -m)" != aarch64 ]]; then
  echo "This release requires 64-bit Raspberry Pi OS (Linux aarch64)." >&2
  exit 1
fi
if [[ "$(systemctl show "$service" -p User --value)" != vinoth ]]; then
  echo "Expected a system service running as vinoth: $service" >&2
  exit 1
fi
if [[ ! "$OPEN_THREADS_POCKETBASE_TOKEN" =~ ^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$ ]]; then
  echo "OPEN_THREADS_POCKETBASE_TOKEN must contain the dedicated user's PocketBase token." >&2
  exit 1
fi

repo_url=https://github.com/vinothpandian/inkdash
# Resolve once so a newly published release cannot change the version mid-update.
release_url="$(curl -fsSL --proto '=https' --proto-redir '=https' -o /dev/null -w '%{url_effective}' "$repo_url/releases/latest")"
version="${release_url#"$repo_url/releases/tag/"}"
if [[ ! "$version" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Could not resolve a stable inkdash release tag." >&2
  exit 1
fi
printf 'Updating to %s\n' "$version"
install_dir=/home/vinoth/Applications/inkdash
config_dir=/home/vinoth/.config/inkdash
config_file="$config_dir/pocketbase.env"
dropin_dir="/etc/systemd/system/$service.d"
task_dir="$(mktemp -d)"
trap 'rm -rf "$task_dir"' EXIT

archive="inkdash-$version-raspi-arm64.tar.gz"
curl -fsSL "$repo_url/releases/download/$version/$archive" -o "$task_dir/$archive"
curl -fsSL "$repo_url/releases/download/$version/SHA256SUMS" -o "$task_dir/SHA256SUMS"
# Accept only the exact archive entry, never paths or extra files from the manifest.
checksum="$(awk -v name="$archive" '$2 == name {print $1}' "$task_dir/SHA256SUMS")"
if [[ ! "$checksum" =~ ^[a-fA-F0-9]{64}$ ]]; then
  echo "Missing or invalid release checksum for $archive." >&2
  exit 1
fi
printf '%s  %s\n' "$checksum" "$task_dir/$archive" | sha256sum -c -
mkdir "$task_dir/package"
tar -xzf "$task_dir/$archive" -C "$task_dir/package" --strip-components=1
test -x "$task_dir/package/bin/inkdash"
test -f "$task_dir/package/resources/frontend/dist/index.html"

# EnvironmentFile syntax, not shell syntax. Token values are never printed.
quote_env_value() {
  local value="$1"
  if [[ "$value" == *$'\n'* || "$value" == *$'\r'* ]]; then
    echo "Environment values must be single-line." >&2
    return 1
  fi
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  printf '"%s"' "$value"
}
quoted_url="$(quote_env_value "${OPEN_THREADS_POCKETBASE_URL:-https://db.vinoth.app}")"
(
  umask 077
  {
    printf 'OPEN_THREADS_POCKETBASE_URL=%s\n' "$quoted_url"
    printf 'OPEN_THREADS_POCKETBASE_TOKEN="%s"\n' "$OPEN_THREADS_POCKETBASE_TOKEN"
  } > "$task_dir/pocketbase.env"
)
printf '[Service]\nEnvironmentFile=%s\n' "$config_file" > "$task_dir/90-pocketbase.conf"

# Prepare everything before stopping the dashboard.
sudo -v
mkdir -p "$config_dir" "$(dirname "$install_dir")"
backup_dir="$(mktemp -d /home/vinoth/Applications/inkdash-backup.XXXXXX)"
if [[ -d "$install_dir" ]]; then
  cp -a "$install_dir/." "$backup_dir/"
fi
sudo mkdir -p "$dropin_dir"

sudo systemctl stop "$service"
mkdir -p "$install_dir"
cp -a "$task_dir/package/." "$install_dir/"
install -m 600 "$task_dir/pocketbase.env" "$config_file"
sudo install -m 644 "$task_dir/90-pocketbase.conf" "$dropin_dir/90-pocketbase.conf"
sudo systemctl daemon-reload
sudo systemctl restart "$service"
sudo systemctl --no-pager --full status "$service"
printf '\nUpdated %s to %s. Previous app saved in %s\n' "$service" "$version" "$backup_dir"
