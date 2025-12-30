# inkdash

Personal dashboard for a 7-inch tablet, inspired by TRMNL e-ink displays.

## Features

- **4 swipeable pages**: Overview, Tasks (TickTick), Calendar (Google Calendar), Stocks
- **Bento-style overview**: Time/date, weather with daylight graph, world clocks, mini calendar
- **Auto theme switching**: Light mode (7am-7pm), dark mode (7pm-7am)
- **Touch-optimized**: Swipe navigation, no visible controls

## Tech Stack

- React 19 + TypeScript
- Vite 7
- Tailwind CSS + shadcn/ui
- Bun

## Development

```bash
bun install    # Install dependencies
bun dev        # Start dev server
bun run build  # Build for production
bun run lint   # Lint code
```

## Configuration

Edit config files in `src/config/` to customize:
- Timezones (default: Minnesota, London, Zug, India, Australia)
- Weather location (default: Toronto)
- Stock tickers (default: TRI, VEQT.TO, VGRO.TO, ZGLD.TO)

## Design

See `docs/plans/2025-12-30-dashboard-redesign.md` for full design spec.
Inspiration images in `.agents/inspiration/`.
