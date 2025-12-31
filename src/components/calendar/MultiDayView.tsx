import { useMemo } from 'react';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { CALENDAR_COLORS, type ProcessedEvent } from '../../config/calendar';
import {
  isSameDay,
  formatTime,
  calculateEventPosition,
  getHoursArray,
  getStartOfDay,
} from '../../utils/calendar';

interface MultiDayViewProps {
  currentDate: Date;
  events: ProcessedEvent[];
  numberOfDays?: number; // Default to 3 days
}

export function MultiDayView({
  currentDate,
  events,
  numberOfDays = 3,
}: MultiDayViewProps) {
  const hours = getHoursArray();
  const today = new Date();

  // Generate array of dates starting from currentDate
  const displayDates = useMemo(() => {
    const start = getStartOfDay(currentDate);
    return Array.from({ length: numberOfDays }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date;
    });
  }, [currentDate, numberOfDays]);

  // Group events by day
  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, ProcessedEvent[]>();

    displayDates.forEach((date) => {
      const key = date.toDateString();
      grouped.set(key, []);
    });

    events.forEach((event) => {
      displayDates.forEach((date) => {
        if (isSameDay(event.startTime, date)) {
          const key = date.toDateString();
          const dayEvents = grouped.get(key) || [];
          dayEvents.push(event);
          grouped.set(key, dayEvents);
        }
      });
    });

    return grouped;
  }, [displayDates, events]);

  return (
    <div className="flex flex-col h-full">
      {/* Header with day names and dates */}
      <div className={`grid border-b border-border bg-card`} style={{ gridTemplateColumns: `60px repeat(${numberOfDays}, 1fr)` }}>
        <div className="p-2" /> {/* Empty corner cell */}
        {displayDates.map((date) => {
          const isToday = isSameDay(date, today);
          return (
            <div
              key={date.toISOString()}
              className={`p-2 text-center border-l border-border ${
                isToday ? 'bg-accent/50' : ''
              }`}
            >
              <div className="text-xs font-medium text-muted-foreground">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div
                className={`text-lg font-semibold mt-1 ${
                  isToday
                    ? 'bg-primary text-primary-foreground rounded-full w-8 h-8 mx-auto flex items-center justify-center'
                    : ''
                }`}
              >
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid with events */}
      <ScrollArea className="flex-1">
        <div className="grid relative" style={{ gridTemplateColumns: `60px repeat(${numberOfDays}, 1fr)` }}>
          {/* Hours column */}
          <div className="border-r border-border bg-muted/30">
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-16 px-2 py-1 text-xs text-muted-foreground text-right border-b border-border"
              >
                {hour === 0
                  ? '12 AM'
                  : hour < 12
                    ? `${hour} AM`
                    : hour === 12
                      ? '12 PM'
                      : `${hour - 12} PM`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {displayDates.map((date) => {
            const isToday = isSameDay(date, today);
            const dayKey = date.toDateString();
            const dayEvents = eventsByDay.get(dayKey) || [];

            return (
              <div
                key={date.toISOString()}
                className={`relative border-l border-border ${
                  isToday ? 'bg-accent/10' : ''
                }`}
              >
                {/* Hour grid lines */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="h-16 border-b border-border/50"
                  />
                ))}

                {/* Events for this day */}
                <div className="absolute inset-0 pointer-events-none">
                  {dayEvents
                    .filter((event) => !event.isAllDay)
                    .map((event) => {
                      const position = calculateEventPosition(
                        event.startTime,
                        event.endTime
                      );
                      const colorConfig = CALENDAR_COLORS[event.calendarColor];
                      return (
                        <Card
                          key={event.id}
                          className="absolute left-1 right-1 pointer-events-auto cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                          style={{
                            top: `${position.top}%`,
                            height: `${position.height}%`,
                          }}
                          onClick={() => {
                            if (event.url) {
                              window.open(event.url, '_blank');
                            }
                          }}
                        >
                          <div className={`p-1 h-full ${colorConfig.bg} border-l-2 ${colorConfig.border}`}>
                            <div className={`text-xs font-semibold truncate ${colorConfig.text}`}>
                              {event.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatTime(event.startTime)}
                            </div>
                            {event.location && (
                              <div className="text-xs text-muted-foreground truncate">
                                📍 {event.location}
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                </div>

                {/* All-day events */}
                {dayEvents.filter((event) => event.isAllDay).length > 0 && (
                  <div className="absolute top-0 left-1 right-1 space-y-1 pointer-events-auto">
                    {dayEvents
                      .filter((event) => event.isAllDay)
                      .map((event) => {
                        const colorConfig = CALENDAR_COLORS[event.calendarColor];
                        return (
                          <Card
                            key={event.id}
                            className={`p-1 text-xs ${colorConfig.bg} cursor-pointer hover:shadow-md transition-all border-l-2 ${colorConfig.border}`}
                            onClick={() => {
                              if (event.url) {
                                window.open(event.url, '_blank');
                              }
                            }}
                          >
                            <div className={`font-semibold truncate ${colorConfig.text}`}>
                              {event.title}
                            </div>
                          </Card>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
