# inkdash Dashboard Redesign

## Overview

Personal dashboard application for a 7-inch tablet in landscape orientation. Inspired by TRMNL e-ink displays with a clean, minimal aesthetic.

## Pages

### Page 1: Overview (Bento Layout)

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────┐  ┌───────────────────┐  ┌───────────────┐  │
│  │                 │  │                   │  │   Overcast    │  │
│  │  December 2025  │  │     3:02 PM       │  │ Feels like -13│  │
│  │  [mini month]   │  │   30 December     │  │    ▁▂▃▅▃▂▁    │  │
│  │                 │  │     Tuesday       │  │  ░░▓▓▓▓▓░░    │  │
│  │                 │  │                   │  │  6am    10pm  │  │
│  │                 │  │                   │  │    Toronto    │  │
│  └─────────────────┘  └───────────────────┘  └───────────────┘  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐  │
│  │Minnesota│ │ London  │ │   Zug   │ │  India  │ │ Australia │  │
│  │ 2:02 PM │ │ 8:02 PM │ │ 9:02 PM │ │ 1:32 AM │ │  7:02 AM  │  │
│  │   -1h   │ │   +5h   │ │   +6h   │ │  +10½h  │ │   +16h    │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └───────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Top row (3 cards)**:
- Calendar (left): Mini month view with current day highlighted
- Time/Date (center): Large time display, date and day of week below
- Weather (right): Condition, "feels like" temperature, hourly bar chart with daylight hours highlighted, location

**Bottom row (5 cards)**:
- Timezone cards for: Minnesota (-1h), London (+5h), Zug (+6h), India (+10½h), Australia (+16h)
- Each shows: city name, local time, offset from local time

### Page 2: Tasks

Full-page TickTick iframe. User authenticates directly in the embedded view.

### Page 3: Calendar

Full-page Google Calendar iframe. User authenticates directly in the embedded view.

### Page 4: Stocks

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────┐  ┌──────────────────────────────┐ │
│  │  TRI          -0.18%     │  │  VEQT.TO        -1.28%       │ │
│  │  Thomson Reuters         │  │  Vanguard All-Equity         │ │
│  │  $132.98    ~~~~~~~~~~~~ │  │  C$54.03       ~~~~~~~~~~~~  │ │
│  └──────────────────────────┘  └──────────────────────────────┘ │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐ │
│  │  VGRO.TO      -0.48%     │  │  ZGLD.TO        +0.30%       │ │
│  │  Vanguard Growth         │  │  BMO Gold ETF                │ │
│  │  C$43.12    ~~~~~~~~~~~~ │  │  C$24.50       ~~~~~~~~~~~~  │ │
│  └──────────────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

2x2 grid of stock cards. Each card shows: ticker, percentage change (colored red/green), company name, current price, mini sparkline chart.

## Navigation

- Swipe gestures only (no visible indicators)
- Horizontal swipe to move between pages
- Touch-optimized for tablet use

## Theming

### Auto Light/Dark Mode

- Switches automatically based on time of day
- Light mode: 7am - 7pm
- Dark mode: 7pm - 7am
- Uses Tailwind `dark:` variants with class strategy

### Visual Tokens

- Background: `hsl(0 0% 96%)` light / `hsl(0 0% 10%)` dark
- Cards: `hsl(0 0% 100%)` light / `hsl(0 0% 16%)` dark
- Border radius: `1.25rem` (20px)
- Shadows: Soft, diffused (`0 2px 20px rgba(0,0,0,0.06)`)
- Typography: System UI stack, light weights for large numbers (300), medium for labels (500)
- Spacing: Generous padding (16-24px)

## Technical Stack

- React 19 + TypeScript
- Vite 7 (rolldown)
- Tailwind CSS
- shadcn/ui for components and theming
- Bun package manager

## File Structure

```
src/
├── components/
│   ├── ui/                  # shadcn components
│   │   └── card.tsx
│   ├── Dashboard.tsx        # Main container with swipe logic
│   ├── pages/
│   │   ├── OverviewPage.tsx
│   │   ├── TasksPage.tsx
│   │   ├── CalendarPage.tsx
│   │   └── StocksPage.tsx
│   └── widgets/
│       ├── CalendarWidget.tsx
│       ├── TimeWidget.tsx
│       ├── WeatherWidget.tsx
│       ├── TimezoneCard.tsx
│       └── StockCard.tsx
├── hooks/
│   ├── useSwipe.ts          # Touch gesture handling
│   └── useTheme.ts          # Auto light/dark switching
├── lib/
│   └── utils.ts             # shadcn cn() helper
├── types/
│   └── index.ts
└── utils/
    └── time.ts              # Timezone calculations
```

## Data Sources

| Widget | Source | Notes |
|--------|--------|-------|
| Time/Date | JavaScript Date | Real-time, updates every second |
| Timezones | Intl API | Offline capable |
| Weather | Mock data | Ready for OpenWeather API integration |
| Calendar widget | Static month | Separate from Google Calendar iframe |
| Stocks | Mock data | Ready for Yahoo Finance API integration |

## Configuration

Timezone and stock configurations stored in TypeScript config files for easy customization:

```typescript
// src/config/timezones.ts
export const timezones = [
  { name: 'Minnesota', timezone: 'America/Chicago' },
  { name: 'London', timezone: 'Europe/London' },
  { name: 'Zug', timezone: 'Europe/Zurich' },
  { name: 'India', timezone: 'Asia/Kolkata' },
  { name: 'Australia', timezone: 'Australia/Sydney' },
]

// src/config/stocks.ts
export const stocks = [
  { ticker: 'TRI', name: 'Thomson Reuters' },
  { ticker: 'VEQT.TO', name: 'Vanguard All-Equity' },
  { ticker: 'VGRO.TO', name: 'Vanguard Growth' },
  { ticker: 'ZGLD.TO', name: 'BMO Gold ETF' },
]
```

## Design References

Inspiration images in `.agents/inspiration/`:
- `original.png` - Current design (layout reference)
- `good_one.png` - Target aesthetic (card style, shadows)
- `good_two.png` - Target aesthetic (calendar widgets, typography)
