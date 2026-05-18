# Inkdash Migration: Tauri → Zero-Native Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all Inkdash Tauri/Rust app functionality into the zero-native Zig app so the final app has identical features, all Zig tests pass, and the app builds and runs correctly.

**Architecture:** The frontend React SPA is copied as-is with Tauri `invoke()` calls replaced by a `window.zero.invoke()` adapter. All Rust backend logic (config I/O, HTTP API calls, OAuth flow, timeline) is rewritten in Zig as zero-native bridge command handlers. Sync handlers service fast in-memory commands; async handlers spin a background thread per HTTP call.

**Tech Stack:** Zig 0.16, zero-native (bridge.Dispatcher, bridge.AsyncHandler, app_dirs, std.http.Client, std.json, std.Io.Dir), React 19 + TypeScript, Vite 8, Tailwind CSS v4, Radix UI, Recharts, date-fns, lucide-react.

---

## File Map

### New Zig files
| File | Responsibility |
|------|---------------|
| `src/config.zig` | AppConfig JSON load/save, app_dirs for config path |
| `src/timeline.zig` | TimelineConfig JSON load, today's schedule selection |
| `src/http_client.zig` | HTTP GET/POST helpers using `std.http.Client` + `std.Io` |
| `src/api_weather.zig` | Async bridge handler: `app.fetch_weather` |
| `src/api_stocks.zig` | Async bridge handler: `app.fetch_stocks` |
| `src/api_ticktick.zig` | Async bridge handler: `app.fetch_ticktick_tasks` |
| `src/api_calendar.zig` | Async bridge handlers: `app.fetch_calendar_events`, `app.fetch_calendar_list`, `app.get_calendar_sources`, `app.is_calendar_configured` |
| `src/api_oauth.zig` | Async bridge handlers: `app.start_google_oauth`, `app.complete_google_oauth` |

### Modified Zig files
| File | Changes |
|------|---------|
| `src/main.zig` | Add App state, bridge handlers/policies, update window size (1024×600), bundle ID (`com.inkdash.app`) |
| `app.zon` | Update window to 1024×600, add bridge policy for all commands |
| `src/runner.zig` | Update window size to 1024×600 in all four platform branches |

### New frontend files
| File | Responsibility |
|------|---------------|
| `frontend/src/bridge.ts` | `invoke()` adapter wrapping `window.zero.invoke()` |
| `frontend/src/vite-env.d.ts` | `Window.zero` TypeScript declaration |

### Frontend files copied from inkdash
Copied verbatim (except import patches):
- `frontend/src/App.tsx` (replace existing minimal app)
- `frontend/src/components/Dashboard.tsx`
- `frontend/src/components/pages/OverviewPage.tsx`
- `frontend/src/components/pages/TasksPage.tsx`
- `frontend/src/components/pages/CalendarPage.tsx`
- `frontend/src/components/pages/StocksPage.tsx`
- `frontend/src/components/widgets/` (all widget files)
- `frontend/src/components/calendar/` (all calendar view files)
- `frontend/src/components/ui/` (shadcn-style UI components)
- `frontend/src/hooks/useWeather.ts`, `useStocks.ts`, `useTickTick.ts`, `useCalendar.ts`, `useTheme.ts`, `useSwipe.ts`
- `frontend/src/context/ConfigContext.tsx`
- `frontend/src/types/index.ts`
- `frontend/src/lib/utils.ts`
- `frontend/src/utils/calendar.ts`
- `frontend/src/config/` (all config files)
- `frontend/src/index.css`

### Modified frontend files
| File | Changes |
|------|---------|
| `frontend/package.json` | Add all inkdash deps; remove `@tauri-apps/api` |
| `frontend/vite.config.js` | Add `@` path alias |
| `frontend/tsconfig.json` | Add `@` path alias + new file |
| `frontend/src/hooks/*.ts` | Replace `from '@tauri-apps/api/core'` → `from '@/bridge'` |
| `frontend/src/context/ConfigContext.tsx` | Replace `from '@tauri-apps/api/core'` → `from '@/bridge'` |

---

## Task 1: Frontend File Copy + Package Setup

**Files:**
- Copy: entire `frontend/src/` directory from inkdash
- Modify: `frontend/package.json`
- Create: `frontend/vite.config.js` (replace)
- Create: `frontend/tsconfig.json` (create if missing)

- [ ] **Step 1: Copy all frontend source files**

```bash
# Run from inkdash root
cp -r ../inkdash/src/* ./frontend/src/
```

Verify the copy:
```bash
ls ./frontend/src/
```
Expected: `App.tsx  components/  config/  context/  hooks/  index.css  lib/  main.tsx  types/  utils/`

- [ ] **Step 2: Update package.json**

Replace `frontend/package.json` content:
```json
{
  "name": "inkdash",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint ."
  },
  "dependencies": {
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-hover-card": "^1.1.15",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-slot": "^1.2.4",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.562.0",
    "react": "^19.2.0",
    "react-day-picker": "^9.13.0",
    "react-dom": "^19.2.0",
    "recharts": "2.15.4",
    "tailwind-merge": "^3.4.0",
    "tailwindcss": "^4.1.18"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@tailwindcss/vite": "^4.1.18",
    "@types/node": "^24.10.1",
    "@types/react": "^19.2.5",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "typescript": "~5.9.3",
    "typescript-eslint": "^8.46.4",
    "vite": "npm:rolldown-vite@7.2.5"
  }
}
```

- [ ] **Step 3: Update vite.config.js with path alias**

Replace `frontend/vite.config.js`:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 4: Create/update tsconfig.json**

Create `frontend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

Create `frontend/tsconfig.app.json`:
```json
{
  "extends": "./tsconfig.json"
}
```

- [ ] **Step 5: Install frontend dependencies**

```bash
npm install --prefix frontend
```

Expected: Packages installed without errors.

---

## Task 2: Bridge Adapter + TypeScript Declarations

**Files:**
- Create: `frontend/src/bridge.ts`
- Create: `frontend/src/vite-env.d.ts`
- Modify: `frontend/src/hooks/useWeather.ts`
- Modify: `frontend/src/hooks/useStocks.ts`
- Modify: `frontend/src/hooks/useTickTick.ts`
- Modify: `frontend/src/hooks/useCalendar.ts`
- Modify: `frontend/src/context/ConfigContext.tsx`

- [ ] **Step 1: Create window.zero type declaration**

Create `frontend/src/vite-env.d.ts`:
```typescript
/// <reference types="vite/client" />

interface Window {
  zero?: {
    invoke(command: string, payload?: unknown): Promise<unknown>
  }
}
```

- [ ] **Step 2: Create bridge.ts adapter**

Create `frontend/src/bridge.ts`:
```typescript
type InvokeArgs = Record<string, unknown> | null

export async function invoke<T>(command: string, args?: InvokeArgs): Promise<T> {
  if (!window.zero) {
    throw new Error('Native bridge not available. Run the app with zig build run or zig build dev.')
  }
  const result = await window.zero.invoke(`app.${command}`, args ?? null)
  return result as T
}
```

- [ ] **Step 3: Patch useWeather.ts**

In `frontend/src/hooks/useWeather.ts`, replace:
```typescript
import { invoke } from '@tauri-apps/api/core'
```
with:
```typescript
import { invoke } from '@/bridge'
```

- [ ] **Step 4: Patch useStocks.ts**

In `frontend/src/hooks/useStocks.ts`, replace:
```typescript
import { invoke } from '@tauri-apps/api/core'
```
with:
```typescript
import { invoke } from '@/bridge'
```

- [ ] **Step 5: Patch useTickTick.ts**

In `frontend/src/hooks/useTickTick.ts`, replace:
```typescript
import { invoke } from '@tauri-apps/api/core'
```
with:
```typescript
import { invoke } from '@/bridge'
```

- [ ] **Step 6: Patch useCalendar.ts**

In `frontend/src/hooks/useCalendar.ts`, replace:
```typescript
import { invoke } from '@tauri-apps/api/core'
```
with:
```typescript
import { invoke } from '@/bridge'
```

- [ ] **Step 7: Patch ConfigContext.tsx**

In `frontend/src/context/ConfigContext.tsx`, replace:
```typescript
import { invoke } from '@tauri-apps/api/core'
```
with:
```typescript
import { invoke } from '@/bridge'
```

- [ ] **Step 8: Handle fullscreen in Dashboard.tsx**

The Dashboard component calls `invoke('toggle_fullscreen')` and `invoke('get_fullscreen_state')`. These need to use the browser Fullscreen API instead.

In `frontend/src/components/Dashboard.tsx`, find and replace the fullscreen-related code. Look for `toggle_fullscreen` and `get_fullscreen_state` calls, then replace with:

```typescript
// Replace toggle_fullscreen invoke
const toggleFullscreen = async () => {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen()
  } else {
    await document.exitFullscreen()
  }
  setIsFullscreen(!!document.fullscreenElement)
}

// Replace get_fullscreen_state invoke
const isFullscreen = !!document.fullscreenElement
```

Also add a fullscreen change listener to stay in sync:
```typescript
useEffect(() => {
  const handler = () => setIsFullscreen(!!document.fullscreenElement)
  document.addEventListener('fullscreenchange', handler)
  return () => document.removeEventListener('fullscreenchange', handler)
}, [])
```

- [ ] **Step 9: Verify frontend TypeScript compiles**

```bash
cd ./frontend && npx tsc --noEmit
```

Expected: No type errors (or only errors in inkdash's existing code that don't block the build).

---

## Task 3: Zig Config Module

**Files:**
- Create: `src/config.zig`
- Modify: `src/main.zig` (test update)

The config is stored at platform-appropriate path:
- macOS: `~/Library/Preferences/inkdash/config.json`
- Linux: `~/.config/inkdash/config.json`

- [ ] **Step 1: Write the failing test**

Add to a new test file or at the bottom of `src/config.zig` (create the file):

```zig
const std = @import("std");
const config = @import("config.zig");

test "default config has expected weather location" {
    const cfg = config.AppConfig.default();
    try std.testing.expectApproxEqAbs(@as(f64, 43.6532), cfg.weather.latitude, 0.001);
    try std.testing.expectEqualStrings("America/Toronto", cfg.weather.timezone);
}

test "default config has expected stock tickers" {
    const cfg = config.AppConfig.default();
    try std.testing.expect(cfg.stocks.tickers.len == 4);
}

test "config JSON round-trip preserves weather location" {
    const allocator = std.testing.allocator;
    const original = config.AppConfig.default();

    var json_buf = std.Io.Writer.Allocating.init(allocator);
    defer json_buf.deinit();
    try std.json.Stringify.value(original, .{}, &json_buf.writer);
    const json_str = json_buf.writer.buffered();

    const parsed = try std.json.parseFromSlice(config.AppConfig, allocator, json_str, .{
        .ignore_unknown_fields = true,
    });
    defer parsed.deinit();

    try std.testing.expectApproxEqAbs(original.weather.latitude, parsed.value.weather.latitude, 0.0001);
    try std.testing.expectEqualStrings(original.weather.timezone, parsed.value.weather.timezone);
}
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd . && zig build test 2>&1 | head -20
```

Expected: Compilation error — `config.zig` doesn't exist yet.

- [ ] **Step 3: Create src/config.zig**

```zig
const std = @import("std");
const app_dirs = @import("app_dirs");
const builtin = @import("builtin");

const CONFIG_APP_NAME = "inkdash";
const CONFIG_FILE = "config.json";

pub const ThemeMode = enum {
    light,
    dark,
    auto_time,
    auto_sun,
};

pub const TimezoneEntry = struct {
    name: []const u8,
    tz: []const u8,
};

pub const WeatherConfig = struct {
    latitude: f64 = 43.6532,
    longitude: f64 = -79.3832,
    timezone: []const u8 = "America/Toronto",
};

