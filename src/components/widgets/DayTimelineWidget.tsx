import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useTimeline } from '@/context/ConfigContext';
import type { TimelineEvent } from '@/types';

// Default timeline bounds (used as fallback)
const DEFAULT_START_HOUR = 6; // 6:00 AM
const DEFAULT_END_HOUR = 23; // 11:00 PM

// Default schedule (used when no config is available)
const defaultSchedule: TimelineEvent[] = [
  { time: '06:30', label: 'Alarm', event_type: 'marker' },
  { time: '07:00', label: 'Wake up', event_type: 'marker' },
  { time: '08:30', label: 'Work', event_type: 'range-start' },
  { time: '18:00', label: '', event_type: 'range-end' },
  { time: '18:30', label: 'Bubble time', event_type: 'marker' },
  { time: '21:30', label: 'In bed', event_type: 'marker' },
  { time: '22:30', label: 'Sleep', event_type: 'marker' },
];

interface EventWithRow extends TimelineEvent {
  row: number;
  position: number;
}

/**
 * DayTimelineWidget - Horizontal timeline showing daily schedule
 * Shows markers for key events with a hatched work period
 */
export function DayTimelineWidget() {
  const { timeline, isLoading } = useTimeline();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Use timeline from context, or fall back to defaults
  const events = timeline?.events ?? defaultSchedule;
  const startHour = timeline?.start_hour ?? DEFAULT_START_HOUR;
  const endHour = timeline?.end_hour ?? DEFAULT_END_HOUR;
  const timelineHours = endHour - startHour;

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
    const position = ((totalHours - startHour) / timelineHours) * 100;
    return Math.max(0, Math.min(100, position));
  };

  // Get current time position
  const getCurrentTimePosition = (): number => {
    const hours = currentTime.getHours() + currentTime.getMinutes() / 60;
    const position = ((hours - startHour) / timelineHours) * 100;
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
  const workStart = events.find((e) => e.event_type === 'range-start');
  const workEnd = events.find((e) => e.event_type === 'range-end');
  const workStartPos = workStart ? timeToPosition(workStart.time) : 0;
  const workEndPos = workEnd ? timeToPosition(workEnd.time) : 0;

  // Get marker events with row assignments for staggering
  // Assigns rows to events so labels that are too close together get staggered
  const markers = useMemo(() => {
    const markerEvents = events.filter((e) => e.event_type === 'marker');
    const minGapPercent = 5;

    // Calculate position for a time string
    const calcPosition = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const totalHours = hours + minutes / 60;
      const pos = ((totalHours - startHour) / timelineHours) * 100;
      return Math.max(0, Math.min(100, pos));
    };

    const sorted = [...markerEvents].sort(
      (a, b) => calcPosition(a.time) - calcPosition(b.time)
    );

    // Use reduce to build the array with row assignments
    // This avoids mutable state reassignment that React compiler doesn't like
    const result = sorted.reduce<{
      items: EventWithRow[];
      lastPos: number;
      lastRow: number;
    }>(
      (acc, event) => {
        const pos = calcPosition(event.time);
        const gap = pos - acc.lastPos;
        const row = gap < minGapPercent ? (acc.lastRow === 0 ? 1 : 0) : 0;
        return {
          items: [...acc.items, { ...event, row, position: pos }],
          lastPos: pos,
          lastRow: row,
        };
      },
      { items: [], lastPos: -100, lastRow: 1 }
    );

    return result.items;
  }, [events, startHour, timelineHours]);

  const currentPos = getCurrentTimePosition();

  // Show nothing while loading
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="h-full flex flex-col justify-center p-6">
          <div className="relative h-20">
            <div className="absolute top-10 left-0 right-0">
              <div className="h-px bg-foreground/30" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

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

          {/* Event labels - positioned above timeline with staggering */}
          <div className="absolute top-0 left-0 right-0 h-8">
            {markers.map((event) => (
              <div
                key={event.time}
                className="absolute -translate-x-1/2 text-xs text-foreground whitespace-nowrap"
                style={{
                  left: `${event.position}%`,
                  top: event.row === 1 ? '12px' : '0px',
                }}
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
                {workStart.label || 'Work'}
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
                style={{ left: `${event.position}%` }}
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

          {/* Time labels - positioned below timeline with staggering */}
          <div className="absolute top-14 left-0 right-0">
            {markers.map((event) => (
              <div
                key={event.time}
                className="absolute -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap"
                style={{
                  left: `${event.position}%`,
                  top: event.row === 1 ? '12px' : '0px',
                }}
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
