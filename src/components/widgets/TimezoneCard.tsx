import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { TimezoneConfig } from '@/types';

interface TimezoneCardProps {
  config: TimezoneConfig;
}

/**
 * TimezoneCard - World clock card for a single timezone
 * Shows city name, local time, and offset from local timezone
 * Updates every second
 */
export function TimezoneCard({ config }: TimezoneCardProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time for the target timezone
  const timeString = time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: config.timezone,
  });

  // Calculate offset from local time
  const getOffset = () => {
    // Get local and target timezone offsets in minutes
    const localFormatter = new Intl.DateTimeFormat('en-US', {
      timeZoneName: 'shortOffset',
    });
    const targetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: config.timezone,
      timeZoneName: 'shortOffset',
    });

    // Extract offset from formatted strings (e.g., "GMT-5")
    const localParts = localFormatter.formatToParts(time);
    const targetParts = targetFormatter.formatToParts(time);

    const localOffset = localParts.find((p) => p.type === 'timeZoneName')?.value || '';
    const targetOffset = targetParts.find((p) => p.type === 'timeZoneName')?.value || '';

    // Parse offsets (format: "GMT+X" or "GMT-X" or "GMT+X:YY")
    const parseOffset = (offset: string): number => {
      const match = offset.match(/GMT([+-]?)(\d+)(?::(\d+))?/);
      if (!match) return 0;
      const sign = match[1] === '-' ? -1 : 1;
      const hours = parseInt(match[2], 10);
      const minutes = parseInt(match[3] || '0', 10);
      return sign * (hours * 60 + minutes);
    };

    const localMinutes = parseOffset(localOffset);
    const targetMinutes = parseOffset(targetOffset);
    const diffMinutes = targetMinutes - localMinutes;

    // Format the difference
    const diffHours = Math.floor(Math.abs(diffMinutes) / 60);
    const diffMins = Math.abs(diffMinutes) % 60;
    const sign = diffMinutes >= 0 ? '+' : '-';

    if (diffMinutes === 0) {
      return 'Same';
    }

    if (diffMins === 0) {
      return `${sign}${diffHours}h`;
    } else if (diffMins === 30) {
      return `${sign}${diffHours}\u00BD h`;
    } else {
      return `${sign}${diffHours}:${diffMins.toString().padStart(2, '0')}`;
    }
  };

  return (
    <Card className="h-full shadow-soft border-0">
      <CardContent className="h-full flex flex-col items-center justify-center p-4">
        {/* City name */}
        <div className="text-sm font-medium-labels text-foreground mb-2">
          {config.name}
        </div>

        {/* Time */}
        <div className="text-2xl font-light-numbers text-foreground">
          {timeString}
        </div>

        {/* Offset */}
        <div className="text-sm text-muted-foreground mt-1">
          {getOffset()}
        </div>
      </CardContent>
    </Card>
  );
}
