import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { timezones } from '@/config/timezones';

/**
 * 24-hour bar showing working hours (9-5) with current time marker
 */
function WorkingHoursBar({ timezone, currentTime }: { timezone: string; currentTime: Date }) {
  // Get current hour in the target timezone
  const tzTime = new Date(currentTime.toLocaleString('en-US', { timeZone: timezone }));
  const currentHour = tzTime.getHours() + tzTime.getMinutes() / 60;
  const currentPosition = (currentHour / 24) * 100;

  // Working hours: 9am-5pm (9-17)
  const workStart = (9 / 24) * 100;
  const workEnd = (17 / 24) * 100;

  // Day hours: 6am-9pm (6-21)
  const dayStart = (6 / 24) * 100;
  const dayEnd = (21 / 24) * 100;

  return (
    <div className="relative w-24 h-2">
      {/* Base bar - night (muted) */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{ backgroundColor: 'hsl(var(--muted-foreground) / 0.25)' }}
      >
        {/* Day hours (slightly lighter) */}
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: `${dayStart}%`,
            width: `${dayEnd - dayStart}%`,
            backgroundColor: 'hsl(var(--muted-foreground) / 0.4)',
          }}
        />
        {/* Working hours (warm amber - same as weather widget) */}
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: `${workStart}%`,
            width: `${workEnd - workStart}%`,
            backgroundColor: 'hsl(45 70% 65%)',
          }}
        />
      </div>
      {/* Current time marker */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-foreground"
        style={{ left: `${currentPosition}%`, transform: 'translateX(-50%)' }}
      />
    </div>
  );
}

/**
 * TimeWidget - Hero time display with world clocks
 * Shows date, day, large time, and timezone working hours visualization
 * Updates every second
 */
export function TimeWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time (e.g., "7:12 AM")
  const timeString = time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Format date (e.g., "January 5")
  const dateString = time.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });

  // Get day of week (e.g., "Monday")
  const dayOfWeek = time.toLocaleDateString('en-US', {
    weekday: 'long',
  });

  // Format timezone time compactly (e.g., "7:16am")
  const getTimezoneTime = (timezone: string) => {
    const tzTime = new Date(time.toLocaleString('en-US', { timeZone: timezone }));
    const hours = tzTime.getHours();
    const minutes = tzTime.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHour = hours % 12 || 12;
    return { time: `${displayHour}:${minutes.toString().padStart(2, '0')}`, ampm };
  };

  return (
    <Card className="h-full">
      <CardContent className="h-full flex flex-col items-center justify-center p-4">
        {/* Date */}
        <div className="text-base font-medium-labels text-foreground tracking-wide">
          {dateString}
        </div>

        {/* Day of week */}
        <div className="text-sm text-muted-foreground/70">
          {dayOfWeek}
        </div>

        {/* Large time display */}
        <div className="text-[3.25rem] font-light-numbers text-foreground mt-2 tracking-tight">
          {timeString}
        </div>

        {/* Timezone list with working hours bars */}
        <div className="mt-3 space-y-0.5 mx-auto">
          {timezones.map((tz) => {
            const { time: tzTime, ampm } = getTimezoneTime(tz.timezone);
            return (
              <div key={tz.timezone} className="flex items-center gap-2">
                {/* City name */}
                <span className="text-xs text-foreground w-16 truncate">{tz.name}</span>
                {/* Working hours bar */}
                <WorkingHoursBar timezone={tz.timezone} currentTime={time} />
                {/* Time */}
                <span className="text-xs tabular-nums w-14 text-right">
                  <span className="text-foreground">{tzTime}</span>
                  <span className="text-muted-foreground text-[10px]">{ampm}</span>
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
