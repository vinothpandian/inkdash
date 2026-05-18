const std = @import("std");
const zero_native = @import("zero-native");
const bridge = zero_native.bridge;
const app_log = @import("app_log.zig");
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

    app_log.info(args.io, args.env_map, "weather.request.start", null, &.{app_log.trace.string("request_id", args.id())});
    const body = doFetch(args) catch |err| {
        app_log.err(args.io, args.env_map, "weather.request.failed", @errorName(err), &.{app_log.trace.string("request_id", args.id())});
        args.responder.fail(args.id(), .handler_failed, @errorName(err)) catch {};
        return;
    };
    args.responder.success(args.id(), body) catch {};
    app_log.info(args.io, args.env_map, "weather.request.success", null, &.{
        app_log.trace.string("request_id", args.id()),
        app_log.trace.uint("bytes", body.len),
    });
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

    const url = try std.fmt.allocPrint(allocator, "{s}?latitude={s}&longitude={s}&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m,weather_code&daily=sunrise,sunset&timezone={s}&forecast_days=1", .{ OPEN_METEO_BASE, lat_str, lon_str, tz_encoded });
    defer allocator.free(url);

    const body = try http.get(args.io, allocator, url, &.{});
    defer allocator.free(body);
    app_log.info(args.io, args.env_map, "weather.fetch.response", null, &.{app_log.trace.uint("bytes", body.len)});

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

    const HourlyForecastPoint = struct {
        hour: usize,
        temperature: i64,
        condition: []const u8,
    };
    var hourly_forecast: std.ArrayList(HourlyForecastPoint) = .empty;
    defer hourly_forecast.deinit(allocator);

    var i: usize = 0;
    const hourly_len = @min(@min(hourly_temps.len, hourly_codes.len), 24);
    while (i < hourly_len) : (i += 1) {
        const h_temp = @as(i64, @intFromFloat(@round(hourly_temps[i].float)));
        const h_code = hourly_codes[i].integer;
        const h_cond = mapWeatherCode(h_code);
        try hourly_forecast.append(allocator, HourlyForecastPoint{
            .hour = i,
            .temperature = h_temp,
            .condition = h_cond,
        });
    }

    const last_updated = try std.fmt.allocPrint(allocator, "{d}", .{http.posixTimestamp()});
    defer allocator.free(last_updated);

    const condition = mapWeatherCode(weather_code);
    const response = .{
        .location = .{
            .name = "Toronto",
            .latitude = cfg.weather.latitude,
            .longitude = cfg.weather.longitude,
        },
        .condition = condition,
        .temperature = @as(i64, @intFromFloat(@round(temp))),
        .feelsLike = @as(i64, @intFromFloat(@round(feels_like))),
        .humidity = humidity,
        .windSpeed = @as(i64, @intFromFloat(@round(wind))),
        .unit = "celsius",
        .sunrise = sunrise,
        .sunset = sunset,
        .hourlyForecast = hourly_forecast.items,
        .lastUpdated = last_updated,
    };

    var json_buf = std.Io.Writer.Allocating.init(allocator);
    defer json_buf.deinit();
    try std.json.Stringify.value(response, .{}, &json_buf.writer);
    app_log.info(args.io, args.env_map, "weather.request.complete", null, &.{
        app_log.trace.int("temperature", @as(i64, @intFromFloat(@round(temp)))),
        app_log.trace.uint("hourly_points", hourly_forecast.items.len),
        app_log.trace.uint("json_bytes", json_buf.writer.buffered().len),
    });

    return allocator.dupe(u8, json_buf.writer.buffered());
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
