import { CalendarWidget, TimeWidget, WeatherWidget, TimezoneCard } from '@/components/widgets';
import { timezones } from '@/config/timezones';

/**
 * OverviewPage - Main dashboard with responsive bento-style grid layout
 *
 * Desktop (landscape tablet):
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  ┌─────────────────┐  ┌───────────────────┐  ┌───────────────┐  │
 * │  │    Calendar     │  │      Time         │  │    Weather    │  │
 * │  │   (mini month)  │  │   (hero clock)    │  │  (forecast)   │  │
 * │  └─────────────────┘  └───────────────────┘  └───────────────┘  │
 * │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐  │
 * │  │   TZ1   │ │   TZ2   │ │   TZ3   │ │   TZ4   │ │    TZ5    │  │
 * │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └───────────┘  │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Mobile/Portrait:
 * Time widget spans full width, other widgets stack in 2-column grid
 */
export function OverviewPage() {
  return (
    <div className="h-full w-full page-padding flex flex-col overflow-hidden">
      {/* Bento Grid Container - fills available space with uniform gaps */}
      <div className="flex-1 grid grid-rows-[7fr_3fr] gap-4 max-w-5xl mx-auto w-full min-h-0">
        {/* Top Row - 3 equal width cards */}
        <div className="grid grid-cols-3 gap-4 min-h-0">
          <CalendarWidget />
          <TimeWidget />
          <WeatherWidget />
        </div>

        {/* Bottom Row - 5 timezone cards */}
        <div className="grid grid-cols-5 gap-4 min-h-0">
          {timezones.map((tz) => (
            <TimezoneCard key={tz.timezone} config={tz} />
          ))}
        </div>
      </div>
    </div>
  );
}
