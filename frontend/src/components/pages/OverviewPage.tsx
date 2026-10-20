import { CalendarWidget, TimeWidget, WeatherWidget, OpenThreadsWidget } from '@/components/widgets';

export function OverviewPage() {
  return (
    <div className="h-full w-full page-padding">
      {/* Reserve more room for the calendar and clocks; threads scroll within their row. */}
      <div className="h-full min-h-0 grid grid-rows-[minmax(0,3fr)_minmax(0,2fr)] gap-3 w-full">
        {/* Top Row - 3 equal width cards */}
        <div className="min-h-0 grid grid-cols-3 gap-3">
          <CalendarWidget />
          <TimeWidget />
          <WeatherWidget />
        </div>

        {/* Bottom Row - Open Threads spanning full width */}
        <div className="min-h-0">
          <OpenThreadsWidget />
        </div>
      </div>
    </div>
  );
}
