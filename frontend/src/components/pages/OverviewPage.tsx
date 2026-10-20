import { CalendarWidget, TimeWidget, WeatherWidget, OpenThreadsWidget } from '@/components/widgets';

export function OverviewPage() {
  return (
    <div className="overview-page h-full w-full">
      {/* Keep the daily overview together and let threads scroll independently. */}
      <div className="overview-layout">
        {/* Top Row - 3 equal width cards */}
        <div className="overview-widgets">
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
