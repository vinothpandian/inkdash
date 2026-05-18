const std = @import("std");
const zero_native = @import("zero-native");

const APP_BUNDLE_ID = "com.inkdash.app";

pub const trace = zero_native.trace;

pub fn info(
    io: std.Io,
    env_map: *const std.process.Environ.Map,
    name: []const u8,
    message: ?[]const u8,
    fields: []const trace.Field,
) void {
    event(io, env_map, .info, name, message, fields);
}

pub fn warn(
    io: std.Io,
    env_map: *const std.process.Environ.Map,
    name: []const u8,
    message: ?[]const u8,
    fields: []const trace.Field,
) void {
    event(io, env_map, .warn, name, message, fields);
}

pub fn err(
    io: std.Io,
    env_map: *const std.process.Environ.Map,
    name: []const u8,
    message: ?[]const u8,
    fields: []const trace.Field,
) void {
    event(io, env_map, .err, name, message, fields);
}

pub fn fatal(
    io: std.Io,
    env_map: *const std.process.Environ.Map,
    name: []const u8,
    message: ?[]const u8,
    fields: []const trace.Field,
) void {
    event(io, env_map, .fatal, name, message, fields);
}

fn event(
    io: std.Io,
    env_map_const: *const std.process.Environ.Map,
    level: trace.Level,
    name: []const u8,
    message: ?[]const u8,
    fields: []const trace.Field,
) void {
    const env_map: *std.process.Environ.Map = @constCast(env_map_const);
    var buffers: zero_native.debug.LogPathBuffers = .{};
    const setup = zero_native.debug.setupLogging(io, env_map, APP_BUNDLE_ID, &buffers) catch return;
    zero_native.debug.appendTraceRecord(
        io,
        setup.paths.log_dir,
        setup.paths.log_file,
        setup.format,
        trace.event(timestamp(), level, name, message, fields),
    ) catch {};
}

fn timestamp() trace.Timestamp {
    var ts: std.c.timespec = undefined;
    if (std.c.clock_gettime(.REALTIME, &ts) != 0) return .{};
    const ns = (@as(i128, ts.sec) * std.time.ns_per_s) + ts.nsec;
    return trace.Timestamp.fromNanoseconds(ns);
}