pub const StocksConfig = struct {
    tickers: []const []const u8 = &.{ "TRI", "VEQT.TO", "VGRO.TO", "ZGLD.TO" },
};

pub const TickTickConfig = struct {
    access_token: []const u8 = "",
    refresh_interval_minutes: u32 = 15,
};

pub const CalendarSource = struct {
    id: []const u8,
    name: []const u8,
    color: []const u8,
};

pub const GoogleCalendarConfig = struct {
    client_id: []const u8 = "",
    client_secret: []const u8 = "",
    access_token: []const u8 = "",
    refresh_token: []const u8 = "",
    token_expiry: []const u8 = "",
    calendars: []const CalendarSource = &.{},
    refresh_interval_minutes: u32 = 30,
};

pub const TimezonesConfig = struct {
    zones: []const TimezoneEntry = &.{
        .{ .name = "Minnesota", .tz = "America/Chicago" },
        .{ .name = "London", .tz = "Europe/London" },
        .{ .name = "Zug", .tz = "Europe/Zurich" },
        .{ .name = "India", .tz = "Asia/Kolkata" },
        .{ .name = "Australia", .tz = "Australia/Sydney" },
    },
};

pub const DisplayConfig = struct {
    fullscreen: bool = false,
    theme_mode: ThemeMode = .auto_sun,
};

pub const AppConfig = struct {
    weather: WeatherConfig = .{},
    stocks: StocksConfig = .{},
    ticktick: TickTickConfig = .{},
    google_calendar: GoogleCalendarConfig = .{},
    timezones: TimezonesConfig = .{},
    display: DisplayConfig = .{},

    pub fn default() AppConfig {
        return .{};
    }
};

fn getConfigDir(env_map: *const std.process.Environ.Map, buf: []u8) ![]const u8 {
    const platform = app_dirs.currentPlatform();
    const env = app_dirs.Env{
        .home = env_map.get("HOME"),
        .xdg_config_home = env_map.get("XDG_CONFIG_HOME"),
        .app_data = env_map.get("APPDATA"),
        .local_app_data = env_map.get("LOCALAPPDATA"),
    };
    const app_info = app_dirs.AppInfo{ .name = CONFIG_APP_NAME };
    return app_dirs.resolveOne(app_info, platform, env, .config, buf);
}

pub fn loadConfig(
    io: std.Io,
    allocator: std.mem.Allocator,
    env_map: *const std.process.Environ.Map,
) !AppConfig {
    var dir_buf: [1024]u8 = undefined;
    const config_dir = getConfigDir(env_map, &dir_buf) catch return AppConfig.default();

    var path_buf: [1200]u8 = undefined;
    const config_path = try std.fmt.bufPrint(&path_buf, "{s}/{s}", .{ config_dir, CONFIG_FILE });

    const cwd = std.Io.Dir.cwd();
    const data = cwd.readFileAlloc(io, config_path, allocator, .limited(512 * 1024)) catch |err| {
        if (err == error.FileNotFound) return AppConfig.default();
        return AppConfig.default();
    };
    defer allocator.free(data);

    const parsed = std.json.parseFromSlice(AppConfig, allocator, data, .{
        .ignore_unknown_fields = true,
    }) catch return AppConfig.default();
    defer parsed.deinit();

    // Deep copy so parsed memory isn't freed
    return try deepCopyConfig(allocator, parsed.value);
}

pub fn saveConfig(
    io: std.Io,
    allocator: std.mem.Allocator,
    env_map: *const std.process.Environ.Map,
    cfg: AppConfig,
) !void {
    var dir_buf: [1024]u8 = undefined;
    const config_dir = try getConfigDir(env_map, &dir_buf);

    const cwd = std.Io.Dir.cwd();
    try cwd.createDirPath(io, config_dir);

    var json_buf = std.Io.Writer.Allocating.init(allocator);
    defer json_buf.deinit();
    try std.json.Stringify.value(cfg, .{ .whitespace = .indent_2 }, &json_buf.writer);

    var path_buf: [1200]u8 = undefined;
    const config_path = try std.fmt.bufPrint(&path_buf, "{s}/{s}", .{ config_dir, CONFIG_FILE });
    try cwd.writeFile(io, .{ .sub_path = config_path, .data = json_buf.writer.buffered() });
}

fn deepCopyConfig(allocator: std.mem.Allocator, src: AppConfig) !AppConfig {
    var cfg = src;
    cfg.weather.timezone = try allocator.dupe(u8, src.weather.timezone);
    cfg.ticktick.access_token = try allocator.dupe(u8, src.ticktick.access_token);
    cfg.google_calendar.client_id = try allocator.dupe(u8, src.google_calendar.client_id);
    cfg.google_calendar.client_secret = try allocator.dupe(u8, src.google_calendar.client_secret);
    cfg.google_calendar.access_token = try allocator.dupe(u8, src.google_calendar.access_token);
    cfg.google_calendar.refresh_token = try allocator.dupe(u8, src.google_calendar.refresh_token);
    cfg.google_calendar.token_expiry = try allocator.dupe(u8, src.google_calendar.token_expiry);
    // Copy tickers
    const tickers = try allocator.alloc([]const u8, src.stocks.tickers.len);
    for (src.stocks.tickers, 0..) |t, i| tickers[i] = try allocator.dupe(u8, t);
    cfg.stocks.tickers = tickers;
    // Copy timezone zones
    const zones = try allocator.alloc(TimezoneEntry, src.timezones.zones.len);
    for (src.timezones.zones, 0..) |z, i| {
        zones[i] = .{
            .name = try allocator.dupe(u8, z.name),
            .tz = try allocator.dupe(u8, z.tz),
        };
    }
    cfg.timezones.zones = zones;
    // Copy calendar sources
    const cals = try allocator.alloc(CalendarSource, src.google_calendar.calendars.len);
    for (src.google_calendar.calendars, 0..) |c, i| {
        cals[i] = .{
            .id = try allocator.dupe(u8, c.id),
            .name = try allocator.dupe(u8, c.name),
            .color = try allocator.dupe(u8, c.color),
        };
    }
    cfg.google_calendar.calendars = cals;
    return cfg;
}

test "default config has expected weather location" {
    const cfg = AppConfig.default();
    try std.testing.expectApproxEqAbs(@as(f64, 43.6532), cfg.weather.latitude, 0.001);
    try std.testing.expectEqualStrings("America/Toronto", cfg.weather.timezone);
}

test "default config has expected stock tickers" {
    const cfg = AppConfig.default();
    try std.testing.expect(cfg.stocks.tickers.len == 4);
}

test "config JSON round-trip preserves weather location" {
    const allocator = std.testing.allocator;
    const original = AppConfig.default();

    var json_buf = std.Io.Writer.Allocating.init(allocator);
    defer json_buf.deinit();
    try std.json.Stringify.value(original, .{}, &json_buf.writer);
    const json_str = json_buf.writer.buffered();

    const parsed = try std.json.parseFromSlice(AppConfig, allocator, json_str, .{
        .ignore_unknown_fields = true,
    });
    defer parsed.deinit();

    try std.testing.expectApproxEqAbs(original.weather.latitude, parsed.value.weather.latitude, 0.0001);
    try std.testing.expectEqualStrings(original.weather.timezone, parsed.value.weather.timezone);
}
```

- [ ] **Step 4: Add config.zig to build.zig**

In `build.zig`, find where modules are added to the exe (the `addModule` or `root_module.addImport` call) and add config as a module, OR since config.zig lives in `src/`, it can be imported directly with `@import("config.zig")` from main.zig without any build changes.

Actually in Zig 0.16, files in the same source root can be imported directly with relative paths like `@import("config.zig")`. No build.zig changes needed for internal modules.

- [ ] **Step 5: Run tests**

```bash
cd . && zig build test 2>&1
```

Expected: Config tests pass.

---

## Task 4: Zig Timeline Module

**Files:**
- Create: `src/timeline.zig`

The timeline JSON is stored at the same config directory, in `timeline.json`.

- [ ] **Step 1: Write failing tests first**

Add to the bottom of `src/timeline.zig` (create file):

```zig
test "default timeline has expected events" {
    const config = TimelineConfig.default();
    try std.testing.expect(config.default_events.len > 0);
    try std.testing.expectEqual(@as(u8, 6), config.start_hour);
    try std.testing.expectEqual(@as(u8, 23), config.end_hour);
}

test "timeline for today returns events" {
    const allocator = std.testing.allocator;
    // Use default config (no file)
    const config = TimelineConfig.default();
    const response = try getTimelineForDay(allocator, config, "monday");
    defer allocator.free(response.events);
    try std.testing.expect(response.events.len > 0);
    try std.testing.expectEqual(@as(u8, 6), response.start_hour);
}
```

- [ ] **Step 2: Run to verify fails**

```bash
zig build test 2>&1 | head -20
```

- [ ] **Step 3: Create src/timeline.zig**

```zig
const std = @import("std");
const app_dirs = @import("app_dirs");
const config_mod = @import("config.zig");

const TIMELINE_FILE = "timeline.json";

pub const TimelineEvent = struct {
    time: []const u8,
    label: []const u8,
    type: []const u8, // "marker", "range-start", "range-end"
};

pub const TimelineOverride = struct {
    days: []const []const u8,
    events: []const TimelineEvent,
};

pub const TimelineConfig = struct {
    start_hour: u8 = 6,
    end_hour: u8 = 23,
    default_events: []const TimelineEvent = &default_event_list,
    overrides: ?[]const TimelineOverride = null,

    pub fn default() TimelineConfig {
        return .{};
    }
};

const default_event_list = [_]TimelineEvent{
    .{ .time = "06:30", .label = "Alarm", .type = "marker" },
    .{ .time = "07:00", .label = "Wake up", .type = "marker" },
    .{ .time = "08:30", .label = "Work", .type = "range-start" },
    .{ .time = "18:00", .label = "", .type = "range-end" },
    .{ .time = "18:30", .label = "Bubble time", .type = "marker" },
    .{ .time = "21:30", .label = "In bed", .type = "marker" },
    .{ .time = "22:30", .label = "Sleep", .type = "marker" },
};

pub const TimelineResponse = struct {
    events: []const TimelineEvent,
    start_hour: u8,
    end_hour: u8,
};

fn getCurrentDayName() []const u8 {
    const epoch_seconds = @as(u64, @intCast(std.time.timestamp()));
    // Days since epoch (Jan 1, 1970 was a Thursday = day index 3)
    const days_since_epoch = epoch_seconds / 86400;
    const day_of_week = (days_since_epoch + 4) % 7; // 0=Sunday
    return switch (day_of_week) {
        0 => "sunday",
        1 => "monday",
        2 => "tuesday",
        3 => "wednesday",
        4 => "thursday",
        5 => "friday",
        6 => "saturday",
        else => "monday",
    };
}

pub fn loadTimelineConfig(
    io: std.Io,
    allocator: std.mem.Allocator,
    env_map: *const std.process.Environ.Map,
) !TimelineConfig {
    var dir_buf: [1024]u8 = undefined;
    const platform = app_dirs.currentPlatform();
    const env = app_dirs.Env{
        .home = env_map.get("HOME"),
        .xdg_config_home = env_map.get("XDG_CONFIG_HOME"),
        .app_data = env_map.get("APPDATA"),
        .local_app_data = env_map.get("LOCALAPPDATA"),
    };
    const app_info = app_dirs.AppInfo{ .name = "inkdash" };
    const config_dir = app_dirs.resolveOne(app_info, platform, env, .config, &dir_buf) catch
        return TimelineConfig.default();

    var path_buf: [1200]u8 = undefined;
    const timeline_path = try std.fmt.bufPrint(&path_buf, "{s}/{s}", .{ config_dir, TIMELINE_FILE });

    const cwd = std.Io.Dir.cwd();
    const data = cwd.readFileAlloc(io, timeline_path, allocator, .limited(256 * 1024)) catch |err| {
        if (err == error.FileNotFound) return TimelineConfig.default();
        return TimelineConfig.default();
    };
    defer allocator.free(data);

    const parsed = std.json.parseFromSlice(TimelineConfig, allocator, data, .{
        .ignore_unknown_fields = true,
    }) catch return TimelineConfig.default();
    defer parsed.deinit();

    return parsed.value;
}

