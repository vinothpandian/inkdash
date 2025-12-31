import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * TimeWidget - Hero time display
 * Shows large time, date, and day of week
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

  // Format time (e.g., "3:02 PM")
  const timeString = time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Format date (e.g., "30 December")
  const dateString = time.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
  });

  // Get day of week (e.g., "Tuesday")
  const dayOfWeek = time.toLocaleDateString('en-US', {
    weekday: 'long',
  });

  return (
    <Card className="h-full">
      <CardContent className="h-full flex flex-col items-center justify-center p-4">
        {/* Large time display */}
        <div className="text-4xl sm:text-5xl font-light-numbers text-foreground">
          {timeString}
        </div>

        {/* Date */}
        <div className="text-lg font-light text-foreground mt-2">
          {dateString}
        </div>

        {/* Day of week */}
        <div className="text-sm text-muted-foreground mt-0.5">
          {dayOfWeek}
        </div>
      </CardContent>
    </Card>
  );
}
