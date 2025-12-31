# inkdash

Personal dashboard desktop app for Linux, built with Tauri. Designed for a 7-inch tablet running in fullscreen, inspired by TRMNL e-ink displays.

![inkdash screenshot](docs/screenshot.png)

## Features

- **4 swipeable pages**: Overview, Tasks (TickTick), Calendar (Google Calendar), Stocks
- **Bento-style overview**: Time/date, weather with hourly forecast, world clocks, mini calendar
- **Auto theme switching**: Light mode (7am-7pm), dark mode (7pm-7am)
- **Touch-optimized**: Swipe navigation, floating dock on hover
- **Secure API calls**: All external API calls made through Rust backend
- **Google Calendar OAuth**: Multi-calendar support with week/day views

## Downloads

Get the latest release from [GitHub Releases](https://github.com/vinothpandian/inkdash/releases):

- **AppImage**: Portable Linux application (recommended)
- **deb**: Debian/Ubuntu package

```bash
# Run the AppImage
chmod +x inkdash_*.AppImage
./inkdash_*.AppImage
```

## Tech Stack

**Frontend:**
- React 19 + TypeScript
- Vite 7 (rolldown-vite)
- Tailwind CSS + shadcn/ui
- Recharts for weather visualization

**Backend (Tauri v2):**
- Rust
- reqwest for HTTP requests
- tokio for async runtime

## Development

```bash
bun install       # Install dependencies
bun tauri:dev     # Start Tauri dev mode (frontend + backend)
bun tauri:build   # Build Linux AppImage
bun dev           # Frontend only dev server
bun run lint      # Lint code
```

## Configuration

Configuration is stored in a TOML file:
- **macOS**: `~/Library/Application Support/inkdash/config.toml`
- **Linux**: `~/.config/inkdash/config.toml`

See [`config/config.example.toml`](config/config.example.toml) for a template.

### Weather
Set your location coordinates and timezone for accurate weather data (Open-Meteo API).

### Timezones
Configure up to 5 world clocks with custom labels.

### Stocks
Add your stock tickers (supports Yahoo Finance symbols like `VEQT.TO`).

### TickTick Tasks
Add your TickTick OAuth credentials. See [TickTick Setup Guide](docs/TICKTICK_SETUP.md).

### Google Calendar
Add your Google OAuth credentials for calendar integration. The app will guide you through the OAuth flow on first run.

## Keyboard Shortcuts

- **F11**: Toggle fullscreen mode

## CI/CD

GitHub Actions automatically builds and releases:
- Triggers on push to `main` branch
- Builds Linux AppImage and deb package
- Creates GitHub Release with downloadable artifacts

## Architecture

```
src/                          # React frontend
├── components/
│   ├── ui/                   # shadcn components
│   ├── pages/                # Page components (Overview, Tasks, Calendar, Stocks)
│   └── widgets/              # Widget components
├── hooks/                    # React hooks for data fetching via Tauri
└── config/                   # Frontend configuration

src-tauri/                    # Rust backend
├── src/
│   ├── api/                  # External API integrations
│   │   ├── weather.rs        # Open-Meteo API
│   │   ├── stocks.rs         # Yahoo Finance API
│   │   ├── ticktick.rs       # TickTick API
│   │   └── calendar.rs       # Google Calendar API
│   ├── oauth/                # OAuth flows
│   └── config.rs             # Config management
└── tauri.conf.json           # Tauri configuration
```

## License

MIT
