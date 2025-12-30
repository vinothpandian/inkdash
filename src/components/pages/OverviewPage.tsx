import { CalendarWidget, TimeWidget, WeatherWidget, TimezoneCard } from '@/components/widgets';
import { timezones } from '@/config/timezones';

/**
 * OverviewPage - Main dashboard with bento-style grid layout
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  ┌─────────────────┐  ┌───────────────────┐  ┌───────────────┐  │
 * │  │    Calendar     │  │      Time         │  │    Weather    │  │
 * │  │   (mini month)  │  │   (hero clock)    │  │  (forecast)   │  │
 * │  └─────────────────┘  └───────────────────┘  └───────────────┘  │
 * │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐  │
 * │  │   TZ1   │ │   TZ2   │ │   TZ3   │ │   TZ4   │ │    TZ5    │  │
 * │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └───────────┘  │
 * └─────────────────────────────────────────────────────────────────┘
 */
export function OverviewPage() {
  return (
    <div className="h-full w-full p-6 flex flex-col">
      {/* Bento Grid Container */}
      <div className="flex-1 flex flex-col gap-5 max-w-5xl mx-auto w-full">
        {/* Top Row - 3 equal width cards */}
        <div className="grid grid-cols-3 gap-5 flex-[2]">
          <CalendarWidget />
          <TimeWidget />
          <WeatherWidget />
        </div>

        {/* Bottom Row - 5 timezone cards */}
        <div className="grid grid-cols-5 gap-5 flex-1">
          {timezones.map((tz) => (
            <TimezoneCard key={tz.timezone} config={tz} />
          ))}
        </div>
      </div>
    </div>
  );
}
