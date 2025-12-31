# Tauri Desktop App Conversion

Convert inkdash from a web app to a Tauri desktop application for Linux, moving all API calls to a Rust backend for security and enabling Google Calendar integration.

## Goals

- Run as native Linux desktop app (AppImage)
- Secure API credentials in backend (not exposed in browser)
- Add Google Calendar integration with proper OAuth
- GitHub Actions CI/CD for builds
- Fullscreen toggle with F11

## Project Structure

```
inkdash/
├── src/                      # React frontend (existing)
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── src/
│   │   ├── main.rs           # Tauri entry point
│   │   ├── lib.rs            # Command exports
│   │   ├── config.rs         # Config loading/saving
│   │   ├── api/
│   │   │   ├── mod.rs
│   │   │   ├── weather.rs    # Open-Meteo client
│   │   │   ├── stocks.rs     # Yahoo Finance client
│   │   │   ├── ticktick.rs   # TickTick client
│   │   │   └── calendar.rs   # Google Calendar client
│   │   └── oauth/
│   │       ├── mod.rs
│   │       └── google.rs     # OAuth flow handling
│   └── icons/
├── config/
│   └── config.example.toml   # Template for users
├── scripts/
│   └── build-linux.sh        # Local build script
└── .github/
    └── workflows/
        └── build.yml         # CI/CD pipeline
```

## Tauri Commands

```rust
// Config
get_config() -> Result<AppConfig, String>
save_config(config: AppConfig) -> Result<(), String>

// Data fetching
fetch_weather() -> Result<WeatherData, String>
fetch_stocks() -> Result<Vec<StockData>, String>
fetch_ticktick_tasks() -> Result<TickTickData, String>
fetch_calendar_events() -> Result<Vec<CalendarEvent>, String>

// Google OAuth
start_google_oauth() -> Result<String, String>
complete_google_oauth(code: String) -> Result<(), String>
```

## Configuration

Location: `~/.config/inkdash/config.toml`

```toml
[weather]
latitude = 43.6532
longitude = -79.3832
timezone = "America/Toronto"

[stocks]
tickers = ["TRI", "VEQT.TO", "VGRO.TO", "ZGLD.TO"]

[ticktick]
access_token = "your-token-here"

[google_calendar]
client_id = "your-client-id"
client_secret = "your-client-secret"
access_token = ""
refresh_token = ""
token_expiry = ""

[timezones]
zones = [
  { name = "Minnesota", tz = "America/Chicago" },
  { name = "London", tz = "Europe/London" },
  { name = "Zug", tz = "Europe/Zurich" },
  { name = "India", tz = "Asia/Kolkata" },
  { name = "Australia", tz = "Australia/Sydney" }
]

[display]
fullscreen = false
```

## Google Calendar OAuth Flow

Desktop app OAuth flow:
1. User clicks "Connect Google Calendar"
2. Rust opens system browser to Google consent page
3. Google redirects to `http://localhost:8847/oauth/callback`
4. Rust exchanges auth code for tokens
5. Tokens saved to config, calendar data fetched

Token refresh handled automatically by backend.

## CI/CD

GitHub Actions workflow:
- Triggers on push to main or manual dispatch
- Builds Linux AppImage using tauri-action
- Uploads artifact for download

## Frontend Changes

- Delete `src/api/*.ts` files
- Update hooks to use `invoke()` instead of `fetch()`
- Replace Calendar iframe with native widget
- Add settings panel for OAuth triggers
- Add F11 fullscreen toggle

## Dependencies

Frontend:
- `@tauri-apps/api` v2

Backend (Cargo.toml):
- `tauri` v2
- `reqwest` for HTTP
- `serde` / `serde_json` for serialization
- `toml` for config
- `tokio` for async runtime
- `chrono` for date handling
- `dirs` for config paths
- `open` for launching browser
