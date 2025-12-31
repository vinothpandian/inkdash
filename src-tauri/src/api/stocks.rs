use super::StockData;
use chrono::Local;
use reqwest::Client;
use serde::Deserialize;

const YAHOO_BASE: &str = "https://query1.finance.yahoo.com/v8/finance/chart";

fn get_currency_symbol(currency: &str) -> &'static str {
    match currency {
        "USD" => "$",
        "EUR" => "€",
        "JPY" | "CNY" => "¥",
        "CAD" => "C$",
        "AUD" => "A$",
        "GBP" => "£",
        "CHF" => "Fr",
        "NZD" => "N$",
        "INR" => "₹",
        "BRL" => "R$",
        "RUB" => "₽",
        "TRY" => "₺",
        "ZAR" => "R",
        "KRW" => "₩",
        "HKD" => "HK$",
        "SGD" => "S$",
        "SEK" | "NOK" | "DKK" => "kr",
        "PLN" => "zł",
        "PHP" => "₱",
        _ => "$",
    }
}

#[derive(Debug, Deserialize)]
struct YahooResponse {
    chart: ChartData,
}

#[derive(Debug, Deserialize)]
struct ChartData {
    result: Option<Vec<ChartResult>>,
    error: Option<ChartError>,
}

#[derive(Debug, Deserialize)]
struct ChartResult {
    meta: ChartMeta,
    indicators: Indicators,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChartMeta {
    regular_market_price: f64,
    #[serde(default)]
    chart_previous_close: f64,
    currency: Option<String>,
    short_name: Option<String>,
    #[serde(default = "default_price_hint")]
    price_hint: i32,
}

fn default_price_hint() -> i32 {
    2
}

#[derive(Debug, Deserialize)]
struct Indicators {
    quote: Vec<QuoteData>,
}

#[derive(Debug, Deserialize)]
struct QuoteData {
    close: Vec<Option<f64>>,
}

#[derive(Debug, Deserialize)]
struct ChartError {
    code: String,
    description: String,
}

async fn fetch_single_stock(client: &Client, ticker: &str) -> Result<StockData, String> {
    let url = format!("{}?interval=1d&range=1mo", format!("{}/{}", YAHOO_BASE, ticker));

    let response = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36")
        .send()
        .await
        .map_err(|e| format!("Stock API request failed for {}: {}", ticker, e))?;

    if !response.status().is_success() {
        return Err(format!("Stock API error for {}: {}", ticker, response.status()));
    }

    let data: YahooResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse stock response for {}: {}", ticker, e))?;

    if let Some(error) = data.chart.error {
        return Err(format!("Yahoo API error for {}: {}", ticker, error.description));
    }

    let result = data
        .chart
        .result
        .and_then(|r| r.into_iter().next())
        .ok_or_else(|| format!("No data returned for {}", ticker))?;

    let meta = result.meta;

    // Get sparkline data (last 21 non-null closing prices)
    let close_prices: Vec<f64> = result
        .indicators
        .quote
        .first()
        .map(|q| q.close.iter().filter_map(|p| *p).collect())
        .unwrap_or_default();

    let sparkline: Vec<f64> = close_prices.iter().rev().take(21).rev().cloned().collect();

    // Calculate previous price
    let previous = if close_prices.len() >= 2 {
        close_prices[close_prices.len() - 2]
    } else if meta.chart_previous_close > 0.0 {
        meta.chart_previous_close
    } else {
        meta.regular_market_price
    };

    let change = meta.regular_market_price - previous;
    let change_percent = if previous > 0.0 {
        (change / previous) * 100.0
    } else {
        0.0
    };

    let currency = meta.currency.as_deref().unwrap_or("USD").to_uppercase();
    let currency_symbol = get_currency_symbol(&currency);

    let decimals = meta.price_hint;
    let multiplier = 10_f64.powi(decimals);

    Ok(StockData {
        ticker: ticker.to_string(),
        name: meta.short_name.unwrap_or_else(|| ticker.to_string()),
        price: meta.regular_market_price,
        change: (change * multiplier).round() / multiplier,
        change_percent: (change_percent * 100.0).round() / 100.0,
        currency: currency_symbol.to_string(),
        sparkline_data: sparkline,
        price_hint: decimals,
        last_updated: Local::now().to_rfc3339(),
    })
}

pub async fn fetch_stocks(tickers: &[String]) -> Result<Vec<StockData>, String> {
    let client = Client::new();
    let mut stocks = Vec::new();
    let mut errors = Vec::new();

    for ticker in tickers {
        match fetch_single_stock(&client, ticker).await {
            Ok(stock) => stocks.push(stock),
            Err(e) => errors.push(e),
        }
    }

    if stocks.is_empty() && !errors.is_empty() {
        return Err(format!("Failed to fetch stocks: {}", errors.join(", ")));
    }

    Ok(stocks)
}