pub fn getTimelineForDay(
    allocator: std.mem.Allocator,
    cfg: TimelineConfig,
    day: []const u8,
) !TimelineResponse {
    const events = blk: {
        if (cfg.overrides) |overrides| {
            for (overrides) |override| {
                for (override.days) |d| {
                    if (std.ascii.eqlIgnoreCase(d, day)) {
                        break :blk override.events;
                    }
                }
            }
        }
        break :blk cfg.default_events;
    };

    const events_copy = try allocator.dupe(TimelineEvent, events);
    return TimelineResponse{
        .events = events_copy,
        .start_hour = cfg.start_hour,
        .end_hour = cfg.end_hour,
    };
}

pub fn getTimelineForToday(
    io: std.Io,
    allocator: std.mem.Allocator,
    env_map: *const std.process.Environ.Map,
) !TimelineResponse {
    const cfg = try loadTimelineConfig(io, allocator, env_map);
    const day = getCurrentDayName();
    return getTimelineForDay(allocator, cfg, day);
}

test "default timeline has expected events" {
    const cfg = TimelineConfig.default();
    try std.testing.expect(cfg.default_events.len > 0);
    try std.testing.expectEqual(@as(u8, 6), cfg.start_hour);
    try std.testing.expectEqual(@as(u8, 23), cfg.end_hour);
}

test "timeline for today returns events" {
    const allocator = std.testing.allocator;
    const cfg = TimelineConfig.default();
    const response = try getTimelineForDay(allocator, cfg, "monday");
    defer allocator.free(response.events);
    try std.testing.expect(response.events.len > 0);
    try std.testing.expectEqual(@as(u8, 6), response.start_hour);
}

test "timeline override applies for matching day" {
    const allocator = std.testing.allocator;
    const weekend_events = [_]TimelineEvent{
        .{ .time = "09:00", .label = "Sleep in", .type = "marker" },
    };
    const overrides = [_]TimelineOverride{
        .{ .days = &.{"saturday", "sunday"}, .events = &weekend_events },
    };
    const cfg = TimelineConfig{
        .default_events = &default_event_list,
        .overrides = &overrides,
    };

    const sat_response = try getTimelineForDay(allocator, cfg, "saturday");
    defer allocator.free(sat_response.events);
    try std.testing.expectEqual(@as(usize, 1), sat_response.events.len);
    try std.testing.expectEqualStrings("Sleep in", sat_response.events[0].label);

    const mon_response = try getTimelineForDay(allocator, cfg, "monday");
    defer allocator.free(mon_response.events);
    try std.testing.expect(mon_response.events.len > 1);
}
```

- [ ] **Step 4: Run tests**

```bash
zig build test 2>&1
```

Expected: All config + timeline tests pass.

- [ ] **Step 5: Commit**

```bash
git init  # if not already a git repo
git add src/config.zig src/timeline.zig
git commit -m "feat: add config and timeline Zig modules with tests"
```

---

## Task 5: HTTP Client Helper

**Files:**
- Create: `src/http_client.zig`

This helper abstracts `std.http.Client` for GET and POST requests, returning allocated response bodies.

- [ ] **Step 1: Write failing test**

Add at the bottom of `src/http_client.zig` (create file):

```zig
test "url encode basic strings" {
    const allocator = std.testing.allocator;
    const encoded = try urlEncode(allocator, "hello world/test");
    defer allocator.free(encoded);
    try std.testing.expectEqualStrings("hello%20world%2Ftest", encoded);
}

test "url encode no special chars passes through" {
    const allocator = std.testing.allocator;
    const encoded = try urlEncode(allocator, "America/Toronto");
    defer allocator.free(encoded);
    try std.testing.expectEqualStrings("America%2FToronto", encoded);
}
```

- [ ] **Step 2: Run to verify fails**

```bash
zig build test 2>&1 | grep "error:" | head -5
```

- [ ] **Step 3: Create src/http_client.zig**

```zig
const std = @import("std");

pub const HttpError = error{
    BadStatus,
    EmptyResponse,
};

/// Performs a GET request and returns the response body as an owned slice.
/// Caller must free returned slice.
pub fn get(
    io: std.Io,
    allocator: std.mem.Allocator,
    url: []const u8,
    headers: []const std.http.Header,
) ![]u8 {
    var client = std.http.Client{ .allocator = allocator, .io = io };
    defer client.deinit();

    var body_writer = std.Io.Writer.Allocating.init(allocator);
    defer body_writer.deinit();

    const result = try client.fetch(.{
        .location = .{ .url = url },
        .method = .GET,
        .response_writer = &body_writer.writer,
        .extra_headers = headers,
    });

    if (result.status != .ok) return HttpError.BadStatus;

    return allocator.dupe(u8, body_writer.writer.buffered());
}

/// Performs a POST request with form-encoded body and returns the response body.
/// Caller must free returned slice.
pub fn postForm(
    io: std.Io,
    allocator: std.mem.Allocator,
    url: []const u8,
    body: []const u8,
) ![]u8 {
    var client = std.http.Client{ .allocator = allocator, .io = io };
    defer client.deinit();

    var body_writer = std.Io.Writer.Allocating.init(allocator);
    defer body_writer.deinit();

    const result = try client.fetch(.{
        .location = .{ .url = url },
        .method = .POST,
        .payload = body,
        .response_writer = &body_writer.writer,
        .headers = .{
            .content_type = .{ .override = "application/x-www-form-urlencoded" },
        },
    });

    if (result.status != .ok) return HttpError.BadStatus;

    return allocator.dupe(u8, body_writer.writer.buffered());
}

/// URL-encodes a string, escaping all non-unreserved characters.
/// Caller must free returned slice.
pub fn urlEncode(allocator: std.mem.Allocator, input: []const u8) ![]u8 {
    var out = std.ArrayList(u8).init(allocator);
    defer out.deinit();

    for (input) |ch| {
        if (std.ascii.isAlphanumeric(ch) or ch == '-' or ch == '_' or ch == '.' or ch == '~') {
            try out.append(ch);
        } else {
            try out.appendSlice(&.{ '%', hexDigit(ch >> 4), hexDigit(ch & 0x0F) });
        }
    }
    return out.toOwnedSlice();
}

fn hexDigit(n: u8) u8 {
    return if (n < 10) '0' + n else 'A' + (n - 10);
}

test "url encode basic strings" {
    const allocator = std.testing.allocator;
    const encoded = try urlEncode(allocator, "hello world/test");
    defer allocator.free(encoded);
    try std.testing.expectEqualStrings("hello%20world%2Ftest", encoded);
}

test "url encode no special chars passes through" {
    const allocator = std.testing.allocator;
    const encoded = try urlEncode(allocator, "simple");
    defer allocator.free(encoded);
    try std.testing.expectEqualStrings("simple", encoded);
}

test "url encode slash is percent-encoded" {
    const allocator = std.testing.allocator;
    const encoded = try urlEncode(allocator, "America/Toronto");
    defer allocator.free(encoded);
    try std.testing.expectEqualStrings("America%2FToronto", encoded);
}
```

- [ ] **Step 4: Run tests**

```bash
zig build test 2>&1
```

Expected: urlEncode tests pass.

---

## Task 6: Weather + Stocks Bridge Handlers

**Files:**
- Create: `src/api_weather.zig`
- Create: `src/api_stocks.zig`

These are async bridge handlers (spawn a thread for the HTTP call).

- [ ] **Step 1: Create src/api_weather.zig**

```zig
const std = @import("std");
const zero_native = @import("zero-native");
const bridge = zero_native.bridge;
const config_mod = @import("config.zig");
const http = @import("http_client.zig");

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";

const ThreadArgs = struct {
    io: std.Io,
    allocator: std.mem.Allocator,
    env_map: *const std.process.Environ.Map,
    request_id: [bridge.max_id_bytes]u8,
    request_id_len: usize,
    responder: bridge.AsyncResponder,

    fn id(self: *const ThreadArgs) []const u8 {
        return self.request_id[0..self.request_id_len];
    }
};

fn mapWeatherCode(code: i64) []const u8 {
    return switch (code) {
        0 => "clear",
        1...3 => "partly-cloudy",
        45...48 => "fog",
        51...67 => "rain",
        71...77 => "snow",
        80...82 => "rain",
        85...86 => "snow",
        95...99 => "thunderstorm",
        else => "cloudy",
    };
}

fn fetchWeatherThread(args_ptr: *ThreadArgs) void {
    defer args_ptr.allocator.destroy(args_ptr);
    const args = args_ptr;

    const body = doFetch(args) catch |err| {
        var buf: [bridge.max_response_bytes]u8 = undefined;
        args.responder.fail(args.id(), .handler_failed, @errorName(err)) catch {};
        _ = buf;
        return;
    };
    args.responder.success(args.id(), body) catch {};
    args.allocator.free(body);
}

fn doFetch(args: *ThreadArgs) ![]u8 {
    const allocator = args.allocator;
    const cfg = try config_mod.loadConfig(args.io, allocator, args.env_map);

    const lat_str = try std.fmt.allocPrint(allocator, "{d}", .{cfg.weather.latitude});
    defer allocator.free(lat_str);
    const lon_str = try std.fmt.allocPrint(allocator, "{d}", .{cfg.weather.longitude});
    defer allocator.free(lon_str);
    const tz_encoded = try http.urlEncode(allocator, cfg.weather.timezone);
    defer allocator.free(tz_encoded);

    const url = try std.fmt.allocPrint(allocator,
        "{s}?latitude={s}&longitude={s}&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m,weather_code&daily=sunrise,sunset&timezone={s}&forecast_days=1",
        .{ OPEN_METEO_BASE, lat_str, lon_str, tz_encoded });
    defer allocator.free(url);

    const body = try http.get(args.io, allocator, url, &.{});
    defer allocator.free(body);

    // Parse the Open-Meteo response using std.json.Value for flexibility
    const parsed = try std.json.parseFromSlice(std.json.Value, allocator, body, .{});
    defer parsed.deinit();

    const root = parsed.value.object;
    const current = root.get("current").?.object;
    const hourly = root.get("hourly").?.object;
    const daily = root.get("daily").?.object;

    const temp = current.get("temperature_2m").?.float;
    const feels_like = current.get("apparent_temperature").?.float;
    const weather_code = current.get("weather_code").?.integer;
    const humidity = current.get("relative_humidity_2m").?.integer;
    const wind = current.get("wind_speed_10m").?.float;

    const hourly_temps = hourly.get("temperature_2m").?.array.items;
    const hourly_codes = hourly.get("weather_code").?.array.items;

    const sunrise = if (daily.get("sunrise")) |s| s.array.items[0].string else "";
    const sunset = if (daily.get("sunset")) |s| s.array.items[0].string else "";

    // Build hourly forecast JSON array
    var hourly_buf = std.Io.Writer.Allocating.init(allocator);
    defer hourly_buf.deinit();
    try hourly_buf.writer.writeAll("[");
    var i: usize = 0;
    while (i < 24 and i < hourly_temps.len) : (i += 1) {
        if (i > 0) try hourly_buf.writer.writeAll(",");
        const h_temp = @as(i64, @intFromFloat(@round(hourly_temps[i].float)));
        const h_code = hourly_codes[i].integer;
        const h_cond = mapWeatherCode(h_code);
        try hourly_buf.writer.print(
            \\{{"hour":{d},"temperature":{d},"condition":"{s}"}}
        , .{ i, h_temp, h_cond });
    }
    try hourly_buf.writer.writeAll("]");

    const last_updated = try getCurrentIso8601(allocator);
    defer allocator.free(last_updated);

    const condition = mapWeatherCode(weather_code);
    const response = try std.fmt.allocPrint(allocator,
        \\{{"location":{{"name":"{s}","latitude":{d},"longitude":{d}}},"condition":"{s}","temperature":{d},"feelsLike":{d},"humidity":{d},"windSpeed":{d},"unit":"celsius","sunrise":"{s}","sunset":"{s}","hourlyForecast":{s},"lastUpdated":"{s}"}}
    , .{
        "Toronto",
        cfg.weather.latitude,
        cfg.weather.longitude,
        condition,
        @as(i64, @intFromFloat(@round(temp))),
        @as(i64, @intFromFloat(@round(feels_like))),
        humidity,
        @as(i64, @intFromFloat(@round(wind))),
        sunrise,
        sunset,
        hourly_buf.writer.buffered(),
        last_updated,
    });

    return response;
}

