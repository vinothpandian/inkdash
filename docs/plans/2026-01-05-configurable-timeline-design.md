# Configurable Timeline Widget Design

## Overview

Make DayTimelineWidget configurable via a separate `timeline.toml` file with support for day-of-week overrides and add a reload config button to the dock.

## TOML File Structure

**Location:** `~/.config/inkdash/timeline.toml`

```toml
# Timeline bounds (optional, defaults shown)
start_hour = 6   # 6 AM
end_hour = 23    # 11 PM

[default]
events = [
  { time = "06:30", label = "Alarm", type = "marker" },
  { time = "07:00", label = "Wake up", type = "marker" },
  { time = "08:30", label = "Work", type = "range-start" },
  { time = "18:00", label = "", type = "range-end" },
  { time = "18:30", label = "Bubble time", type = "marker" },
  { time = "21:30", label = "In bed", type = "marker" },
  { time = "22:30", label = "Sleep", type = "marker" },
]

[[overrides]]
days = ["tuesday", "thursday"]
events = [
  { time = "06:00", label = "Alarm", type = "marker" },
  # different schedule...
]

[[overrides]]
days = ["saturday", "sunday"]
events = [
  { time = "08:00", label = "Wake up", type = "marker" },
  # weekend schedule...
]
```

Days use lowercase names: `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`.

## Rust Backend

**New file:** `src-tauri/src/timeline.rs`

```rust
struct TimelineEvent {
    time: String,      // "HH:MM"
    label: String,
    r#type: String,    // "marker" | "range-start" | "range-end"
}

struct TimelineOverride {
    days: Vec<String>,
    events: Vec<TimelineEvent>,
}

struct TimelineConfig {
    start_hour: Option<u8>,  // defaults to 6
    end_hour: Option<u8>,    // defaults to 23
    default: Schedule,
    overrides: Option<Vec<TimelineOverride>>,
}
```

**Tauri command:** `get_timeline`
- Loads `timeline.toml` from config dir
- Determines current day of week
- Returns the matching schedule (override if exists, else default)
- If no file exists, returns hardcoded default (current behavior)

## Label Collision Handling

**Problem:** Events within ~30 minutes overlap visually.

**Solution:** Stagger labels vertically when events are close together.

```
        Alarm           Work                    In bed
              Wake up        Bubble time              Sleep
    ──┼────┼─────────▒▒▒▒▒▒▒▒▒▒▒▒┼────────────┼────┼────●──
     6:30  7am      8:30am    6:30pm        9:30  10:30
```

**Algorithm:**
1. Sort events by time
2. For each event, check if it's within X% of the previous event's position
3. If too close, alternate to a second row (offset down)
4. Apply same logic to time labels below

## Dock Reload Button

**Layout:**
```
[ sun ] | [ . Home . . ] | [ reload ]
 theme    page navigation   reload
```

Two dividers separate the three action groups.

**Behavior:**
- Icon: `RotateCcw` from lucide-react
- On click: Calls `reload_config` Tauri command
- Reloads both `config.toml` and `timeline.toml`
- Brief visual feedback (icon spins during reload)

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                      Dashboard                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │              ConfigProvider                      │   │
│  │  - config (from config.toml)                    │   │
│  │  - timeline (from timeline.toml)                │   │
│  │  - reloadConfig() function                      │   │
│  └─────────────────────────────────────────────────┘   │
│         │                              │                │
│         ▼                              ▼                │
│  ┌─────────────┐              ┌──────────────────┐     │
│  │    Dock     │              │ DayTimelineWidget │     │
│  │ reload btn  │              │ uses timeline     │     │
│  └─────────────┘              └──────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

**On app start:**
1. Tauri loads both config files
2. Frontend fetches via `get_config` and `get_timeline`
3. Context provides data to all components

**On reload click:**
1. Call `invoke('reload_config')`
2. Rust re-reads both TOML files
3. Frontend updates context state
4. Components re-render with new data

## Files to Create/Modify

### New Files
- `src-tauri/src/timeline.rs` - Timeline config loading
- `config/timeline.example.toml` - Example timeline config
- `src/context/ConfigContext.tsx` - React context for config/timeline

### Modified Files
- `src-tauri/src/lib.rs` - Register new Tauri commands
- `src/components/widgets/DayTimelineWidget.tsx` - Use timeline from context, add label staggering
- `src/components/Dashboard.tsx` - Wrap with ConfigProvider, add reload button to dock
