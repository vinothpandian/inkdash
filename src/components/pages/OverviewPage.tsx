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
    <div className="h-full w-full page-padding">
      {/* Bento Grid Container - 60/40 split using calc to account for gap */}
      <div className="h-full flex flex-col gap-4 max-w-5xl mx-auto w-full">
        {/* Top Row - 3 equal width cards (60% minus half gap) */}
        <div className="h-[calc(60%-0.5rem)] grid grid-cols-3 gap-4">
          <CalendarWidget />
          <TimeWidget />
          <WeatherWidget />
        </div>

        {/* Bottom Row - 5 timezone cards (40% minus half gap) */}
        <div className="h-[calc(40%-0.5rem)] grid grid-cols-5 gap-4">
          {timezones.map((tz) => (
            <TimezoneCard key={tz.timezone} config={tz} />
          ))}
        </div>
      </div>
    </div>
  );
}
