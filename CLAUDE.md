# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

inkdash is a personal dashboard desktop app for Linux, built with Tauri. Runs in fullscreen on a 7-inch tablet. Inspired by TRMNL e-ink displays with a clean, minimal aesthetic.

**4 Pages** (swipe navigation):
1. **Overview** - Bento grid with calendar, time/date, weather (with daylight graph), 5 timezone cards
2. **Tasks** - TickTick tasks fetched via API
3. **Calendar** - Google Calendar events via OAuth
4. **Stocks** - 2x2 grid (TRI, VEQT.TO, VGRO.TO, ZGLD.TO)

Design references in `.agents/inspiration/` show target aesthetic.

## Commands

```bash
bun tauri:dev     # Start Tauri dev mode (frontend + backend)
bun tauri:build   # Build Linux AppImage
bun dev           # Frontend only dev server
bun run build     # Frontend only production build
bun run lint      # Run ESLint
```

## Tech Stack

**Frontend:**
- React 19 with TypeScript
- Vite 7 (rolldown-vite) for bundling
- Tailwind CSS for styling
- shadcn/ui for components

**Backend (Tauri):**
- Rust with Tauri v2
- reqwest for HTTP requests
- tokio for async runtime
- All API calls happen in Rust (secure)

## Architecture

```
src/                          # React frontend
├── components/
│   ├── ui/                   # shadcn components
│   ├── Dashboard.tsx         # Main container with swipe logic
│   ├── pages/                # Page components
│   └── widgets/              # Widget components
├── hooks/
│   ├── useWeather.ts         # Weather data via Tauri invoke
│   ├── useStocks.ts          # Stock data via Tauri invoke
│   ├── useTickTick.ts        # Tasks via Tauri invoke
│   ├── useCalendar.ts        # Calendar events via Tauri invoke
│   ├── useSwipe.ts           # Touch gesture handling
│   └── useTheme.ts           # Auto light/dark (7am/7pm)
├── types/                    # TypeScript type definitions
└── config/                   # Frontend config

src-tauri/                    # Rust backend
├── src/
│   ├── lib.rs                # Tauri commands
│   ├── config.rs             # Config loading/saving
│   ├── api/
│   │   ├── weather.rs        # Open-Meteo API
│   │   ├── stocks.rs         # Yahoo Finance API
│   │   ├── ticktick.rs       # TickTick API
│   │   └── calendar.rs       # Google Calendar API
│   └── oauth/
│       └── google.rs         # Google OAuth flow
└── tauri.conf.json           # Tauri configuration
```

## Configuration

App configuration is stored in `~/.config/inkdash/config.toml`. See `config/config.example.toml` for the template.

**Configured via config.toml:**
- Weather location (latitude, longitude)
- Stock tickers
- TickTick access token
- Google Calendar OAuth credentials
- Timezones to display

## Styling Guidelines

- Always use Tailwind CSS utilities
- Use shadcn/ui Card component for widgets
- Dark mode via `dark:` variants (class strategy)
- Theme tokens defined in CSS variables (shadcn pattern)
- Visual style: soft shadows, 20px radius, generous spacing

## F11 Fullscreen Toggle

Press F11 to toggle fullscreen mode. The setting persists in config.toml.

## CI/CD

GitHub Actions builds Linux AppImage on push to main. Download from Actions > Artifacts.