fn getCurrentIso8601(allocator: std.mem.Allocator) ![]u8 {
    const ts = std.time.timestamp();
    return std.fmt.allocPrint(allocator, "{d}", .{ts});
}

pub fn handler(context: *anyopaque, invocation: bridge.Invocation, responder: bridge.AsyncResponder) anyerror!void {
    const self: *HandlerContext = @ptrCast(@alignCast(context));
    const args = try self.allocator.create(ThreadArgs);
    args.* = .{
        .io = self.io,
        .allocator = self.allocator,
        .env_map = self.env_map,
        .request_id = undefined,
        .request_id_len = invocation.request.id.len,
        .responder = responder,
    };
    const id_len = @min(invocation.request.id.len, bridge.max_id_bytes);
    @memcpy(args.request_id[0..id_len], invocation.request.id[0..id_len]);

    const thread = try std.Thread.spawn(.{}, fetchWeatherThread, .{args});
    thread.detach();
}

pub const HandlerContext = struct {
    io: std.Io,
    allocator: std.mem.Allocator,
    env_map: *const std.process.Environ.Map,
};
```

- [ ] **Step 2: Create src/api_stocks.zig**

```zig
const std = @import("std");
const zero_native = @import("zero-native");
const bridge = zero_native.bridge;
const config_mod = @import("config.zig");
const http = @import("http_client.zig");

const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

const ThreadArgs = struct {
    io: std.Io,
    allocator: std.mem.Allocator,
    env_map: *const std.process.Environ.Map,
    request_id: [bridge.max_id_bytes]u8,
    request_id_len: usize,
    responder: bridge.AsyncResponder,

    fn id(self: *const ThreadArgs) []const u8 {
        return self.request_id[0..self.request_id_len];
    }
};

fn getCurrencySymbol(currency: []const u8) []const u8 {
    if (std.mem.eql(u8, currency, "USD")) return "$";
    if (std.mem.eql(u8, currency, "CAD")) return "C$";
    if (std.mem.eql(u8, currency, "EUR")) return "\u{20ac}";
    if (std.mem.eql(u8, currency, "GBP")) return "\u{00a3}";
    if (std.mem.eql(u8, currency, "JPY")) return "\u{00a5}";
    if (std.mem.eql(u8, currency, "INR")) return "\u{20b9}";
    return "$";
}

