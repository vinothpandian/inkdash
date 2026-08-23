const std = @import("std");
const app_dirs = @import("zero-native").app_dirs;

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

pub const TimezonesConfig = struct {
    zones: []const TimezoneEntry = &.{
        .{ .name = "Minnesota", .tz = "America/Chicago" },
        .{ .name = "London", .tz = "Europe/London" },
        .{ .name = "Zug", .tz = "Europe/Zurich" },
        .{ .name = "India", .tz = "Asia/Kolkata" },
        .{ .name = "Australia", .tz = "Australia/Sydney" },
    },
};

pub const AntiBurnInConfig = struct {
    /// Slowly drifts the whole UI a few pixels so no pixel stays lit in the
    /// exact same spot for hours (LED/OLED burn-in mitigation).
    pixel_shift_enabled: bool = true,
    /// Max drift distance from center, in pixels. Keep small (2-6px) so the
    /// motion stays imperceptible.
    pixel_shift_amplitude_px: f64 = 4,
    /// How often (ms) to pick a new drift position.
    pixel_shift_interval_ms: u32 = 45_000,
    /// Transition duration (ms) for each drift move.
    pixel_shift_transition_ms: u32 = 8_000,
    /// Dims the UI after a period of no interaction.
    idle_dim_enabled: bool = true,
    /// How long (ms) with no mouse/touch/keyboard activity before dimming.
    idle_dim_timeout_ms: u32 = 600_000,
    /// Overlay opacity applied when idle (0-1). Keep this subtle.
    idle_dim_opacity: f64 = 0.12,
    /// Fade duration (ms) for dimming in/out.
    idle_dim_fade_ms: u32 = 4_000,
};

pub const DisplayConfig = struct {
    fullscreen: bool = false,
    theme_mode: ThemeMode = .auto_sun,
    anti_burn_in: AntiBurnInConfig = .{},
};

pub const AppConfig = struct {
    weather: WeatherConfig = .{},
    stocks: StocksConfig = .{},
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

pub fn deepCopyConfig(allocator: std.mem.Allocator, src: AppConfig) !AppConfig {
    var cfg = src;
    cfg.weather.timezone = try allocator.dupe(u8, src.weather.timezone);
    const tickers = try allocator.alloc([]const u8, src.stocks.tickers.len);
    for (src.stocks.tickers, 0..) |t, i| tickers[i] = try allocator.dupe(u8, t);
    cfg.stocks.tickers = tickers;
    const zones = try allocator.alloc(TimezoneEntry, src.timezones.zones.len);
    for (src.timezones.zones, 0..) |z, i| {
        zones[i] = .{
            .name = try allocator.dupe(u8, z.name),
            .tz = try allocator.dupe(u8, z.tz),
        };
    }
    cfg.timezones.zones = zones;
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

test "default config has subtle anti-burn-in defaults" {
    const cfg = AppConfig.default();
    try std.testing.expect(cfg.display.anti_burn_in.pixel_shift_enabled);
    try std.testing.expect(cfg.display.anti_burn_in.idle_dim_enabled);
    try std.testing.expect(cfg.display.anti_burn_in.pixel_shift_amplitude_px <= 10);
    try std.testing.expect(cfg.display.anti_burn_in.idle_dim_opacity <= 0.3);
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
