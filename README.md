# Inkdash Zig

A minimal zero-native desktop app with a web frontend.

> [!CAUTION]
> **Personal locked-down Raspberry Pi project.**
>
> This dashboard is built for personal use on a locked-down Raspberry Pi. It is not a hardened general-purpose desktop app or a multi-user service. Run it only on a machine and network you control, and only use it if you're brave.

## Setup

`zig build dev`, `zig build run`, and `zig build package` install frontend dependencies automatically. To install them explicitly, run:

```sh
npm install --prefix frontend
```

The build uses `npx zero-native` for all CLI commands (no global install needed). The framework source path is resolved automatically from the npm/npx cache. You can override it:

1. `ZERO_NATIVE_PATH=/path/to/zero-native zig build ...` (env var)
2. `zig build -Dzero-native-path=/path/to/zero-native` (build flag)

## Commands

```sh
zig build dev
zig build run
zig build test
zig build package
zero-native doctor --manifest app.zon
```

`zig build dev` starts the frontend dev server from `app.zon`, waits for it, and launches the native shell with `ZERO_NATIVE_FRONTEND_URL`.

Frontend:

- Type: react
- Production assets: `frontend/dist`
- Dev URL: `http://127.0.0.1:5173/`

## Web Engines

The generated app defaults to the system WebView. On macOS you can switch to Chromium/CEF with:

```sh
zero-native cef install
zig build run -Dplatform=macos -Dweb-engine=chromium
```

`zero-native cef install` downloads zero-native's prepared CEF runtime, including the native wrapper library.

For one-command local setup, opt into build-time install:

```sh
zig build run -Dplatform=macos -Dweb-engine=chromium -Dcef-auto-install=true
```

Use `-Dcef-dir=/path/to/cef` when you keep CEF outside the platform default under `third_party/cef`.

```sh
zero-native doctor --web-engine chromium
```

Diagnostics:

- Set `ZERO_NATIVE_LOG_DIR` to override the platform log directory during development.
- Set `ZERO_NATIVE_LOG_FORMAT=text|jsonl` to choose persistent log format.

## Open Threads dashboard

The homepage shows currently open threads from the same PocketBase account as the Open Threads Raycast extension. It replays the `open_threads` revision log in server insertion order, displays the current stretch and total elapsed wall time, and removes threads when their latest revision is closed. The three-column panel scrolls for longer lists and uses one column on small screens.

Provide runtime environment variables to the **native Inkdash process**:

- `OPEN_THREADS_POCKETBASE_TOKEN`: the existing dedicated `open_threads_users` user token.
- `OPEN_THREADS_POCKETBASE_URL`: optional, defaults to `https://db.vinoth.app`.

On macOS, Inkdash also reads values set through `launchctl setenv`, so it can share the Raycast extension's configuration. On Linux, supply the variables in the app launch environment or service configuration. Restart the app after changing inherited environment variables. The panel's reconnect button reloads configuration, including macOS launchctl values.

Credentials are passed through an allowlisted native bridge command into a memory-only PocketBase client. They are never built into frontend assets or written to browser storage. Use only the dedicated user token. The dashboard makes no record writes. The token retains the permissions granted to that user by PocketBase.

Updates use PocketBase's SSE subscription, with a full ordered read after events/reconnects and every 30 seconds to reconcile missed events. Elapsed labels update every minute. During outages, the panel retains the last successful snapshot and marks its connection state. Invalid payloads leave that snapshot intact and show an error. Plain frontend browser previews cannot access the native environment bridge.

Frontend validation: `npm test --prefix frontend` and `npm run build --prefix frontend`.