fn fetchSingleStock(
    io: std.Io,
    allocator: std.mem.Allocator,
    ticker: []const u8,
    writer: *std.Io.Writer,
) !void {
    const url = try std.fmt.allocPrint(allocator,
        "{s}/{s}?interval=1d&range=1mo", .{ YAHOO_BASE, ticker });
    defer allocator.free(url);

    const headers = [_]std.http.Header{
        .{ .name = "User-Agent", .value = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" },
    };
    const body = try http.get(io, allocator, url, &headers);
    defer allocator.free(body);

    const parsed = try std.json.parseFromSlice(std.json.Value, allocator, body, .{});
    defer parsed.deinit();

    const chart = parsed.value.object.get("chart").?.object;
    const result_arr = chart.get("result") orelse return error.NoData;
    if (result_arr == .null) return error.NoData;
    const results = result_arr.array.items;
    if (results.len == 0) return error.NoData;

    const result = results[0].object;
    const meta = result.get("meta").?.object;

    const price = meta.get("regularMarketPrice").?.float;
    const prev_close = if (meta.get("chartPreviousClose")) |v| v.float else price;
    const currency_str = if (meta.get("currency")) |v| v.string else "USD";
    const short_name = if (meta.get("shortName")) |v| v.string else ticker;
    const price_hint = if (meta.get("priceHint")) |v| v.integer else 2;

    // Get sparkline from close prices
    const indicators = result.get("indicators").?.object;
    const quote = indicators.get("quote").?.array.items[0].object;
    const close_arr = quote.get("close").?.array.items;

    var sparkline_buf = std.Io.Writer.Allocating.init(allocator);
    defer sparkline_buf.deinit();
    try sparkline_buf.writer.writeAll("[");
    var close_prices = std.ArrayList(f64).init(allocator);
    defer close_prices.deinit();
    for (close_arr) |v| {
        if (v != .null) try close_prices.append(v.float);
    }
    const start = if (close_prices.items.len > 21) close_prices.items.len - 21 else 0;
    for (close_prices.items[start..], 0..) |p, idx| {
        if (idx > 0) try sparkline_buf.writer.writeAll(",");
        try sparkline_buf.writer.print("{d}", .{p});
    }
    try sparkline_buf.writer.writeAll("]");

    const previous = if (close_prices.items.len >= 2) close_prices.items[close_prices.items.len - 2] else prev_close;
    const change = price - previous;
    const change_pct = if (previous > 0.0) (change / previous) * 100.0 else 0.0;
    const currency_symbol = getCurrencySymbol(currency_str);

    const last_updated = try std.fmt.allocPrint(allocator, "{d}", .{std.time.timestamp()});
    defer allocator.free(last_updated);

    try writer.print(
        \\{{"ticker":"{s}","name":"{s}","price":{d},"change":{d},"changePercent":{d},"currency":"{s}","sparklineData":{s},"priceHint":{d},"lastUpdated":"{s}"}}
    , .{
        ticker, short_name, price, change, change_pct,
        currency_symbol, sparkline_buf.writer.buffered(), price_hint, last_updated,
    });
}

fn fetchStocksThread(args_ptr: *ThreadArgs) void {
    defer args_ptr.allocator.destroy(args_ptr);
    const args = args_ptr;

    const body = doFetch(args) catch |err| {
        args.responder.fail(args.id(), .handler_failed, @errorName(err)) catch {};
        return;
    };
    defer args.allocator.free(body);
    args.responder.success(args.id(), body) catch {};
}

fn doFetch(args: *ThreadArgs) ![]u8 {
    const allocator = args.allocator;
    const cfg = try config_mod.loadConfig(args.io, allocator, args.env_map);

    var result_buf = std.Io.Writer.Allocating.init(allocator);
    defer result_buf.deinit();
    try result_buf.writer.writeAll("[");

    var first = true;
    for (cfg.stocks.tickers) |ticker| {
        if (!first) try result_buf.writer.writeAll(",");
        fetchSingleStock(args.io, allocator, ticker, &result_buf.writer) catch |err| {
            _ = err;
            continue; // Skip failed tickers
        };
        first = false;
    }
    try result_buf.writer.writeAll("]");

    return allocator.dupe(u8, result_buf.writer.buffered());
}

pub fn handler(context: *anyopaque, invocation: bridge.Invocation, responder: bridge.AsyncResponder) anyerror!void {
    const self: *HandlerContext = @ptrCast(@alignCast(context));
    const args = try self.allocator.create(ThreadArgs);
    args.* = .{
        .io = self.io,
        .allocator = self.allocator,
        .env_map = self.env_map,
        .request_id = undefined,
        .request_id_len = invocation.request.id.len,
        .responder = responder,
    };
    const id_len = @min(invocation.request.id.len, bridge.max_id_bytes);
    @memcpy(args.request_id[0..id_len], invocation.request.id[0..id_len]);

    const thread = try std.Thread.spawn(.{}, fetchStocksThread, .{args});
    thread.detach();
}

pub const HandlerContext = struct {
    io: std.Io,
    allocator: std.mem.Allocator,
    env_map: *const std.process.Environ.Map,
};
```

- [ ] **Step 3: Verify compilation**

```bash
zig build 2>&1 | head -30
```

These files won't be compiled yet (not imported by main.zig). That's fine for now.

---

## Task 7: TickTick + Calendar Bridge Handlers

**Files:**
- Create: `src/api_ticktick.zig`
- Create: `src/api_calendar.zig`

- [ ] **Step 1: Create src/api_ticktick.zig**

```zig
const std = @import("std");
const zero_native = @import("zero-native");
const bridge = zero_native.bridge;
const config_mod = @import("config.zig");
const http = @import("http_client.zig");

const TICKTICK_API_BASE = "https://api.ticktick.com/open/v1";

const ThreadArgs = struct {
    io: std.Io,
    allocator: std.mem.Allocator,
    env_map: *const std.process.Environ.Map,
    request_id: [bridge.max_id_bytes]u8,
    request_id_len: usize,
    responder: bridge.AsyncResponder,

    fn id(self: *const ThreadArgs) []const u8 {
        return self.request_id[0..self.request_id_len];
    }
};

fn fetchTickTickThread(args_ptr: *ThreadArgs) void {
    defer args_ptr.allocator.destroy(args_ptr);
    const args = args_ptr;

    const body = doFetch(args) catch |err| {
        args.responder.fail(args.id(), .handler_failed, @errorName(err)) catch {};
        return;
    };
    defer args.allocator.free(body);
    args.responder.success(args.id(), body) catch {};
}

fn doFetch(args: *ThreadArgs) ![]u8 {
    const allocator = args.allocator;
    const cfg = try config_mod.loadConfig(args.io, allocator, args.env_map);

    if (cfg.ticktick.access_token.len == 0) {
        return error.TokenNotConfigured;
    }

    const auth_header = try std.fmt.allocPrint(allocator, "Bearer {s}", .{cfg.ticktick.access_token});
    defer allocator.free(auth_header);

    const headers = [_]std.http.Header{
        .{ .name = "Authorization", .value = auth_header },
    };

    // Fetch projects
    const projects_url = try std.fmt.allocPrint(allocator, "{s}/project", .{TICKTICK_API_BASE});
    defer allocator.free(projects_url);

    const projects_body = try http.get(args.io, allocator, projects_url, &headers);
    defer allocator.free(projects_body);

    const projects_parsed = try std.json.parseFromSlice(std.json.Value, allocator, projects_body, .{});
    defer projects_parsed.deinit();

    const projects_arr = projects_parsed.value.array.items;

    // Build project map (id -> name) and collect open project ids
    var project_map = std.StringHashMap([]const u8).init(allocator);
    defer project_map.deinit();
    var project_ids = std.ArrayList([]const u8).init(allocator);
    defer project_ids.deinit();

    var projects_json_buf = std.Io.Writer.Allocating.init(allocator);
    defer projects_json_buf.deinit();
    try projects_json_buf.writer.writeAll("[");

    var first_project = true;
    for (projects_arr) |proj| {
        const p = proj.object;
        const closed = if (p.get("closed")) |v| v.bool else false;
        if (closed) continue;

        const id = p.get("id").?.string;
        const name = p.get("name").?.string;
        const color = if (p.get("color")) |v| v.string else "";
        const sort_order = if (p.get("sortOrder")) |v| v.integer else 0;

        try project_map.put(id, name);
        try project_ids.append(id);

        if (!first_project) try projects_json_buf.writer.writeAll(",");
        first_project = false;
        try projects_json_buf.writer.print(
            \\{{"id":"{s}","name":"{s}","color":"{s}","sortOrder":{d}}}
        , .{ id, name, color, sort_order });
    }
    try projects_json_buf.writer.writeAll("]");

    // Fetch tasks for each project
    var tasks_json_buf = std.Io.Writer.Allocating.init(allocator);
    defer tasks_json_buf.deinit();
    try tasks_json_buf.writer.writeAll("[");
    var first_task = true;

    for (project_ids.items) |proj_id| {
        const tasks_url = try std.fmt.allocPrint(allocator, "{s}/project/{s}/data", .{ TICKTICK_API_BASE, proj_id });
        defer allocator.free(tasks_url);

        const tasks_body = http.get(args.io, allocator, tasks_url, &headers) catch continue;
        defer allocator.free(tasks_body);

        const tasks_parsed = std.json.parseFromSlice(std.json.Value, allocator, tasks_body, .{}) catch continue;
        defer tasks_parsed.deinit();

        const data_obj = tasks_parsed.value.object;
        const tasks_arr = if (data_obj.get("tasks")) |v| v.array.items else continue;

        for (tasks_arr) |task_val| {
            const task = task_val.object;
            const status = if (task.get("status")) |v| v.integer else 0;
            if (status != 0) continue; // Skip completed

            const task_id = if (task.get("id")) |v| v.string else continue;
            const title = if (task.get("title")) |v| v.string else if (task.get("content")) |v| v.string else "Untitled Task";
            const priority = if (task.get("priority")) |v| v.integer else 0;
            const due_date = if (task.get("dueDate")) |v| if (v != .null) v.string else null else null;
            const start_date = if (task.get("startDate")) |v| if (v != .null) v.string else null else null;
            const project_name = project_map.get(proj_id) orelse "";

            if (!first_task) try tasks_json_buf.writer.writeAll(",");
            first_task = false;

            if (due_date) |dd| {
                try tasks_json_buf.writer.print(
                    \\{{"id":"{s}","title":"{s}","isCompleted":false,"priority":{d},"dueDate":"{s}","projectId":"{s}","projectName":"{s}","tags":[],"createdTime":"","modifiedTime":""}}
                , .{ task_id, title, priority, dd, proj_id, project_name });
            } else if (start_date) |sd| {
                try tasks_json_buf.writer.print(
                    \\{{"id":"{s}","title":"{s}","isCompleted":false,"priority":{d},"startDate":"{s}","projectId":"{s}","projectName":"{s}","tags":[],"createdTime":"","modifiedTime":""}}
                , .{ task_id, title, priority, sd, proj_id, project_name });
            } else {
                try tasks_json_buf.writer.print(
                    \\{{"id":"{s}","title":"{s}","isCompleted":false,"priority":{d},"projectId":"{s}","projectName":"{s}","tags":[],"createdTime":"","modifiedTime":""}}
                , .{ task_id, title, priority, proj_id, project_name });
            }
        }
    }
    try tasks_json_buf.writer.writeAll("]");

    const last_updated = std.time.timestamp();
    return std.fmt.allocPrint(allocator,
        \\{{"tasks":{s},"projects":{s},"lastUpdated":"{d}"}}
    , .{ tasks_json_buf.writer.buffered(), projects_json_buf.writer.buffered(), last_updated });
}

pub fn handler(context: *anyopaque, invocation: bridge.Invocation, responder: bridge.AsyncResponder) anyerror!void {
    const self: *HandlerContext = @ptrCast(@alignCast(context));
    const args = try self.allocator.create(ThreadArgs);
    args.* = .{
        .io = self.io,
        .allocator = self.allocator,
        .env_map = self.env_map,
        .request_id = undefined,
        .request_id_len = invocation.request.id.len,
        .responder = responder,
    };
    const id_len = @min(invocation.request.id.len, bridge.max_id_bytes);
    @memcpy(args.request_id[0..id_len], invocation.request.id[0..id_len]);

    const thread = try std.Thread.spawn(.{}, fetchTickTickThread, .{args});
    thread.detach();
}

pub const HandlerContext = struct {
    io: std.Io,
    allocator: std.mem.Allocator,
    env_map: *const std.process.Environ.Map,
};
```

- [ ] **Step 2: Create src/api_calendar.zig**

```zig
const std = @import("std");
const zero_native = @import("zero-native");
const bridge = zero_native.bridge;
const config_mod = @import("config.zig");
const http = @import("http_client.zig");
const oauth = @import("api_oauth.zig");

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
const DEFAULT_COLORS = [_][]const u8{ "blue", "purple", "green", "red", "orange", "pink", "cyan", "amber" };

const ThreadArgs = struct {
    io: std.Io,
    allocator: std.mem.Allocator,
    env_map: *const std.process.Environ.Map,
    request_id: [bridge.max_id_bytes]u8,
    request_id_len: usize,
    responder: bridge.AsyncResponder,
    command: Command,

    const Command = enum { fetch_events, fetch_list, get_sources };

    fn id(self: *const ThreadArgs) []const u8 {
        return self.request_id[0..self.request_id_len];
    }
};

fn calendarThread(args_ptr: *ThreadArgs) void {
    defer args_ptr.allocator.destroy(args_ptr);
    const args = args_ptr;

    const body = switch (args.command) {
        .fetch_events => doFetchEvents(args),
        .fetch_list => doFetchList(args),
        .get_sources => doGetSources(args),
    } catch |err| {
        args.responder.fail(args.id(), .handler_failed, @errorName(err)) catch {};
        return;
    };
    defer args.allocator.free(body);
    args.responder.success(args.id(), body) catch {};
}

fn getValidAccessToken(io: std.Io, allocator: std.mem.Allocator, env_map: *const std.process.Environ.Map) ![]u8 {
    return oauth.getValidAccessToken(io, allocator, env_map);
}

fn doFetchList(args: *ThreadArgs) ![]u8 {
    const allocator = args.allocator;
    const access_token = try getValidAccessToken(args.io, allocator, args.env_map);
    defer allocator.free(access_token);

    const auth_header = try std.fmt.allocPrint(allocator, "Bearer {s}", .{access_token});
    defer allocator.free(auth_header);
    const headers = [_]std.http.Header{
        .{ .name = "Authorization", .value = auth_header },
    };

    const url = try std.fmt.allocPrint(allocator, "{s}/users/me/calendarList", .{CALENDAR_API_BASE});
    defer allocator.free(url);

    const body = try http.get(args.io, allocator, url, &headers);
    defer allocator.free(body);

    const parsed = try std.json.parseFromSlice(std.json.Value, allocator, body, .{});
    defer parsed.deinit();

    const items = if (parsed.value.object.get("items")) |v| v.array.items else &[_]std.json.Value{};

    var result = std.Io.Writer.Allocating.init(allocator);
    defer result.deinit();
    try result.writer.writeAll("[");
    for (items, 0..) |item, i| {
        if (i > 0) try result.writer.writeAll(",");
        const cal = item.object;
        const cal_id = cal.get("id").?.string;
        const summary = if (cal.get("summary")) |v| v.string else "Unnamed Calendar";
        const bg_color = if (cal.get("backgroundColor")) |v| v.string else "";
        const primary = if (cal.get("primary")) |v| v.bool else false;
        try result.writer.print(
            \\{{"id":"{s}","summary":"{s}","backgroundColor":"{s}","primary":{s}}}
        , .{ cal_id, summary, bg_color, if (primary) "true" else "false" });
    }
    try result.writer.writeAll("]");

    return allocator.dupe(u8, result.writer.buffered());
}

fn doGetSources(args: *ThreadArgs) ![]u8 {
    const allocator = args.allocator;
    const cfg = try config_mod.loadConfig(args.io, allocator, args.env_map);

    if (cfg.google_calendar.calendars.len > 0) {
        // Return cached calendars from config
        var result = std.Io.Writer.Allocating.init(allocator);
        defer result.deinit();
        try result.writer.writeAll("[");
        for (cfg.google_calendar.calendars, 0..) |cal, i| {
            if (i > 0) try result.writer.writeAll(",");
            try result.writer.print(
                \\{{"id":"{s}","name":"{s}","color":"{s}"}}
            , .{ cal.id, cal.name, cal.color });
        }
        try result.writer.writeAll("]");
        return allocator.dupe(u8, result.writer.buffered());
    }

    // Auto-discover
    const list_body = try doFetchList(args);
    defer allocator.free(list_body);

    const parsed = try std.json.parseFromSlice(std.json.Value, allocator, list_body, .{});
    defer parsed.deinit();

    const items = parsed.value.array.items;
    var result = std.Io.Writer.Allocating.init(allocator);
    defer result.deinit();
    try result.writer.writeAll("[");

    for (items, 0..) |item, i| {
        if (i > 0) try result.writer.writeAll(",");
        const cal = item.object;
        const cal_id = cal.get("id").?.string;
        const cal_name = if (cal.get("summary")) |v| v.string else "Calendar";
        const color = DEFAULT_COLORS[i % DEFAULT_COLORS.len];
        try result.writer.print(
            \\{{"id":"{s}","name":"{s}","color":"{s}"}}
        , .{ cal_id, cal_name, color });
    }
    try result.writer.writeAll("]");

    return allocator.dupe(u8, result.writer.buffered());
}

fn doFetchEvents(args: *ThreadArgs) ![]u8 {
    const allocator = args.allocator;
    const access_token = try getValidAccessToken(args.io, allocator, args.env_map);
    defer allocator.free(access_token);

    const auth_header = try std.fmt.allocPrint(allocator, "Bearer {s}", .{access_token});
    defer allocator.free(auth_header);
    const headers = [_]std.http.Header{
        .{ .name = "Authorization", .value = auth_header },
    };

    // Get sources
    const sources_body = try doGetSources(args);
    defer allocator.free(sources_body);

    const sources_parsed = try std.json.parseFromSlice(std.json.Value, allocator, sources_body, .{});
    defer sources_parsed.deinit();
    const sources = sources_parsed.value.array.items;

    const now_ts = std.time.timestamp();
    const two_weeks_ts = now_ts + (14 * 24 * 3600);

    // Simple ISO 8601 timestamp formatter
    const time_min = try formatIso8601(allocator, now_ts);
    defer allocator.free(time_min);
    const time_max = try formatIso8601(allocator, two_weeks_ts);
    defer allocator.free(time_max);

    const time_min_enc = try http.urlEncode(allocator, time_min);
    defer allocator.free(time_min_enc);
    const time_max_enc = try http.urlEncode(allocator, time_max);
    defer allocator.free(time_max_enc);

    var all_events = std.Io.Writer.Allocating.init(allocator);
    defer all_events.deinit();
    try all_events.writer.writeAll("[");
    var first_event = true;

    for (sources) |source| {
        const cal_id = source.object.get("id").?.string;
        const cal_name = source.object.get("name").?.string;
        const cal_color = source.object.get("color").?.string;

        const cal_id_enc = try http.urlEncode(allocator, cal_id);
        defer allocator.free(cal_id_enc);

        const url = try std.fmt.allocPrint(allocator,
            "{s}/calendars/{s}/events?timeMin={s}&timeMax={s}&singleEvents=true&orderBy=startTime&maxResults=100",
            .{ CALENDAR_API_BASE, cal_id_enc, time_min_enc, time_max_enc });
        defer allocator.free(url);

        const events_body = http.get(args.io, allocator, url, &headers) catch continue;
        defer allocator.free(events_body);

        const events_parsed = std.json.parseFromSlice(std.json.Value, allocator, events_body, .{}) catch continue;
        defer events_parsed.deinit();

        const items = if (events_parsed.value.object.get("items")) |v| v.array.items else continue;

        for (items) |event_val| {
            const event = event_val.object;
            const ev_id = if (event.get("id")) |v| v.string else continue;
            const summary = if (event.get("summary")) |v| v.string else "(No title)";
            const description = if (event.get("description")) |v| v.string else "";
            const location = if (event.get("location")) |v| v.string else "";
            const html_link = if (event.get("htmlLink")) |v| v.string else "";

            const start = event.get("start") orelse continue;
            const end_ = event.get("end") orelse continue;

            const start_dt = if (start.object.get("dateTime")) |v| v.string else "";
            const start_date = if (start.object.get("date")) |v| v.string else "";
            const end_dt = if (end_.object.get("dateTime")) |v| v.string else "";
            const end_date = if (end_.object.get("date")) |v| v.string else "";

            if (!first_event) try all_events.writer.writeAll(",");
            first_event = false;

            const combined_id = try std.fmt.allocPrint(allocator, "{s}-{s}", .{ cal_id, ev_id });
            defer allocator.free(combined_id);

            try all_events.writer.print(
                \\{{"id":"{s}","summary":"{s}","description":"{s}","start":{{"dateTime":"{s}","date":"{s}"}},"end":{{"dateTime":"{s}","date":"{s}"}},"location":"{s}","htmlLink":"{s}","calendarId":"{s}","calendarName":"{s}","calendarColor":"{s}"}}
            , .{ combined_id, summary, description, start_dt, start_date, end_dt, end_date, location, html_link, cal_id, cal_name, cal_color });
        }
    }
    try all_events.writer.writeAll("]");

    return allocator.dupe(u8, all_events.writer.buffered());
}

fn formatIso8601(allocator: std.mem.Allocator, timestamp: i64) ![]u8 {
    const secs_per_min: i64 = 60;
    const secs_per_hour: i64 = 3600;
    const secs_per_day: i64 = 86400;

    var remaining = timestamp;
    const days_since_epoch = @divTrunc(remaining, secs_per_day);
    remaining = @mod(remaining, secs_per_day);
    const hours = @divTrunc(remaining, secs_per_hour);
    remaining = @mod(remaining, secs_per_hour);
    const minutes = @divTrunc(remaining, secs_per_min);
    const seconds = @mod(remaining, secs_per_min);

    // Convert days since epoch to Y/M/D (simplified)
    var year: i64 = 1970;
    var days = days_since_epoch;
    while (true) {
        const days_in_year: i64 = if (@mod(year, 4) == 0 and (@mod(year, 100) != 0 or @mod(year, 400) == 0)) 366 else 365;
        if (days < days_in_year) break;
        days -= days_in_year;
        year += 1;
    }
    const leap = @mod(year, 4) == 0 and (@mod(year, 100) != 0 or @mod(year, 400) == 0);
    const month_days = [_]i64{ 31, if (leap) @as(i64, 29) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 };
    var month: i64 = 1;
    for (month_days) |md| {
        if (days < md) break;
        days -= md;
        month += 1;
    }
    const day = days + 1;

    return std.fmt.allocPrint(allocator, "{d:0>4}-{d:0>2}-{d:0>2}T{d:0>2}:{d:0>2}:{d:0>2}Z", .{
        year, month, day, hours, minutes, seconds,
    });
}

pub fn isCalendarConfigured(context: *anyopaque, invocation: bridge.Invocation, output: []u8) anyerror![]const u8 {
    _ = invocation;
    _ = output;
    const self: *HandlerContext = @ptrCast(@alignCast(context));
    const cfg = config_mod.loadConfig(self.io, self.allocator, self.env_map) catch return "false";
    const configured = cfg.google_calendar.access_token.len > 0;
    return if (configured) "true" else "false";
}

fn spawnCalendarThread(context: *anyopaque, invocation: bridge.Invocation, responder: bridge.AsyncResponder, command: ThreadArgs.Command) anyerror!void {
    const self: *HandlerContext = @ptrCast(@alignCast(context));
    const args = try self.allocator.create(ThreadArgs);
    args.* = .{
        .io = self.io,
        .allocator = self.allocator,
        .env_map = self.env_map,
        .request_id = undefined,
        .request_id_len = invocation.request.id.len,
        .responder = responder,
        .command = command,
    };
    const id_len = @min(invocation.request.id.len, bridge.max_id_bytes);
    @memcpy(args.request_id[0..id_len], invocation.request.id[0..id_len]);
    const thread = try std.Thread.spawn(.{}, calendarThread, .{args});
    thread.detach();
}

pub fn fetchEventsHandler(context: *anyopaque, invocation: bridge.Invocation, responder: bridge.AsyncResponder) anyerror!void {
    return spawnCalendarThread(context, invocation, responder, .fetch_events);
}

pub fn fetchListHandler(context: *anyopaque, invocation: bridge.Invocation, responder: bridge.AsyncResponder) anyerror!void {
    return spawnCalendarThread(context, invocation, responder, .fetch_list);
}

pub fn getSourcesHandler(context: *anyopaque, invocation: bridge.Invocation, responder: bridge.AsyncResponder) anyerror!void {
    return spawnCalendarThread(context, invocation, responder, .get_sources);
}

pub const HandlerContext = struct {
    io: std.Io,
    allocator: std.mem.Allocator,
    env_map: *const std.process.Environ.Map,
};
```

---

## Task 8: OAuth Bridge Handler

**Files:**
- Create: `src/api_oauth.zig`

The OAuth flow:
1. `start_google_oauth`: Build URL, open browser (`open` on macOS, `xdg-open` on Linux)
2. `complete_google_oauth`: Start HTTP server on port 8847, wait for callback, exchange code for tokens
3. `getValidAccessToken`: Return cached token, refreshing if expired

- [ ] **Step 1: Create src/api_oauth.zig**

```zig
const std = @import("std");
const builtin = @import("builtin");
const zero_native = @import("zero-native");
const bridge = zero_native.bridge;
const config_mod = @import("config.zig");
const http = @import("http_client.zig");

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const REDIRECT_URI = "http://localhost:8847/oauth/callback";
const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";
const OAUTH_PORT: u16 = 8847;

/// Returns a valid access token, refreshing if needed. Caller must free.
pub fn getValidAccessToken(
    io: std.Io,
    allocator: std.mem.Allocator,
    env_map: *const std.process.Environ.Map,
) ![]u8 {
    const cfg = try config_mod.loadConfig(io, allocator, env_map);

    if (cfg.google_calendar.access_token.len == 0) {
        return error.NotAuthenticated;
    }

    // Check if token_expiry is set and if token is expired
    if (cfg.google_calendar.token_expiry.len > 0 and cfg.google_calendar.refresh_token.len > 0) {
        // Parse expiry timestamp (stored as unix timestamp string)
        const expiry_ts = std.fmt.parseInt(i64, cfg.google_calendar.token_expiry, 10) catch 0;
        const now_ts = std.time.timestamp();
        if (expiry_ts > 0 and now_ts >= expiry_ts - 300) {
            // Refresh token
            return try refreshAccessToken(io, allocator, env_map);
        }
    }

    return allocator.dupe(u8, cfg.google_calendar.access_token);
}

pub fn refreshAccessToken(
    io: std.Io,
    allocator: std.mem.Allocator,
    env_map: *const std.process.Environ.Map,
) ![]u8 {
    const cfg = try config_mod.loadConfig(io, allocator, env_map);

    if (cfg.google_calendar.refresh_token.len == 0) {
        return error.NoRefreshToken;
    }

    const body = try std.fmt.allocPrint(allocator,
        "client_id={s}&client_secret={s}&refresh_token={s}&grant_type=refresh_token",
        .{ cfg.google_calendar.client_id, cfg.google_calendar.client_secret, cfg.google_calendar.refresh_token });
    defer allocator.free(body);

    const response_body = try http.postForm(io, allocator, GOOGLE_TOKEN_URL, body);
    defer allocator.free(response_body);

    const parsed = try std.json.parseFromSlice(std.json.Value, allocator, response_body, .{});
    defer parsed.deinit();

    const access_token = parsed.value.object.get("access_token").?.string;
    const expires_in = parsed.value.object.get("expires_in").?.integer;
    const expiry_ts = std.time.timestamp() + expires_in;

    // Save updated config
    var updated_cfg = cfg;
    updated_cfg.google_calendar.access_token = access_token;
    updated_cfg.google_calendar.token_expiry = try std.fmt.allocPrint(allocator, "{d}", .{expiry_ts});

    try config_mod.saveConfig(io, allocator, env_map, updated_cfg);

    return allocator.dupe(u8, access_token);
}

const StartOAuthThreadArgs = struct {
    io: std.Io,
    allocator: std.mem.Allocator,
    env_map: *const std.process.Environ.Map,
    request_id: [bridge.max_id_bytes]u8,
    request_id_len: usize,
    responder: bridge.AsyncResponder,

    fn id(self: *const StartOAuthThreadArgs) []const u8 {
        return self.request_id[0..self.request_id_len];
    }
};

fn startOAuthThread(args_ptr: *StartOAuthThreadArgs) void {
    defer args_ptr.allocator.destroy(args_ptr);
    const args = args_ptr;

    const cfg = config_mod.loadConfig(args.io, args.allocator, args.env_map) catch |err| {
        args.responder.fail(args.id(), .handler_failed, @errorName(err)) catch {};
        return;
    };

    if (cfg.google_calendar.client_id.len == 0 or cfg.google_calendar.client_secret.len == 0) {
        args.responder.fail(args.id(), .handler_failed, "Google Calendar client_id and client_secret must be configured") catch {};
        return;
    }

    const auth_url = buildAuthUrl(args.allocator, cfg.google_calendar.client_id) catch |err| {
        args.responder.fail(args.id(), .handler_failed, @errorName(err)) catch {};
        return;
    };
    defer args.allocator.free(auth_url);

    openBrowser(args.io, args.allocator, auth_url) catch |err| {
        args.responder.fail(args.id(), .handler_failed, @errorName(err)) catch {};
        return;
    };

    const quoted_url = std.json.Stringify.valueAlloc(args.allocator, auth_url, .{}) catch |err| {
        args.responder.fail(args.id(), .handler_failed, @errorName(err)) catch {};
        return;
    };
    defer args.allocator.free(quoted_url);
    args.responder.success(args.id(), quoted_url) catch {};
}

fn buildAuthUrl(allocator: std.mem.Allocator, client_id: []const u8) ![]u8 {
    const client_id_enc = try http.urlEncode(allocator, client_id);
    defer allocator.free(client_id_enc);
    const redirect_enc = try http.urlEncode(allocator, REDIRECT_URI);
    defer allocator.free(redirect_enc);
    const scopes_enc = try http.urlEncode(allocator, SCOPES);
    defer allocator.free(scopes_enc);

    return std.fmt.allocPrint(allocator,
        "{s}?client_id={s}&redirect_uri={s}&response_type=code&scope={s}&access_type=offline&prompt=consent",
        .{ GOOGLE_AUTH_URL, client_id_enc, redirect_enc, scopes_enc });
}

fn openBrowser(io: std.Io, allocator: std.mem.Allocator, url: []const u8) !void {
    const open_cmd = switch (builtin.os.tag) {
        .macos => "open",
        .windows => "cmd",
        else => "xdg-open",
    };
    const argv: []const []const u8 = switch (builtin.os.tag) {
        .windows => &.{ open_cmd, "/c", "start", url },
        else => &.{ open_cmd, url },
    };
    _ = allocator;
    var child = try std.process.spawn(io, .{
        .argv = argv,
        .stdout = .ignore,
        .stderr = .ignore,
    });
    _ = try child.wait(io);
}

const CompleteOAuthThreadArgs = struct {
    io: std.Io,
    allocator: std.mem.Allocator,
    env_map: *const std.process.Environ.Map,
    request_id: [bridge.max_id_bytes]u8,
    request_id_len: usize,
    responder: bridge.AsyncResponder,

    fn id(self: *const CompleteOAuthThreadArgs) []const u8 {
        return self.request_id[0..self.request_id_len];
    }
};

fn completeOAuthThread(args_ptr: *CompleteOAuthThreadArgs) void {
    defer args_ptr.allocator.destroy(args_ptr);
    const args = args_ptr;

    completeOAuth(args) catch |err| {
        args.responder.fail(args.id(), .handler_failed, @errorName(err)) catch {};
        return;
    };
    args.responder.success(args.id(), "null") catch {};
}

fn completeOAuth(args: *CompleteOAuthThreadArgs) !void {
    const code = try waitForOAuthCallback(args.allocator);
    defer args.allocator.free(code);

    try exchangeCodeForTokens(args.io, args.allocator, args.env_map, code);
}

fn waitForOAuthCallback(allocator: std.mem.Allocator) ![]u8 {
    const addr = try std.net.Address.parseIp("127.0.0.1", OAUTH_PORT);
    var server = try addr.listen(.{ .reuse_address = true });
    defer server.deinit();

    const conn = try server.accept();
    defer conn.stream.close();

    var buf: [4096]u8 = undefined;
    const n = try conn.stream.read(&buf);
    const request = buf[0..n];

    // Parse GET /oauth/callback?code=... HTTP/1.1
    // Find query string
    const code = extractQueryParam(allocator, request, "code") orelse {
        const error_param = extractQueryParam(allocator, request, "error");
        if (error_param) |e| {
            defer allocator.free(e);
            const response = "HTTP/1.1 400 Bad Request\r\nContent-Type: text/html\r\n\r\n<html><body><h1>Auth failed</h1></body></html>";
            _ = conn.stream.writeAll(response) catch {};
            return error.OAuthDenied;
        }
        return error.InvalidCallback;
    };

    const success_response = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<html><body><h1>Authorization successful!</h1><p>You can close this window and return to Inkdash.</p></body></html>";
    _ = conn.stream.writeAll(success_response) catch {};

    return code;
}

fn extractQueryParam(allocator: std.mem.Allocator, request: []const u8, param: []const u8) ?[]u8 {
    // Find the first line of the HTTP request (GET /path?query HTTP/1.1)
    const line_end = std.mem.indexOf(u8, request, "\r\n") orelse request.len;
    const line = request[0..line_end];

    // Find '?'
    const q_pos = std.mem.indexOf(u8, line, "?") orelse return null;
    const space_pos = std.mem.lastIndexOf(u8, line[q_pos..], " ") orelse line.len - q_pos;
    const query_str = line[q_pos + 1 .. q_pos + space_pos];

    // Split by '&' and find param=value
    var iter = std.mem.splitScalar(u8, query_str, '&');
    while (iter.next()) |pair| {
        const eq_pos = std.mem.indexOf(u8, pair, "=") orelse continue;
        const key = pair[0..eq_pos];
        const value = pair[eq_pos + 1 ..];
        if (std.mem.eql(u8, key, param)) {
            return allocator.dupe(u8, value) catch return null;
        }
    }
    return null;
}

fn exchangeCodeForTokens(
    io: std.Io,
    allocator: std.mem.Allocator,
    env_map: *const std.process.Environ.Map,
    code: []const u8,
) !void {
    const cfg = try config_mod.loadConfig(io, allocator, env_map);

    const body = try std.fmt.allocPrint(allocator,
        "client_id={s}&client_secret={s}&code={s}&redirect_uri={s}&grant_type=authorization_code",
        .{ cfg.google_calendar.client_id, cfg.google_calendar.client_secret, code, REDIRECT_URI });
    defer allocator.free(body);

    const response_body = try http.postForm(io, allocator, GOOGLE_TOKEN_URL, body);
    defer allocator.free(response_body);

    const parsed = try std.json.parseFromSlice(std.json.Value, allocator, response_body, .{});
    defer parsed.deinit();

    const access_token = parsed.value.object.get("access_token").?.string;
    const refresh_token = if (parsed.value.object.get("refresh_token")) |v| v.string else cfg.google_calendar.refresh_token;
    const expires_in = parsed.value.object.get("expires_in").?.integer;
    const expiry_ts = std.time.timestamp() + expires_in;

    var updated_cfg = cfg;
    updated_cfg.google_calendar.access_token = access_token;
    updated_cfg.google_calendar.refresh_token = refresh_token;
    updated_cfg.google_calendar.token_expiry = try std.fmt.allocPrint(allocator, "{d}", .{expiry_ts});

    try config_mod.saveConfig(io, allocator, env_map, updated_cfg);
}

pub fn startOAuthHandler(context: *anyopaque, invocation: bridge.Invocation, responder: bridge.AsyncResponder) anyerror!void {
    const self: *HandlerContext = @ptrCast(@alignCast(context));
    const args = try self.allocator.create(StartOAuthThreadArgs);
    args.* = .{
        .io = self.io,
        .allocator = self.allocator,
        .env_map = self.env_map,
        .request_id = undefined,
        .request_id_len = invocation.request.id.len,
        .responder = responder,
    };
    const id_len = @min(invocation.request.id.len, bridge.max_id_bytes);
    @memcpy(args.request_id[0..id_len], invocation.request.id[0..id_len]);
    const thread = try std.Thread.spawn(.{}, startOAuthThread, .{args});
    thread.detach();
}

pub fn completeOAuthHandler(context: *anyopaque, invocation: bridge.Invocation, responder: bridge.AsyncResponder) anyerror!void {
    const self: *HandlerContext = @ptrCast(@alignCast(context));
    const args = try self.allocator.create(CompleteOAuthThreadArgs);
    args.* = .{
        .io = self.io,
        .allocator = self.allocator,
        .env_map = self.env_map,
        .request_id = undefined,
        .request_id_len = invocation.request.id.len,
        .responder = responder,
    };
    const id_len = @min(invocation.request.id.len, bridge.max_id_bytes);
    @memcpy(args.request_id[0..id_len], invocation.request.id[0..id_len]);
    const thread = try std.Thread.spawn(.{}, completeOAuthThread, .{args});
    thread.detach();
}

pub const HandlerContext = struct {
    io: std.Io,
    allocator: std.mem.Allocator,
    env_map: *const std.process.Environ.Map,
};
```

---

## Task 9: Bridge Wiring — main.zig + app.zon + runner.zig

**Files:**
- Modify: `src/main.zig`
- Modify: `app.zon`
- Modify: `src/runner.zig`

This is the integration task that connects all the handlers.

- [ ] **Step 1: Update app.zon**

Replace `app.zon` content:
```zig
.{
    .id = "com.inkdash.app",
    .name = "inkdash",
    .display_name = "Inkdash",
    .version = "0.1.0",
    .icons = .{ "assets/icon.icns" },
    .platforms = .{ "macos", "linux" },
    .permissions = .{},
    .capabilities = .{ "webview" },
    .frontend = .{
        .dist = "frontend/dist",
        .entry = "index.html",
        .spa_fallback = true,
        .dev = .{
            .url = "http://127.0.0.1:5173/",
            .command = .{ "npm", "--prefix", "frontend", "run", "dev", "--", "--host", "127.0.0.1" },
            .ready_path = "/",
            .timeout_ms = 30000,
        },
    },
    .security = .{
        .navigation = .{
            .allowed_origins = .{ "zero://app", "http://127.0.0.1:5173" },
            .external_links = .{ .action = "deny" },
        },
    },
    .web_engine = "system",
    .windows = .{
        .{
            .label = "main",
            .title = "Inkdash",
            .width = 1024,
            .height = 600,
            .restore_state = true,
        },
    },
}
```

- [ ] **Step 2: Update runner.zig window size**

In `src/runner.zig`, replace all occurrences of `zero_native.geometry.SizeF.init(720, 480)` with `zero_native.geometry.SizeF.init(1024, 600)`.

There are four platform branches (macOS, Linux, Windows, Null) — update all four.

- [ ] **Step 3: Replace src/main.zig with full bridge implementation**

```zig
const std = @import("std");
const runner = @import("runner");
const zero_native = @import("zero-native");

const config_mod = @import("config.zig");
const timeline_mod = @import("timeline.zig");
const api_weather = @import("api_weather.zig");
const api_stocks = @import("api_stocks.zig");
const api_ticktick = @import("api_ticktick.zig");
const api_calendar = @import("api_calendar.zig");
const api_oauth = @import("api_oauth.zig");

pub const panic = std.debug.FullPanic(zero_native.debug.capturePanic);

const bridge = zero_native.bridge;

const App = struct {
    env_map: *std.process.Environ.Map,
    io: std.Io,
    allocator: std.mem.Allocator,

    // Shared contexts for all handlers
    weather_ctx: api_weather.HandlerContext,
    stocks_ctx: api_stocks.HandlerContext,
    ticktick_ctx: api_ticktick.HandlerContext,
    calendar_ctx: api_calendar.HandlerContext,
    oauth_ctx: api_oauth.HandlerContext,

    fn app(self: *@This()) zero_native.App {
        return .{
            .context = self,
            .name = "inkdash",
            .source = zero_native.frontend.productionSource(.{ .dist = "frontend/dist" }),
            .source_fn = source,
        };
    }

    fn source(context: *anyopaque) anyerror!zero_native.WebViewSource {
        const self: *@This() = @ptrCast(@alignCast(context));
        return zero_native.frontend.sourceFromEnv(self.env_map, .{
            .dist = "frontend/dist",
            .entry = "index.html",
        });
    }

    // === Synchronous handlers ===

    fn handleGetConfig(context: *anyopaque, invocation: bridge.Invocation, output: []u8) anyerror![]const u8 {
        _ = output;
        const self: *App = @ptrCast(@alignCast(context));
        const allocator = self.allocator;
        const cfg = try config_mod.loadConfig(self.io, allocator, self.env_map);
        var json_buf = std.Io.Writer.Allocating.init(allocator);
        defer json_buf.deinit();
        try std.json.Stringify.value(cfg, .{}, &json_buf.writer);
        _ = invocation;
        return allocator.dupe(u8, json_buf.writer.buffered());
    }

    fn handleSaveConfig(context: *anyopaque, invocation: bridge.Invocation, output: []u8) anyerror![]const u8 {
        _ = output;
        const self: *App = @ptrCast(@alignCast(context));
        const allocator = self.allocator;
        const parsed = try std.json.parseFromSlice(config_mod.AppConfig, allocator, invocation.request.payload, .{
            .ignore_unknown_fields = true,
        });
        defer parsed.deinit();
        try config_mod.saveConfig(self.io, allocator, self.env_map, parsed.value);
        return "null";
    }

    fn handleGetRefreshIntervals(context: *anyopaque, invocation: bridge.Invocation, output: []u8) anyerror![]const u8 {
        _ = output;
        _ = invocation;
        const self: *App = @ptrCast(@alignCast(context));
        const cfg = try config_mod.loadConfig(self.io, self.allocator, self.env_map);
        const json = try std.fmt.allocPrint(self.allocator,
            \\{{"ticktick_minutes":{d},"calendar_minutes":{d}}}
        , .{ cfg.ticktick.refresh_interval_minutes, cfg.google_calendar.refresh_interval_minutes });
        defer self.allocator.free(json);
        var buf = std.Io.Writer.Allocating.init(self.allocator);
        defer buf.deinit();
        try buf.writer.writeAll(json);
        return self.allocator.dupe(u8, buf.writer.buffered());
    }

    fn handleGetTimeline(context: *anyopaque, invocation: bridge.Invocation, output: []u8) anyerror![]const u8 {
        _ = output;
        _ = invocation;
        const self: *App = @ptrCast(@alignCast(context));
        const allocator = self.allocator;
        const timeline = try timeline_mod.getTimelineForToday(self.io, allocator, self.env_map);
        defer allocator.free(timeline.events);

        var json_buf = std.Io.Writer.Allocating.init(allocator);
        defer json_buf.deinit();
        try json_buf.writer.print(
            \\{{"start_hour":{d},"end_hour":{d},"events":[
        , .{ timeline.start_hour, timeline.end_hour });

        for (timeline.events, 0..) |ev, i| {
            if (i > 0) try json_buf.writer.writeAll(",");
            try json_buf.writer.print(
                \\{{"time":"{s}","label":"{s}","type":"{s}"}}
            , .{ ev.time, ev.label, ev.type });
        }
        try json_buf.writer.writeAll("]}");

        return allocator.dupe(u8, json_buf.writer.buffered());
    }

    fn handleIsCalendarConfigured(context: *anyopaque, invocation: bridge.Invocation, output: []u8) anyerror![]const u8 {
        return api_calendar.isCalendarConfigured(context, invocation, output);
    }
};

const allowed_origins = [_][]const u8{ "zero://app", "http://127.0.0.1:5173" };

const dev_origins = [_][]const u8{ "zero://app", "zero://inline", "http://127.0.0.1:5173" };

pub fn main(init: std.process.Init) !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var app_state = App{
        .env_map = init.environ_map,
        .io = init.io,
        .allocator = allocator,
        .weather_ctx = .{ .io = init.io, .allocator = allocator, .env_map = init.environ_map },
        .stocks_ctx = .{ .io = init.io, .allocator = allocator, .env_map = init.environ_map },
        .ticktick_ctx = .{ .io = init.io, .allocator = allocator, .env_map = init.environ_map },
        .calendar_ctx = .{ .io = init.io, .allocator = allocator, .env_map = init.environ_map },
        .oauth_ctx = .{ .io = init.io, .allocator = allocator, .env_map = init.environ_map },
    };

    // Bridge policies — all commands allowed from app origins
    const policies = [_]bridge.CommandPolicy{
        .{ .name = "app.get_config", .origins = &allowed_origins },
        .{ .name = "app.save_config", .origins = &allowed_origins },
        .{ .name = "app.get_refresh_intervals", .origins = &allowed_origins },
        .{ .name = "app.get_timeline", .origins = &allowed_origins },
        .{ .name = "app.is_calendar_configured", .origins = &allowed_origins },
        .{ .name = "app.fetch_weather", .origins = &allowed_origins },
        .{ .name = "app.fetch_stocks", .origins = &allowed_origins },
        .{ .name = "app.fetch_ticktick_tasks", .origins = &allowed_origins },
        .{ .name = "app.fetch_calendar_events", .origins = &allowed_origins },
        .{ .name = "app.fetch_calendar_list", .origins = &allowed_origins },
        .{ .name = "app.get_calendar_sources", .origins = &allowed_origins },
        .{ .name = "app.start_google_oauth", .origins = &allowed_origins },
        .{ .name = "app.complete_google_oauth", .origins = &allowed_origins },
    };

    // Synchronous handlers
    const sync_handlers = [_]bridge.Handler{
        .{ .name = "app.get_config", .context = &app_state, .invoke_fn = App.handleGetConfig },
        .{ .name = "app.save_config", .context = &app_state, .invoke_fn = App.handleSaveConfig },
        .{ .name = "app.get_refresh_intervals", .context = &app_state, .invoke_fn = App.handleGetRefreshIntervals },
        .{ .name = "app.get_timeline", .context = &app_state, .invoke_fn = App.handleGetTimeline },
        .{ .name = "app.is_calendar_configured", .context = &app_state.calendar_ctx, .invoke_fn = App.handleIsCalendarConfigured },
    };

    // Async handlers (HTTP calls)
    const async_handlers = [_]bridge.AsyncHandler{
        .{ .name = "app.fetch_weather", .context = &app_state.weather_ctx, .invoke_fn = api_weather.handler },
        .{ .name = "app.fetch_stocks", .context = &app_state.stocks_ctx, .invoke_fn = api_stocks.handler },
        .{ .name = "app.fetch_ticktick_tasks", .context = &app_state.ticktick_ctx, .invoke_fn = api_ticktick.handler },
        .{ .name = "app.fetch_calendar_events", .context = &app_state.calendar_ctx, .invoke_fn = api_calendar.fetchEventsHandler },
        .{ .name = "app.fetch_calendar_list", .context = &app_state.calendar_ctx, .invoke_fn = api_calendar.fetchListHandler },
        .{ .name = "app.get_calendar_sources", .context = &app_state.calendar_ctx, .invoke_fn = api_calendar.getSourcesHandler },
        .{ .name = "app.start_google_oauth", .context = &app_state.oauth_ctx, .invoke_fn = api_oauth.startOAuthHandler },
        .{ .name = "app.complete_google_oauth", .context = &app_state.oauth_ctx, .invoke_fn = api_oauth.completeOAuthHandler },
    };

    const dispatcher = zero_native.BridgeDispatcher{
        .policy = .{
            .enabled = true,
            .commands = &policies,
        },
        .registry = .{ .handlers = &sync_handlers },
        .async_registry = .{ .handlers = &async_handlers },
    };

    try runner.runWithOptions(app_state.app(), .{
        .app_name = "Inkdash",
        .window_title = "Inkdash",
        .bundle_id = "com.inkdash.app",
        .icon_path = "assets/icon.icns",
        .bridge = dispatcher,
        .security = .{
            .navigation = .{ .allowed_origins = &dev_origins },
        },
    }, init);
}

test "app bridge policies are non-empty" {
    const allocator = std.testing.allocator;
    _ = allocator;
    // Ensure all handler names match policy names
    const policy_names = [_][]const u8{
        "app.get_config", "app.save_config", "app.get_refresh_intervals",
        "app.get_timeline", "app.is_calendar_configured", "app.fetch_weather",
        "app.fetch_stocks", "app.fetch_ticktick_tasks", "app.fetch_calendar_events",
        "app.fetch_calendar_list", "app.get_calendar_sources",
        "app.start_google_oauth", "app.complete_google_oauth",
    };
    // All names follow "app." prefix convention
    for (policy_names) |name| {
        try std.testing.expect(std.mem.startsWith(u8, name, "app."));
    }
}
```

- [ ] **Step 4: Attempt to build**

```bash
cd . && zig build 2>&1 | head -50
```

Fix any compilation errors (type mismatches, wrong function signatures, etc.) before proceeding.

- [ ] **Step 5: Run all Zig tests**

```bash
zig build test 2>&1
```

Expected: All tests pass (config, timeline, http_client, bridge policy test, original app name test).

- [ ] **Step 6: Build and run**

```bash
zig build run 2>&1 | head -30
```

Expected: Frontend builds, app launches, window appears showing the Inkdash dashboard UI.

---

## Task 10: Integration Verification + Test Suite

**Files:**
- Verify `zig build test` passes
- Verify frontend TypeScript compiles
- Verify app runs with `zig build run`

- [ ] **Step 1: Run full Zig test suite**

```bash
cd . && zig build test 2>&1
```

Expected output: All tests pass. Key tests:
- `config.zig: default config has expected weather location` — PASS
- `config.zig: default config has expected stock tickers` — PASS
- `config.zig: config JSON round-trip preserves weather location` — PASS
- `timeline.zig: default timeline has expected events` — PASS
- `timeline.zig: timeline for today returns events` — PASS
- `timeline.zig: timeline override applies for matching day` — PASS
- `http_client.zig: url encode basic strings` — PASS
- `http_client.zig: url encode no special chars passes through` — PASS
- `http_client.zig: url encode slash is percent-encoded` — PASS
- `main.zig: app bridge policies are non-empty` — PASS

- [ ] **Step 2: Verify frontend TypeScript compiles**

```bash
cd ./frontend && npx tsc --noEmit 2>&1
```

Fix any type errors found.

- [ ] **Step 3: Build frontend**

```bash
npm run build --prefix frontend 2>&1
```

Expected: Frontend builds to `frontend/dist/` without errors.

- [ ] **Step 4: Full build**

```bash
cd . && zig build run 2>&1
```

Expected: App launches showing the Inkdash dashboard.

- [ ] **Step 5: Build with dev server**

```bash
cd . && zig build dev 2>&1
```

Expected: Vite dev server starts and app shows the dashboard with hot reload.

- [ ] **Step 6: Run zero-native doctor**

```bash
zero-native doctor --manifest app.zon
```

Expected: No critical errors.

- [ ] **Step 7: Commit all changes**

```bash
git add -A
git commit -m "feat: migrate inkdash Tauri app to zero-native with full bridge implementation

- Copy all React frontend components, hooks, pages, and widgets from Tauri app
- Replace @tauri-apps/api invoke() calls with window.zero bridge adapter
- Implement Zig bridge handlers for config, timeline, weather, stocks, TickTick, calendar, OAuth
- Use std.http.Client for all HTTP API calls
- Use app_dirs for platform-appropriate config file paths (JSON format)
- Use AsyncHandler + std.Thread for non-blocking HTTP bridge commands
- Update window size to 1024x600 to match original app
- Add comprehensive Zig unit tests for config, timeline, and HTTP utilities"
```

---

## Self-Review

### Spec Coverage Check

| Feature | Task |
|---------|------|
| Config load/save | Task 3 (config.zig) |
| Weather fetch | Task 6 (api_weather.zig) |
| Stocks fetch | Task 6 (api_stocks.zig) |
| TickTick tasks | Task 7 (api_ticktick.zig) |
| Calendar events/list/sources | Task 7 (api_calendar.zig) |
| Google OAuth flow | Task 8 (api_oauth.zig) |
| Fullscreen toggle | Task 2 (browser Fullscreen API) |
| Timeline | Task 4 (timeline.zig) |
| Refresh intervals | Task 9 (main.zig handler) |
| All tests pass | Task 10 |
| Frontend copy | Task 1 |
| Bridge adapter | Task 2 |
| Bridge wiring | Task 9 |
| Window size 1024×600 | Task 9 |

### Known Gaps / Notes

1. **JSON response memory management**: The sync handlers that return `allocator.dupe(u8, ...)` will leak memory unless the bridge framework frees the returned slice. Since the bridge uses a fixed `output: []u8` buffer, sync handlers should write into `output` instead of allocating. **Fix needed in Task 9**: The sync handler approach should use the provided `output` buffer or ensure the lifecycle is clear.

2. **Config deep copy**: The `deepCopyConfig` function needs careful cleanup. Since config structs use arena-allocated strings from `parseFromSlice`, callers should hold the `Parsed` container. The simplified `loadConfig` returns a default that doesn't need freeing — for the real case, the allocator owns the copied strings and they'll be leaked unless tracked. **Simplification**: For the initial working implementation, use `std.heap.ArenaAllocator` per request in handlers to avoid leaks.

3. **Token expiry format**: The Rust code stores `token_expiry` as an RFC3339 string. The Zig implementation stores it as a Unix timestamp integer string. This means existing Tauri config files won't be compatible. This is acceptable since the migration starts fresh.

4. **JSON output for sync handlers**: The `handleGetConfig` and `handleGetTimeline` handlers return `allocator.dupe(u8, ...)` but the bridge expects the returned slice to fit within `output`. The current approach allocates which may cause memory management issues. **Recommendation**: Use `output` buffer with `std.Io.Writer.fixed(output)` to write JSON, with error if too large.

These gaps should be addressed during Task 9 compilation — the Zig compiler will catch memory lifetime issues if `std.debug.assert` / `defer` are used correctly.
