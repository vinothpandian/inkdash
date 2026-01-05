import { CalendarWidget, TimeWidget, WeatherWidget, DayTimelineWidget } from '@/components/widgets';

/**
 * OverviewPage - Main dashboard with responsive bento-style grid layout
 *
 * Desktop (landscape tablet):
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  ┌─────────────────┐  ┌───────────────────┐  ┌───────────────┐  │
 * │  │    Calendar     │  │      Time         │  │    Weather    │  │
 * │  │   (mini month)  │  │ (clock+timezones) │  │  (forecast)   │  │
 * │  └─────────────────┘  └───────────────────┘  └───────────────┘  │
 * │  ┌─────────────────────────────────────────────────────────────┐│
 * │  │                     Day Timeline                            ││
 * │  └─────────────────────────────────────────────────────────────┘│
 * └─────────────────────────────────────────────────────────────────┘
 */
export function OverviewPage() {
  return (
    <div className="h-full w-full page-padding">
      {/* Bento Grid Container - 65/35 split using calc to account for gap */}
      <div className="h-full flex flex-col gap-4 max-w-5xl mx-auto w-full">
        {/* Top Row - 3 equal width cards */}
        <div className="h-[calc(65%-0.5rem)] grid grid-cols-3 gap-4">
          <CalendarWidget />
          <TimeWidget />
          <WeatherWidget />
        </div>

        {/* Bottom Row - Day timeline spanning full width */}
        <div className="h-[calc(35%-0.5rem)]">
          <DayTimelineWidget />
        </div>
      </div>
    </div>
  );
}
