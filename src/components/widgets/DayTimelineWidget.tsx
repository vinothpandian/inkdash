import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface TimelineEvent {
  time: string; // 24h format "HH:MM"
  label: string;
  type: 'marker' | 'range-start' | 'range-end';
}

// Default schedule - can be made configurable later
const defaultSchedule: TimelineEvent[] = [
  { time: '06:30', label: 'Alarm', type: 'marker' },
  { time: '07:00', label: 'Wake up', type: 'marker' },
  { time: '08:30', label: 'Work', type: 'range-start' },
  { time: '18:00', label: '', type: 'range-end' },
  { time: '18:30', label: 'Bubble time', type: 'marker' },
  { time: '21:30', label: 'In bed', type: 'marker' },
  { time: '22:30', label: 'Sleep', type: 'marker' },
];

// Timeline bounds (6am to 11pm)
const TIMELINE_START = 6; // 6:00 AM
const TIMELINE_END = 23; // 11:00 PM
const TIMELINE_HOURS = TIMELINE_END - TIMELINE_START;

/**
 * DayTimelineWidget - Horizontal timeline showing daily schedule
 * Shows markers for key events with a hatched work period
 */
export function DayTimelineWidget() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  // Convert time string to position percentage
  const timeToPosition = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const totalHours = hours + minutes / 60;
    const position = ((totalHours - TIMELINE_START) / TIMELINE_HOURS) * 100;
    return Math.max(0, Math.min(100, position));
  };

  // Get current time position
  const getCurrentTimePosition = (): number => {
    const hours = currentTime.getHours() + currentTime.getMinutes() / 60;
    const position = ((hours - TIMELINE_START) / TIMELINE_HOURS) * 100;
    return Math.max(0, Math.min(100, position));
  };

  // Format time for display
  const formatTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHour = hours % 12 || 12;
    if (minutes === 0) {
      return `${displayHour}${ampm}`;
    }
    return `${displayHour}:${minutes.toString().padStart(2, '0')}`;
  };

  // Find work range for hatching
  const workStart = defaultSchedule.find((e) => e.type === 'range-start');
  const workEnd = defaultSchedule.find((e) => e.type === 'range-end');
  const workStartPos = workStart ? timeToPosition(workStart.time) : 0;
  const workEndPos = workEnd ? timeToPosition(workEnd.time) : 0;

  // Get marker events
  const markers = defaultSchedule.filter((e) => e.type === 'marker');

  const currentPos = getCurrentTimePosition();

  return (
    <Card className="h-full">
      <CardContent className="h-full flex flex-col justify-center p-6">
        <div className="relative h-20">
          {/* SVG for hatched pattern definition */}
          <svg className="absolute" width="0" height="0">
            <defs>
              <pattern
                id="hatch"
                patternUnits="userSpaceOnUse"
                width="6"
                height="6"
                patternTransform="rotate(45)"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="6"
                  className="stroke-foreground"
                  strokeWidth="1.5"
                />
              </pattern>
            </defs>
          </svg>

          {/* Event labels - positioned above timeline */}
          <div className="absolute top-0 left-0 right-0 h-8">
            {markers.map((event) => (
              <div
                key={event.time}
                className="absolute -translate-x-1/2 text-xs text-foreground whitespace-nowrap"
                style={{ left: `${timeToPosition(event.time)}%` }}
              >
                {event.label}
              </div>
            ))}
            {/* Work label */}
            {workStart && (
              <div
                className="absolute -translate-x-1/2 text-xs text-foreground whitespace-nowrap"
                style={{ left: `${(workStartPos + workEndPos) / 2}%` }}
              >
                Work
              </div>
            )}
          </div>

          {/* Main timeline container */}
          <div className="absolute top-10 left-0 right-0">
            {/* Timeline base line */}
            <div className="h-px bg-foreground/30" />

            {/* Work period hatching */}
            {workStart && workEnd && (
              <svg
                className="absolute -top-3 h-6"
                style={{
                  left: `${workStartPos}%`,
                  width: `${workEndPos - workStartPos}%`,
                }}
              >
                <rect width="100%" height="100%" fill="url(#hatch)" />
              </svg>
            )}

            {/* Event markers */}
            {markers.map((event) => (
              <div
                key={event.time}
                className="absolute -top-1.5 w-px h-3 bg-foreground"
                style={{ left: `${timeToPosition(event.time)}%` }}
              />
            ))}

            {/* Current time indicator */}
            {currentPos >= 0 && currentPos <= 100 && (
              <div
                className="absolute -top-2 w-2 h-2 bg-foreground rounded-full -translate-x-1/2"
                style={{ left: `${currentPos}%` }}
              />
            )}
          </div>

          {/* Time labels - positioned below timeline */}
          <div className="absolute top-14 left-0 right-0">
            {markers.map((event) => (
              <div
                key={event.time}
                className="absolute -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap"
                style={{ left: `${timeToPosition(event.time)}%` }}
              >
                {formatTime(event.time)}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
