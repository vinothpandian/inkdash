import { useMemo } from 'react'
import { CALENDAR_COLORS, type ProcessedEvent } from '@/config/calendar'
import { isSameDay, getHoursArray, getStartOfDay } from '@/utils/calendar'

interface MultiDayViewProps {
  currentDate: Date
  events: ProcessedEvent[]
  numberOfDays?: number
}

// Get flex value for each hour - compress night hours, expand day hours
function getHourFlex(hour: number): string {
  if (hour >= 8 && hour < 20) {
    return 'flex-[1.5]' // 8am-8pm: spacious
  }
  return 'flex-[0.3]' // 12am-8am, 8pm-12am: compressed
}

// Calculate event position with variable hour heights
function calculateVariableEventPosition(
  startTime: Date,
  endTime: Date
): { top: number; height: number } {
  const startHour = startTime.getHours() + startTime.getMinutes() / 60
  const endHour = endTime.getHours() + endTime.getMinutes() / 60

  const getPosition = (hour: number): number => {
    let pos = 0
    for (let h = 0; h < hour; h++) {
      pos += h >= 8 && h < 20 ? 1.5 : 0.3
    }
    const fractionalHour = hour % 1
    if (fractionalHour > 0) {
      const wholeHour = Math.floor(hour)
      pos += fractionalHour * (wholeHour >= 8 && wholeHour < 20 ? 1.5 : 0.3)
    }
    return pos
  }

  const totalUnits = 8 * 0.3 + 12 * 1.5 + 4 * 0.3 // 21.6
  const topUnits = getPosition(startHour)
  const heightUnits = getPosition(endHour) - topUnits

  return {
    top: (topUnits / totalUnits) * 100,
    height: Math.max((heightUnits / totalUnits) * 100, 1),
  }
}

export function MultiDayView({ currentDate, events, numberOfDays = 3 }: MultiDayViewProps) {
  const hours = getHoursArray()
  const today = new Date()

  // Generate array of dates starting from currentDate
  const displayDates = useMemo(() => {
    const start = getStartOfDay(currentDate)
    return Array.from({ length: numberOfDays }, (_, i) => {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      return date
    })
  }, [currentDate, numberOfDays])

  // Group events by day
  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, ProcessedEvent[]>()

    displayDates.forEach((date) => {
      const key = date.toDateString()
      grouped.set(key, [])
    })

    events.forEach((event) => {
      displayDates.forEach((date) => {
        if (isSameDay(event.startTime, date)) {
          const key = date.toDateString()
          const dayEvents = grouped.get(key) || []
          dayEvents.push(event)
          grouped.set(key, dayEvents)
        }
      })
    })

    return grouped
  }, [displayDates, events])

  return (
    <div className="flex flex-col h-full">
      {/* Header with day names and dates - compact */}
      <div
        className="grid border-b border-border bg-card"
        style={{ gridTemplateColumns: `40px repeat(${numberOfDays}, 1fr)` }}
      >
        <div className="p-1" /> {/* Empty corner cell */}
        {displayDates.map((date) => {
          const isToday = isSameDay(date, today)
          return (
            <div
              key={date.toISOString()}
              className={`py-1 px-0.5 text-center border-l border-border ${
                isToday ? 'bg-accent/50' : ''
              }`}
            >
              <div className="text-[10px] text-muted-foreground leading-tight">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div
                className={`text-sm font-semibold leading-tight ${
                  isToday
                    ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 mx-auto flex items-center justify-center'
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
      <div
        className="flex-1 min-h-0 grid"
        style={{ gridTemplateColumns: `40px repeat(${numberOfDays}, 1fr)` }}
      >
        {/* Hours column */}
        <div className="border-r border-border bg-muted/30 flex flex-col">
          {hours.map((hour) => (
            <div
              key={hour}
              className={`${getHourFlex(hour)} px-1 text-[10px] text-muted-foreground text-right border-b border-border/30 flex items-start justify-end`}
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
        {displayDates.map((date) => {
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
                <div key={hour} className={`${getHourFlex(hour)} border-b border-border/30`} />
              ))}

              {/* Events for this day */}
              <div className="absolute inset-0 pointer-events-none">
                {dayEvents
                  .filter((event) => !event.isAllDay)
                  .map((event) => {
                    const position = calculateVariableEventPosition(event.startTime, event.endTime)
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
                        <div className="px-1 h-full">
                          <div
                            className={`text-[10px] font-medium truncate leading-tight ${colorConfig.text}`}
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
                          className={`px-1 text-[10px] ${colorConfig.bg} cursor-pointer hover:brightness-95 transition-all border-l-2 ${colorConfig.border} rounded-sm`}
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
