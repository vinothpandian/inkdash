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
    <Card className="h-full shadow-soft border-0 flex flex-col">
      <CardContent className="flex-1 flex flex-col items-center justify-center p-5">
        {/* Large time display */}
        <div className="text-6xl font-light-numbers tracking-tight text-foreground">
          {timeString}
        </div>

        {/* Date */}
        <div className="text-xl font-light text-foreground mt-3">
          {dateString}
        </div>

        {/* Day of week */}
        <div className="text-lg text-muted-foreground mt-1">
          {dayOfWeek}
        </div>
      </CardContent>
    </Card>
  );
}
