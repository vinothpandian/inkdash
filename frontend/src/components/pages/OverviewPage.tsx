import { CalendarWidget, TimeWidget, WeatherWidget, OpenThreadsWidget } from '@/components/widgets';

export function OverviewPage() {
  return (
    <div className="h-full w-full page-padding">
      {/* Bento Grid Container - 50/50 split using calc to account for gap */}
      <div className="h-full flex flex-col gap-4 max-w-5xl mx-auto w-full">
        {/* Top Row - 3 equal width cards */}
        <div className="h-[calc(50%-0.5rem)] min-h-0 grid grid-cols-3 gap-4">
          <CalendarWidget />
          <TimeWidget />
          <WeatherWidget />
        </div>

        {/* Bottom Row - Open Threads spanning full width */}
        <div className="h-[calc(50%-0.5rem)] min-h-0">
          <OpenThreadsWidget />
        </div>
      </div>
    </div>
  );
}
