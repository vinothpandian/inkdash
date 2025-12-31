import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { CalendarHeader, type ViewMode } from './CalendarHeader'
import { WeekView } from './WeekView'
import { MultiDayView } from './MultiDayView'
import { useCalendar } from '@/hooks/useCalendar'
import { getWeekStart, getWeekEnd, getStartOfDay, getEndOfDay } from '@/utils/calendar'
import { Loader2, AlertCircle, Calendar } from 'lucide-react'
import type { ProcessedEvent, CalendarColor } from '@/config/calendar'

export function CalendarView() {
  const { events, calendarSources, isLoading, error, isConfigured, startOAuth } = useCalendar()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [disabledCalendarIds, setDisabledCalendarIds] = useState<Set<string>>(new Set())

  // Derive enabled calendar IDs (all calendars enabled by default, minus disabled ones)
  const enabledCalendarIds = useMemo(() => {
    return calendarSources.map((s) => s.id).filter((id) => !disabledCalendarIds.has(id))
  }, [calendarSources, disabledCalendarIds])

  // Calculate date range based on view mode
  const { startDate, endDate } = useMemo(() => {
    if (viewMode === 'week') {
      return {
        startDate: getWeekStart(currentDate),
        endDate: getWeekEnd(currentDate),
      }
    } else {
      const numberOfDays = viewMode === '3day' ? 3 : 5
      const start = getStartOfDay(currentDate)
      const end = new Date(start)
      end.setDate(start.getDate() + numberOfDays - 1)
      return {
        startDate: start,
        endDate: getEndOfDay(end),
      }
    }
  }, [currentDate, viewMode])

  // Process and filter events for the current view
  const processedEvents: ProcessedEvent[] = useMemo(() => {
    return events
      .filter((event) => {
        // Filter by enabled calendars
        if (enabledCalendarIds.length > 0 && !enabledCalendarIds.includes(event.calendarId)) {
          return false
        }

        // Parse event dates
        const eventStart = event.start.dateTime
          ? new Date(event.start.dateTime)
          : event.start.date
            ? new Date(event.start.date)
            : null

        if (!eventStart) return false

        // Check if event falls within the current view range
        return eventStart >= startDate && eventStart <= endDate
      })
      .map((event) => {
        const isAllDay = !!event.start.date
        const startTime = isAllDay
          ? new Date(event.start.date!)
          : new Date(event.start.dateTime!)
        const endTime = isAllDay ? new Date(event.end.date!) : new Date(event.end.dateTime!)

        return {
          id: event.id,
          title: event.summary,
          description: event.description,
          startTime,
          endTime,
          isAllDay,
          location: event.location,
          url: event.htmlLink,
          calendarId: event.calendarId,
          calendarName: event.calendarName,
          calendarColor: event.calendarColor as CalendarColor,
        }
      })
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
  }, [events, enabledCalendarIds, startDate, endDate])

  const handlePrevious = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() - 7)
    } else if (viewMode === '3day') {
      newDate.setDate(currentDate.getDate() - 3)
    } else {
      newDate.setDate(currentDate.getDate() - 5)
    }
    setCurrentDate(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + 7)
    } else if (viewMode === '3day') {
      newDate.setDate(currentDate.getDate() + 3)
    } else {
      newDate.setDate(currentDate.getDate() + 5)
    }
    setCurrentDate(newDate)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    setCurrentDate(new Date())
  }

  const handleToggleCalendar = (calendarId: string) => {
    setDisabledCalendarIds((prev) => {
      const next = new Set(prev)
      if (next.has(calendarId)) {
        next.delete(calendarId)
      } else {
        next.add(calendarId)
      }
      return next
    })
  }

  // Not configured state
  if (!isConfigured) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Card className="max-w-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Connect Google Calendar</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            Connect your Google Calendar to see upcoming events. You'll need to configure your
            Google OAuth credentials in the config file first.
          </p>
          {error && <p className="text-destructive text-sm mb-4">{error}</p>}
          <button
            onClick={startOAuth}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Connect Calendar
          </button>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onToday={handleToday}
        calendarSources={calendarSources}
        enabledCalendarIds={enabledCalendarIds}
        onToggleCalendar={handleToggleCalendar}
      />

      <div className="flex-1 min-h-0">
        {error ? (
          <Card className="m-4 p-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <div>
                <div className="font-semibold">Error loading calendar</div>
                <div className="text-sm mt-1">{error}</div>
              </div>
            </div>
          </Card>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading calendar events...</span>
            </div>
          </div>
        ) : viewMode === 'week' ? (
          <WeekView currentDate={currentDate} events={processedEvents} />
        ) : (
          <MultiDayView
            currentDate={currentDate}
            events={processedEvents}
            numberOfDays={viewMode === '3day' ? 3 : 5}
          />
        )}
      </div>
    </div>
  )
}
