import { useMemo } from 'react'
import { CALENDAR_COLORS, type ProcessedEvent } from '@/config/calendar'
import {
  getWeekDates,
  isSameDay,
  calculateEventPosition,
  getHoursArray,
} from '@/utils/calendar'

interface WeekViewProps {
  currentDate: Date
  events: ProcessedEvent[]
}

export function WeekView({ currentDate, events }: WeekViewProps) {
  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate])
  const hours = getHoursArray()
  const today = new Date()

  // Group events by day
  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, ProcessedEvent[]>()

    weekDates.forEach((date) => {
      const key = date.toDateString()
      grouped.set(key, [])
    })

    events.forEach((event) => {
      weekDates.forEach((date) => {
        if (isSameDay(event.startTime, date)) {
          const key = date.toDateString()
          const dayEvents = grouped.get(key) || []
          dayEvents.push(event)
          grouped.set(key, dayEvents)
        }
      })
    })

    return grouped
  }, [weekDates, events])

  return (
    <div className="flex flex-col h-full">
      {/* Week header with day names and dates */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-card">
        <div className="p-2" /> {/* Empty corner cell */}
        {weekDates.map((date) => {
          const isToday = isSameDay(date, today)
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
          )
        })}
      </div>

      {/* Time grid with events - fills remaining space, no scroll */}
      <div className="flex-1 min-h-0 grid grid-cols-[40px_repeat(7,1fr)]">
        {/* Hours column */}
        <div className="border-r border-border bg-muted/30 flex flex-col">
          {hours.map((hour) => (
            <div
              key={hour}
              className="flex-1 px-1 text-[10px] text-muted-foreground text-right border-b border-border/30 flex items-start justify-end"
            >
              {hour === 0
                ? '12a'
                : hour < 12
                  ? `${hour}a`
                  : hour === 12
                    ? '12p'
                    : `${hour - 12}p`}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDates.map((date) => {
          const isToday = isSameDay(date, today)
          const dayKey = date.toDateString()
          const dayEvents = eventsByDay.get(dayKey) || []

          return (
            <div
              key={date.toISOString()}
              className={`relative border-l border-border flex flex-col ${
                isToday ? 'bg-accent/10' : ''
              }`}
            >
              {/* Hour grid lines */}
              {hours.map((hour) => (
                <div key={hour} className="flex-1 border-b border-border/30" />
              ))}

              {/* Events for this day */}
              <div className="absolute inset-0 pointer-events-none">
                {dayEvents
                  .filter((event) => !event.isAllDay)
                  .map((event) => {
                    const position = calculateEventPosition(event.startTime, event.endTime)
                    const colorConfig = CALENDAR_COLORS[event.calendarColor]
                    return (
                      <div
                        key={event.id}
                        className={`absolute left-0.5 right-0.5 pointer-events-auto cursor-pointer hover:brightness-95 transition-all overflow-hidden rounded-sm ${colorConfig.bg} border-l-2 ${colorConfig.border}`}
                        style={{
                          top: `${position.top}%`,
                          height: `${Math.max(position.height, 2)}%`,
                        }}
                        onClick={() => {
                          if (event.url) {
                            window.open(event.url, '_blank')
                          }
                        }}
                      >
                        <div className="px-0.5 h-full">
                          <div
                            className={`text-[9px] font-medium truncate leading-tight ${colorConfig.text}`}
                          >
                            {event.title}
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>

              {/* All-day events */}
              {dayEvents.filter((event) => event.isAllDay).length > 0 && (
                <div className="absolute top-0 left-0.5 right-0.5 space-y-0.5 pointer-events-auto">
                  {dayEvents
                    .filter((event) => event.isAllDay)
                    .map((event) => {
                      const colorConfig = CALENDAR_COLORS[event.calendarColor]
                      return (
                        <div
                          key={event.id}
                          className={`px-0.5 text-[9px] ${colorConfig.bg} cursor-pointer hover:brightness-95 transition-all border-l-2 ${colorConfig.border} rounded-sm`}
                          onClick={() => {
                            if (event.url) {
                              window.open(event.url, '_blank')
                            }
                          }}
                        >
                          <div className={`font-medium truncate ${colorConfig.text}`}>
                            {event.title}
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
