const std = @import("std");
const zero_native = @import("zero-native");
const bridge = zero_native.bridge;
const app_log = @import("app_log.zig");
const config_mod = @import("config.zig");
const http = @import("http_client.zig");

const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const log = std.log.scoped(.stocks);

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

const StockItem = struct {
    ticker: []const u8,
    name: []const u8,
    price: f64,
    change: f64,
    changePercent: f64,
    currency: []const u8,
    sparklineData: []const f64,
    priceHint: i64,
    lastUpdated: []const u8,
};

fn deinitStockItem(allocator: std.mem.Allocator, item: StockItem) void {
    allocator.free(item.ticker);
    allocator.free(item.name);
    allocator.free(item.sparklineData);
}

fn fetchSingleStock(
    io: std.Io,
    allocator: std.mem.Allocator,
    env_map: *const std.process.Environ.Map,
    ticker: []const u8,
    last_updated: []const u8,
) !StockItem {
    const url = try std.fmt.allocPrint(allocator, "{s}/{s}?interval=1d&range=1mo", .{ YAHOO_BASE, ticker });
    defer allocator.free(url);

    log.info("fetch start ticker={s}", .{ticker});
    app_log.info(io, env_map, "stocks.fetch.start", null, &.{app_log.trace.string("ticker", ticker)});
    const headers = [_]std.http.Header{
        .{ .name = "User-Agent", .value = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" },
    };
    const body = try http.get(io, allocator, url, &headers);
    defer allocator.free(body);
    log.info("fetch response ticker={s} bytes={d}", .{ ticker, body.len });
    app_log.info(io, env_map, "stocks.fetch.response", null, &.{
        app_log.trace.string("ticker", ticker),
        app_log.trace.uint("bytes", body.len),
    });

    return try parseStockItem(io, env_map, allocator, ticker, last_updated, body);
}

fn parseStockItem(
    io: std.Io,
    env_map: *const std.process.Environ.Map,
    allocator: std.mem.Allocator,
    ticker: []const u8,
    last_updated: []const u8,
    body: []const u8,
) !StockItem {
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

    const indicators = result.get("indicators").?.object;
    const quote = indicators.get("quote").?.array.items[0].object;
    const close_arr = quote.get("close").?.array.items;
    log.info("parse data ticker={s} name={s} closes={d}", .{ ticker, short_name, close_arr.len });
    app_log.info(io, env_map, "stocks.parse.data", null, &.{
        app_log.trace.string("ticker", ticker),
        app_log.trace.string("name", short_name),
        app_log.trace.uint("closes", close_arr.len),
    });

    var close_prices: std.ArrayList(f64) = .empty;
    defer close_prices.deinit(allocator);
    for (close_arr) |v| {
        if (v != .null) try close_prices.append(allocator, v.float);
    }

    const start = if (close_prices.items.len > 21) close_prices.items.len - 21 else 0;
    const previous = if (close_prices.items.len >= 2) close_prices.items[close_prices.items.len - 2] else prev_close;
    const change = price - previous;
    const change_pct = if (previous > 0.0) (change / previous) * 100.0 else 0.0;
    const currency_symbol = getCurrencySymbol(currency_str);
    const owned_ticker = try allocator.dupe(u8, ticker);
    errdefer allocator.free(owned_ticker);
    const owned_name = try allocator.dupe(u8, short_name);
    errdefer allocator.free(owned_name);
    const sparkline_data = try allocator.dupe(f64, close_prices.items[start..]);
    errdefer allocator.free(sparkline_data);

    const item = StockItem{
        .ticker = owned_ticker,
        .name = owned_name,
        .price = price,
        .change = change,
        .changePercent = change_pct,
        .currency = currency_symbol,
        .sparklineData = sparkline_data,
        .priceHint = price_hint,
        .lastUpdated = last_updated,
    };
    return item;
}

fn fetchStocksThread(args_ptr: *ThreadArgs) void {
    defer args_ptr.allocator.destroy(args_ptr);
    const args = args_ptr;

    log.info("request start id={s}", .{args.id()});
    app_log.info(args.io, args.env_map, "stocks.request.start", null, &.{app_log.trace.string("request_id", args.id())});
    const body = doFetch(args) catch |err| {
        log.err("request failed id={s} error={s}", .{ args.id(), @errorName(err) });
        app_log.err(args.io, args.env_map, "stocks.request.failed", @errorName(err), &.{app_log.trace.string("request_id", args.id())});
        args.responder.fail(args.id(), .handler_failed, @errorName(err)) catch {};
        return;
    };
    defer args.allocator.free(body);
    args.responder.success(args.id(), body) catch {};
    log.info("request success id={s} bytes={d}", .{ args.id(), body.len });
    app_log.info(args.io, args.env_map, "stocks.request.success", null, &.{
        app_log.trace.string("request_id", args.id()),
        app_log.trace.uint("bytes", body.len),
    });
}

fn doFetch(args: *ThreadArgs) ![]u8 {
    const allocator = args.allocator;
    const cfg = try config_mod.loadConfig(args.io, allocator, args.env_map);

    const last_updated = try std.fmt.allocPrint(allocator, "{d}", .{http.posixTimestamp()});
    defer allocator.free(last_updated);

    var result: std.ArrayList(StockItem) = .empty;
    defer result.deinit(allocator);

    var failed: usize = 0;
    for (cfg.stocks.tickers) |ticker| {
        const item = fetchSingleStock(args.io, allocator, args.env_map, ticker, last_updated) catch |err| {
            failed += 1;
            log.warn("ticker skipped ticker={s} error={s}", .{ ticker, @errorName(err) });
            app_log.warn(args.io, args.env_map, "stocks.ticker.skipped", @errorName(err), &.{app_log.trace.string("ticker", ticker)});
            continue;
        };
        try result.append(allocator, item);
    }

    defer {
        for (result.items) |item| {
            deinitStockItem(allocator, item);
        }
    }

    var json_buf = std.Io.Writer.Allocating.init(allocator);
    defer json_buf.deinit();
    try std.json.Stringify.value(result.items, .{}, &json_buf.writer);
    log.info("request complete tickers={d} fetched={d} failed={d} json_bytes={d}", .{
        cfg.stocks.tickers.len,
        result.items.len,
        failed,
        json_buf.writer.buffered().len,
    });
    app_log.info(args.io, args.env_map, "stocks.request.complete", null, &.{
        app_log.trace.uint("tickers", cfg.stocks.tickers.len),
        app_log.trace.uint("fetched", result.items.len),
        app_log.trace.uint("failed", failed),
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

    const thread = try std.Thread.spawn(.{}, fetchStocksThread, .{args});
    thread.detach();
}

pub const HandlerContext = struct {
    io: std.Io,
    allocator: std.mem.Allocator,
    env_map: *const std.process.Environ.Map,
};

test "stock item owns strings after parsed JSON is deinitialized" {
    const allocator = std.testing.allocator;
    const body =
        \\{
        \\  "chart": {
        \\    "result": [{
        \\      "meta": {
        \\        "regularMarketPrice": 105.5,
        \\        "chartPreviousClose": 100.0,
        \\        "currency": "USD",
        \\        "shortName": "Test Holding",
        \\        "priceHint": 2
        \\      },
        \\      "indicators": {
        \\        "quote": [{
        \\          "close": [100.0, null, 101.0, 105.5]
        \\        }]
        \\      }
        \\    }]
        \\  }
        \\}
    ;

    var env_map = std.process.Environ.Map.init(allocator);
    defer env_map.deinit();

    const item = try parseStockItem(.{}, &env_map, allocator, "TEST", "1779129014", body);
    defer deinitStockItem(allocator, item);

    var json_buf = std.Io.Writer.Allocating.init(allocator);
    defer json_buf.deinit();
    try std.json.Stringify.value(&.{item}, .{}, &json_buf.writer);

    const json = json_buf.writer.buffered();
    try std.testing.expect(std.mem.indexOf(u8, json, "\"ticker\":\"TEST\"") != null);
    try std.testing.expect(std.mem.indexOf(u8, json, "\"name\":\"Test Holding\"") != null);
}
