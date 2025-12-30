# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

inkdash is a personal dashboard web application inspired by e-ink/minimal dashboard designs. The UI should feature widget-style cards displaying time zones, weather, calendar, and stock information with a clean, muted aesthetic.

Design references are in `.agents/inspiration/` - these show the target aesthetic: rounded cards, subtle shadows, minimal color usage, and information-dense but clean layouts.

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
- **Bun** as package manager
- ESLint with React hooks and refresh plugins
- Strict TypeScript configuration (ES2022 target)

## Architecture

Currently a minimal Vite + React starter. The codebase is ready for:
- Component-based widget architecture (time, weather, calendar, stocks)
- CSS modules or styled-components for widget styling
- State management for dashboard configuration
- API integrations for weather/stock data
