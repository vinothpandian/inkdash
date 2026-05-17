const std = @import("std");
const app_dirs = @import("zero-native").app_dirs;

const TIMELINE_FILE = "timeline.json";

pub const TimelineEvent = struct {
    time: []const u8,
    label: []const u8,
    type: []const u8,
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

fn posixTimestamp() i64 {
    var ts: std.c.timespec = undefined;
    _ = std.c.clock_gettime(.REALTIME, &ts);
    return @as(i64, @intCast(ts.sec));
}

fn getCurrentDayName() []const u8 {
    const epoch_seconds = @as(u64, @intCast(posixTimestamp()));
    const days_since_epoch = epoch_seconds / 86400;
    const day_of_week = (days_since_epoch + 4) % 7;
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

    return try cloneTimelineConfig(allocator, parsed.value);
}

test "loaded timeline config keeps event strings after source buffers are freed" {
    const allocator = std.testing.allocator;

    const json =
        \\{
        \\  "start_hour": 5,
        \\  "end_hour": 22,
        \\  "default_events": [
        \\    { "time": "09:15", "label": "From JSON", "type": "marker" }
        \\  ]
        \\}
    ;

    const source = try allocator.dupe(u8, json);
    const parsed = try std.json.parseFromSlice(TimelineConfig, allocator, source, .{
        .ignore_unknown_fields = true,
    });
    const cfg = try cloneTimelineConfig(allocator, parsed.value);
    parsed.deinit();
    allocator.free(source);
    defer deinitTimelineConfig(allocator, cfg);

    const response = try getTimelineForDay(allocator, cfg, "monday");
    defer deinitTimelineResponse(allocator, response);

    try std.testing.expectEqual(@as(u8, 5), response.start_hour);
    try std.testing.expectEqualStrings("From JSON", response.events[0].label);
}

fn cloneEventList(allocator: std.mem.Allocator, events: []const TimelineEvent) ![]TimelineEvent {
    const copy = try allocator.alloc(TimelineEvent, events.len);
    errdefer allocator.free(copy);

    for (events, 0..) |event, index| {
        copy[index] = .{
            .time = try allocator.dupe(u8, event.time),
            .label = try allocator.dupe(u8, event.label),
            .type = try allocator.dupe(u8, event.type),
        };
    }

    return copy;
}

fn deinitEventList(allocator: std.mem.Allocator, events: []const TimelineEvent) void {
    for (events) |event| {
        allocator.free(event.time);
        allocator.free(event.label);
        allocator.free(event.type);
    }
    allocator.free(events);
}

pub fn cloneTimelineConfig(allocator: std.mem.Allocator, src: TimelineConfig) !TimelineConfig {
    var cfg = TimelineConfig{
        .start_hour = src.start_hour,
        .end_hour = src.end_hour,
        .default_events = try cloneEventList(allocator, src.default_events),
        .overrides = null,
    };
    errdefer deinitEventList(allocator, cfg.default_events);

    if (src.overrides) |src_overrides| {
        const overrides = try allocator.alloc(TimelineOverride, src_overrides.len);
        errdefer allocator.free(overrides);

        for (src_overrides, 0..) |override, override_index| {
            const days = try allocator.alloc([]const u8, override.days.len);
            errdefer allocator.free(days);
            for (override.days, 0..) |day, day_index| {
                days[day_index] = try allocator.dupe(u8, day);
            }

            overrides[override_index] = .{
                .days = days,
                .events = try cloneEventList(allocator, override.events),
            };
        }

        cfg.overrides = overrides;
    }

    return cfg;
}

pub fn deinitTimelineConfig(allocator: std.mem.Allocator, cfg: TimelineConfig) void {
    if (cfg.default_events.ptr != default_event_list[0..].ptr) {
        deinitEventList(allocator, cfg.default_events);
    }

    if (cfg.overrides) |overrides| {
        for (overrides) |override| {
            for (override.days) |day| allocator.free(day);
            allocator.free(override.days);
            deinitEventList(allocator, override.events);
        }
        allocator.free(overrides);
    }
}

pub fn deinitTimelineResponse(allocator: std.mem.Allocator, response: TimelineResponse) void {
    deinitEventList(allocator, response.events);
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

    const events_copy = try cloneEventList(allocator, events);
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
    defer deinitTimelineConfig(allocator, cfg);
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
    defer deinitTimelineResponse(allocator, response);
    try std.testing.expect(response.events.len > 0);
    try std.testing.expectEqual(@as(u8, 6), response.start_hour);
}

test "timeline override applies for matching day" {
    const allocator = std.testing.allocator;
    const weekend_events = [_]TimelineEvent{
        .{ .time = "09:00", .label = "Sleep in", .type = "marker" },
    };
    const overrides = [_]TimelineOverride{
        .{ .days = &.{ "saturday", "sunday" }, .events = &weekend_events },
    };
    const cfg = TimelineConfig{
        .default_events = &default_event_list,
        .overrides = &overrides,
    };

    const sat_response = try getTimelineForDay(allocator, cfg, "saturday");
    defer deinitTimelineResponse(allocator, sat_response);
    try std.testing.expectEqual(@as(usize, 1), sat_response.events.len);
    try std.testing.expectEqualStrings("Sleep in", sat_response.events[0].label);

    const mon_response = try getTimelineForDay(allocator, cfg, "monday");
    defer deinitTimelineResponse(allocator, mon_response);
    try std.testing.expect(mon_response.events.len > 1);
}
