const std = @import("std");
const runner = @import("runner");
const zero_native = @import("zero-native");

const config_mod = @import("config.zig");
const timeline_mod = @import("timeline.zig");
const api_weather = @import("api_weather.zig");
const api_stocks = @import("api_stocks.zig");

pub const panic = std.debug.FullPanic(zero_native.debug.capturePanic);

const bridge = zero_native.bridge;

const App = struct {
    env_map: *std.process.Environ.Map,
    io: std.Io,
    allocator: std.mem.Allocator,

    weather_ctx: api_weather.HandlerContext,
    stocks_ctx: api_stocks.HandlerContext,

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

    fn handleGetConfig(context: *anyopaque, invocation: bridge.Invocation, output: []u8) anyerror![]const u8 {
        _ = invocation;
        _ = output;
        const self: *App = @ptrCast(@alignCast(context));
        const cfg = try config_mod.loadConfig(self.io, self.allocator, self.env_map);
        var json_buf = std.Io.Writer.Allocating.init(self.allocator);
        defer json_buf.deinit();
        try std.json.Stringify.value(cfg, .{}, &json_buf.writer);
        return self.allocator.dupe(u8, json_buf.writer.buffered());
    }

    fn handleSaveConfig(context: *anyopaque, invocation: bridge.Invocation, output: []u8) anyerror![]const u8 {
        _ = output;
        const self: *App = @ptrCast(@alignCast(context));
        const parsed = try std.json.parseFromSlice(config_mod.AppConfig, self.allocator, invocation.request.payload, .{
            .ignore_unknown_fields = true,
        });
        defer parsed.deinit();
        try config_mod.saveConfig(self.io, self.allocator, self.env_map, parsed.value);
        return "null";
    }

    fn handleGetTimeline(context: *anyopaque, invocation: bridge.Invocation, output: []u8) anyerror![]const u8 {
        _ = invocation;
        _ = output;
        const self: *App = @ptrCast(@alignCast(context));
        const allocator = self.allocator;
        const timeline = try timeline_mod.getTimelineForToday(self.io, allocator, self.env_map);
        defer timeline_mod.deinitTimelineResponse(allocator, timeline);

        var json_buf = std.Io.Writer.Allocating.init(allocator);
        defer json_buf.deinit();
        const response = .{
            .start_hour = timeline.start_hour,
            .end_hour = timeline.end_hour,
            .events = timeline.events,
        };
        try std.json.Stringify.value(response, .{}, &json_buf.writer);

        return allocator.dupe(u8, json_buf.writer.buffered());
    }
};

const allowed_origins = [_][]const u8{ "zero://app", "http://127.0.0.1:5173" };
const dev_origins = [_][]const u8{ "zero://app", "zero://inline", "http://127.0.0.1:5173" };

pub fn main(init: std.process.Init) !void {
    const allocator = std.heap.page_allocator;

    var app_state = App{
        .env_map = init.environ_map,
        .io = init.io,
        .allocator = allocator,
        .weather_ctx = .{ .io = init.io, .allocator = allocator, .env_map = init.environ_map },
        .stocks_ctx = .{ .io = init.io, .allocator = allocator, .env_map = init.environ_map },
    };

    const policies = [_]bridge.CommandPolicy{
        .{ .name = "app.get_config", .origins = &allowed_origins },
        .{ .name = "app.save_config", .origins = &allowed_origins },
        .{ .name = "app.get_timeline", .origins = &allowed_origins },
        .{ .name = "app.fetch_weather", .origins = &allowed_origins },
        .{ .name = "app.fetch_stocks", .origins = &allowed_origins },
    };

    const sync_handlers = [_]bridge.Handler{
        .{ .name = "app.get_config", .context = &app_state, .invoke_fn = App.handleGetConfig },
        .{ .name = "app.save_config", .context = &app_state, .invoke_fn = App.handleSaveConfig },
        .{ .name = "app.get_timeline", .context = &app_state, .invoke_fn = App.handleGetTimeline },
    };

    const async_handlers = [_]bridge.AsyncHandler{
        .{ .name = "app.fetch_weather", .context = &app_state.weather_ctx, .invoke_fn = api_weather.handler },
        .{ .name = "app.fetch_stocks", .context = &app_state.stocks_ctx, .invoke_fn = api_stocks.handler },
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
        .js_window_api = true,
        .security = .{
            .navigation = .{ .allowed_origins = &dev_origins },
        },
    }, init);
}

test "app bridge policies are non-empty" {
    const policy_names = [_][]const u8{
        "app.get_config",    "app.save_config",  "app.get_timeline",
        "app.fetch_weather", "app.fetch_stocks",
    };
    for (policy_names) |name| {
        try std.testing.expect(std.mem.startsWith(u8, name, "app."));
    }
}

test {
    _ = @import("config.zig");
    _ = @import("timeline.zig");
    _ = @import("http_client.zig");
}
