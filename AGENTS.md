# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## What This Is

Inkdash Zig is a desktop app built with the [zero-native](https://zero-native.dev) framework — a Zig-based native shell that hosts a web frontend inside the system WebView (or optionally Chromium/CEF). The frontend is a React + Vite SPA served from `frontend/dist` in production or via Vite's dev server during development.

## Commands

```sh
# Development (starts Vite dev server + native shell with hot reload)
zig build dev

# Production build + run (builds frontend to frontend/dist, then runs native binary)
zig build run

# Run tests
zig build test

# Package the app
zig build package

# Diagnose environment
zero-native doctor --manifest app.zon
```

Frontend-only commands (from `frontend/`):
```sh
npm run dev      # Vite dev server at http://127.0.0.1:5173/
npm run build    # Build to frontend/dist
```

All `zero-native` CLI commands are invoked via `npx --yes zero-native` (no global install required). The framework source path is resolved from the npm/npx cache automatically. Override with `ZERO_NATIVE_PATH=/path/to/zero-native` (env var) or `-Dzero-native-path=/path/to/zero-native` (build flag).

## Build Options

| Flag | Values | Default | Purpose |
|------|--------|---------|---------|
| `-Dplatform` | `auto`, `macos`, `linux`, `windows`, `null` | `auto` | Native backend |
| `-Dweb-engine` | `system`, `chromium` | `system` | WebView engine |
| `-Dtrace` | `off`, `events`, `runtime`, `all` | `events` | Trace verbosity |
| `-Ddebug-overlay` | bool | false | Print platform/engine info at startup |
| `-Dautomation` | bool | false | Enable automation server artifacts |
| `-Dcef-dir` | path | `third_party/cef/<platform>` | CEF root for Chromium builds |
| `-Dcef-auto-install` | bool | false | Auto-download CEF on build |

## Architecture

### Native Layer (Zig)

- **`src/main.zig`** — App entry point. Defines `App` struct with frontend source resolution (dev URL vs. production `frontend/dist`). Configures window, bundle ID, security policy (allowed origins), and passes everything to `runner.runWithOptions`.
- **`src/runner.zig`** — Platform dispatch layer. Selects `runMacos`/`runLinux`/`runWindows`/`runNull` at compile time via `build_options`. Each platform variant initialises the platform, sets up trace sinks (stdout + optional file fanout), configures the `zero_native.Runtime`, and calls `runtime.run(app)`. Window state persistence is handled here via `prepareStateStore`.
- **`build.zig`** — Build system. Wires up the zero-native module graph (geometry, assets, app_dirs, trace, etc.), links platform-specific system libraries/frameworks, and defines build steps: `run`, `dev`, `test`, `package`, `frontend-build`.
- **`app.zon`** — App manifest consumed by the `zero-native` CLI for `dev`, `package`, and `doctor` commands. Declares window config, frontend dev server settings, security policy, and web engine preference.

### Frontend Layer (React/TypeScript)

- **`frontend/src/App.tsx`** — Single React component. Detects the native bridge via `window.zero` and displays its availability. This is the starting point for all UI work.
- **`frontend/src/main.tsx`** — React root mount.
- **`frontend/index.html`** — Vite entry HTML.
- **`frontend/dist/`** — Production build output; embedded by the native binary via `zero_native.frontend.productionSource`.

### Native Bridge

The optional JavaScript bridge (`window.zero`) is enabled at the Zig level via `RunOptions.bridge` (a `BridgeDispatcher`) and `options.js_window_api`. Currently not configured — the frontend reports "not enabled". To add native↔JS messaging, implement a `BridgeDispatcher` in Zig and pass it through `runWithOptions`.

### macOS minimum target

macOS 11.0 is the minimum, enforced in `build.zig` compiler flags (`-mmacosx-version-min=11.0`) and the Zig target query.
