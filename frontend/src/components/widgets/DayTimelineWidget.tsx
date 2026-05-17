import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useTimeline } from '@/context/ConfigContext';
import type { TimelineEvent } from '@/types';

// Default timeline bounds (used as fallback)
const DEFAULT_START_HOUR = 6; // 6:00 AM
const DEFAULT_END_HOUR = 23; // 11:00 PM

// Stagger offset for labels that are too close together
const STAGGER_OFFSET = '10px';

// Default schedule (used when no config is available)
const defaultSchedule: TimelineEvent[] = [
  { time: '06:30', label: 'Alarm', type: 'marker' },
  { time: '07:00', label: 'Wake up', type: 'marker' },
  { time: '08:30', label: 'Work', type: 'range-start' },
  { time: '18:00', label: '', type: 'range-end' },
  { time: '18:30', label: 'Bubble time', type: 'marker' },
  { time: '21:30', label: 'In bed', type: 'marker' },
  { time: '22:30', label: 'Sleep', type: 'marker' },
];

interface EventWithRow extends TimelineEvent {
  row: number;
  position: number;
}

interface RangePair {
  start: TimelineEvent;
  end: TimelineEvent;
  startPos: number;
  endPos: number;
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
  const timeToPosition = useCallback(
    (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const totalHours = hours + minutes / 60;
      const position = ((totalHours - startHour) / timelineHours) * 100;
      return Math.max(0, Math.min(100, position));
    },
    [startHour, timelineHours]
  );

  // Get current time position
  const getCurrentTimePosition = (): number => {
    const hours = currentTime.getHours() + currentTime.getMinutes() / 60;
    const position = ((hours - startHour) / timelineHours) * 100;
    return Math.max(0, Math.min(100, position));
  };

  // Format time for display (h:mm format, no am/pm)
  const formatTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes.toString().padStart(2, '0')}`;
  };

  // Find all range pairs for hatching
  // Pairs range-start with the next range-end in chronological order
  const rangePairs = useMemo(() => {
    const pairs: RangePair[] = [];
    const rangeStarts = events
      .filter((e) => e.type === 'range-start')
      .sort((a, b) => timeToPosition(a.time) - timeToPosition(b.time));
    const rangeEnds = events
      .filter((e) => e.type === 'range-end')
      .sort((a, b) => timeToPosition(a.time) - timeToPosition(b.time));

    // Match each range-start with the nearest following range-end
    for (let i = 0; i < rangeStarts.length && i < rangeEnds.length; i++) {
      pairs.push({
        start: rangeStarts[i],
        end: rangeEnds[i],
        startPos: timeToPosition(rangeStarts[i].time),
        endPos: timeToPosition(rangeEnds[i].time),
      });
    }
    return pairs;
  }, [events, timeToPosition]);

  // Get marker events with row assignments for staggering
  // Assigns rows to events so labels that are too close together get staggered
  const markers = useMemo(() => {
    const markerEvents = events.filter((e) => e.type === 'marker');
    const minGapPercent = 5;

    const sorted = [...markerEvents].sort(
      (a, b) => timeToPosition(a.time) - timeToPosition(b.time)
    );

    // Use reduce to build the array with row assignments
    // This avoids mutable state reassignment that React compiler doesn't like
    const result = sorted.reduce<{
      items: EventWithRow[];
      lastPos: number;
      lastRow: number;
    }>(
      (acc, event) => {
        const pos = timeToPosition(event.time);
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
  }, [events, timeToPosition]);

  const currentPos = getCurrentTimePosition();

  // Show nothing while loading
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="h-full flex flex-col justify-center px-6 py-2">
          <div className="relative h-16">
            <div className="absolute top-8 left-0 right-0">
              <div className="h-px bg-foreground/30" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="h-full flex flex-col justify-center px-6 py-2">
        <div className="relative h-16">
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
          <div className="absolute top-0 left-0 right-0 h-6">
            {markers.map((event) => (
              <div
                key={event.time}
                className="absolute -translate-x-1/2 text-xs text-foreground whitespace-nowrap"
                style={{
                  left: `${event.position}%`,
                  top: event.row === 1 ? STAGGER_OFFSET : '-4px',
                }}
              >
                {event.label}
              </div>
            ))}
            {/* Range labels (centered over each range) */}
            {rangePairs.map((pair, index) => (
              <div
                key={`range-label-${index}`}
                className="absolute -translate-x-1/2 text-xs text-foreground whitespace-nowrap"
                style={{ left: `${(pair.startPos + pair.endPos) / 2}%` }}
              >
                {pair.start.label || 'Work'}
              </div>
            ))}
          </div>

          {/* Main timeline container */}
          <div className="absolute top-8 left-0 right-0">
            {/* Timeline base line */}
            <div className="h-px bg-foreground/30" />

            {/* Range period hatching */}
            {rangePairs.map((pair, index) => (
              <svg
                key={`range-hatch-${index}`}
                className="absolute -top-3 h-6"
                style={{
                  left: `${pair.startPos}%`,
                  width: `${pair.endPos - pair.startPos}%`,
                }}
              >
                <rect width="100%" height="100%" fill="url(#hatch)" />
              </svg>
            ))}

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
                className="absolute -top-1.5 size-3 bg-foreground rounded-full -translate-x-1/2"
                style={{ left: `${currentPos}%` }}
              />
            )}
          </div>

          {/* Time labels - positioned below timeline with staggering */}
          <div className="absolute top-10 left-0 right-0">
            {markers.map((event) => (
              <div
                key={event.time}
                className="absolute -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap"
                style={{
                  left: `${event.position}%`,
                  top: event.row === 1 ? STAGGER_OFFSET : '0px',
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
