# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

inkdash is a personal dashboard for a 7-inch tablet (landscape). Inspired by TRMNL e-ink displays with a clean, minimal aesthetic.

**4 Pages** (swipe navigation):
1. **Overview** - Bento grid with calendar, time/date, weather (with daylight graph), 5 timezone cards
2. **Tasks** - TickTick iframe
3. **Calendar** - Google Calendar iframe
4. **Stocks** - 2x2 grid (TRI, VEQT.TO, VGRO.TO, ZGLD.TO)

Design references in `.agents/inspiration/` show target aesthetic. Full design spec in `docs/plans/2025-12-30-dashboard-redesign.md`.

## Commands

```bash
bun dev        # Start dev server with HMR
bun run build  # Type-check and build for production
bun run lint   # Run ESLint
bun run preview # Preview production build
```

## Tech Stack

- **React 19** with TypeScript
- **Vite 7** (rolldown-vite) for bundling
- **Tailwind CSS** for styling
- **shadcn/ui** for components and theming (always use this for UI components)
- **Bun** as package manager

## Architecture

```
src/
├── components/
│   ├── ui/                  # shadcn components
│   ├── Dashboard.tsx        # Main container with swipe logic
│   ├── pages/               # Page components
│   └── widgets/             # Widget components
├── hooks/
│   ├── useSwipe.ts          # Touch gesture handling
│   └── useTheme.ts          # Auto light/dark (7am/7pm)
├── lib/utils.ts             # shadcn cn() helper
├── config/                  # Timezone and stock configs
└── utils/time.ts            # Timezone calculations
```

## Styling Guidelines

- Always use Tailwind CSS utilities
- Use shadcn/ui Card component for widgets
- Dark mode via `dark:` variants (class strategy)
- Theme tokens defined in CSS variables (shadcn pattern)
- Visual style: soft shadows, 20px radius, generous spacing

## Configuration

Timezones: Minnesota, London, Zug, India, Australia
Weather: Toronto
Stocks: TRI, VEQT.TO, VGRO.TO, ZGLD.TO

These are defined in TypeScript config files for easy customization.
