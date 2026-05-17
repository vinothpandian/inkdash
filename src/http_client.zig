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
    var out: std.ArrayList(u8) = .empty;
    defer out.deinit(allocator);

    for (input) |ch| {
        if (std.ascii.isAlphanumeric(ch) or ch == '-' or ch == '_' or ch == '.' or ch == '~') {
            try out.append(allocator, ch);
        } else {
            try out.appendSlice(allocator, &.{ '%', hexDigit(ch >> 4), hexDigit(ch & 0x0F) });
        }
    }
    return out.toOwnedSlice(allocator);
}

/// Returns the current Unix timestamp in seconds using POSIX clock_gettime.
pub fn posixTimestamp() i64 {
    var ts: std.c.timespec = undefined;
    _ = std.c.clock_gettime(.REALTIME, &ts);
    return @as(i64, @intCast(ts.sec));
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
