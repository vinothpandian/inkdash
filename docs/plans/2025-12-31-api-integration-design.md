# API Integration Design

Replace mock data with real APIs for Weather and Stocks.

## APIs Selected

| Feature | Provider | Cost | Auth |
|---------|----------|------|------|
| Weather | Open-Meteo | Free | None |
| Stocks | Yahoo Finance | Free | None (via CORS proxy) |

## Architecture

Client-side fetching with custom hooks. No backend required.

```
src/
├── api/
│   ├── weather.ts    # Open-Meteo fetch + parsing
│   └── stocks.ts     # Yahoo Finance fetch + parsing
├── hooks/
│   ├── useWeather.ts # Caching, refresh, error handling
│   └── useStocks.ts  # Caching, refresh, error handling
```

## Weather API (Open-Meteo)

**Endpoint:**
```
https://api.open-meteo.com/v1/forecast?latitude=43.65&longitude=-79.38&current=temperature_2m,apparent_temperature,weather_code&hourly=temperature_2m,weather_code&daily=sunrise,sunset&timezone=America/Toronto
```

**Response Mapping:**
- `current.temperature_2m` → Current temp
- `current.apparent_temperature` → Feels like
- `current.weather_code` → Condition (WMO code → string)
- `hourly.temperature_2m` → 24-hour graph data
- `daily.sunrise[0]` / `daily.sunset[0]` → Daylight times

**WMO Weather Codes:**
- 0: clear
- 1-3: partly-cloudy
- 45-48: fog
- 51-67: rain
- 71-77: snow
- 80-99: thunderstorm

**Refresh:** Every 15 minutes

## Stocks API (Yahoo Finance)

**Endpoint:**
```
https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1mo
```

**Response Mapping:**
- `meta.regularMarketPrice` → Current price
- `meta.previousClose` → For change calculation
- `meta.currency` → Currency symbol
- `indicators.quote[0].close` → Sparkline (last 20 points)

**Symbols:** TRI, VEQT.TO, VGRO.TO, ZGLD.TO

**Refresh:** Every 5 minutes

## Error Handling

- Cache data in localStorage for offline resilience
- Show cached data on fetch failure
- Loading skeletons on initial load
- No flash during refresh (keep current data visible)
