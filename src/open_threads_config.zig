const std = @import("std");
const builtin = @import("builtin");

fn environmentValue(allocator: std.mem.Allocator, io: std.Io, env: *const std.process.Environ.Map, name: []const u8) ![]u8 {
    if (env.get(name)) |value| return allocator.dupe(u8, std.mem.trim(u8, value, " \r\n\t"));
    if (builtin.os.tag != .macos) return allocator.dupe(u8, "");
    const result = std.process.run(allocator, io, .{
        .argv = &.{ "/bin/launchctl", "getenv", name },
        .stdout_limit = .limited(16384),
        .stderr_limit = .limited(1024),
    }) catch return allocator.dupe(u8, "");
    defer allocator.free(result.stdout);
    defer allocator.free(result.stderr);
    return allocator.dupe(u8, std.mem.trim(u8, result.stdout, " \r\n\t"));
}

// Only returned to the app's allowlisted bridge origins; never persisted or logged.
pub fn load(allocator: std.mem.Allocator, io: std.Io, env: *const std.process.Environ.Map) ![]u8 {
    const token = try environmentValue(allocator, io, env, "OPEN_THREADS_POCKETBASE_TOKEN");
    defer allocator.free(token);
    if (token.len == 0) return allocator.dupe(u8, "null");
    const url = try environmentValue(allocator, io, env, "OPEN_THREADS_POCKETBASE_URL");
    defer allocator.free(url);
    var writer = std.Io.Writer.Allocating.init(allocator);
    defer writer.deinit();
    try std.json.Stringify.value(.{ .url = if (url.len == 0) "https://db.vinoth.app" else url, .token = token }, .{}, &writer.writer);
    return allocator.dupe(u8, writer.writer.buffered());
}

test "runtime config uses environment and escapes JSON" {
    const allocator = std.testing.allocator;
    var env = std.process.Environ.Map.init(allocator);
    defer env.deinit();
    try env.put("OPEN_THREADS_POCKETBASE_TOKEN", " test-token ");
    try env.put("OPEN_THREADS_POCKETBASE_URL", "https://db.vinoth.app");
    const result = try load(allocator, std.testing.io, &env);
    defer allocator.free(result);
    const parsed = try std.json.parseFromSlice(std.json.Value, allocator, result, .{});
    defer parsed.deinit();
    try std.testing.expectEqualStrings("test-token", parsed.value.object.get("token").?.string);
}
