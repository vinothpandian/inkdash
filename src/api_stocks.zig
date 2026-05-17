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

const StockItem = struct {
    ticker: []const u8,
    name: []const u8,
    price: f64,
    change: f64,
    @"changePercent": f64,
    currency: []const u8,
    @"sparklineData": []const f64,
    priceHint: i64,
    @"lastUpdated": []const u8,
};

fn fetchSingleStock(
    io: std.Io,
    allocator: std.mem.Allocator,
    ticker: []const u8,
    last_updated: []const u8,
) !StockItem {
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

    const indicators = result.get("indicators").?.object;
    const quote = indicators.get("quote").?.array.items[0].object;
    const close_arr = quote.get("close").?.array.items;

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
    const sparkline_data = try allocator.dupe(f64, close_prices.items[start..]);

    const item = StockItem{
        .ticker = ticker,
        .name = short_name,
        .price = price,
        .change = change,
        .@"changePercent" = change_pct,
        .currency = currency_symbol,
        .@"sparklineData" = sparkline_data,
        .priceHint = price_hint,
        .@"lastUpdated" = last_updated,
    };
    return item;
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

    const last_updated = try std.fmt.allocPrint(allocator, "{d}", .{http.posixTimestamp()});
    defer allocator.free(last_updated);

    var result: std.ArrayList(StockItem) = .empty;
    defer result.deinit(allocator);

    for (cfg.stocks.tickers) |ticker| {
        const item = fetchSingleStock(args.io, allocator, ticker, last_updated) catch continue;
        try result.append(allocator, item);
    }

    defer {
        for (result.items) |item| {
            allocator.free(item.@"sparklineData");
        }
    }

    var json_buf = std.Io.Writer.Allocating.init(allocator);
    defer json_buf.deinit();
    try std.json.Stringify.value(result.items, .{}, &json_buf.writer);

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
