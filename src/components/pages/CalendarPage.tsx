import { useCalendar } from '@/hooks/useCalendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, MapPin } from 'lucide-react'

/**
 * CalendarPage - Native Google Calendar widget
 *
 * Displays upcoming Google Calendar events fetched via Tauri backend.
 * Shows OAuth connect button if not configured.
 */
export function CalendarPage() {
  const { events, isLoading, error, isConfigured, startOAuth } = useCalendar()

  // Format event time for display
  const formatEventTime = (start: { dateTime?: string; date?: string }) => {
    if (start.date) {
      // All-day event
      return 'All day'
    }
    if (start.dateTime) {
      const date = new Date(start.dateTime)
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    }
    return ''
  }

  // Format event date for display
  const formatEventDate = (start: { dateTime?: string; date?: string }) => {
    const dateStr = start.dateTime || start.date
    if (!dateStr) return ''

    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  // Group events by date
  const groupedEvents = events.reduce(
    (acc, event) => {
      const dateKey = formatEventDate(event.start)
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(event)
      return acc
    },
    {} as Record<string, typeof events>
  )

  if (!isConfigured) {
    return (
      <div className="h-full w-full page-padding flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Connect Google Calendar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Connect your Google Calendar to see upcoming events. You'll need to configure your
              Google OAuth credentials in the config file first.
            </p>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <button
              onClick={startOAuth}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Connect Calendar
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="h-full w-full page-padding flex items-center justify-center">
        <div className="text-muted-foreground">Loading calendar...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full w-full page-padding flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            <button
              onClick={startOAuth}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Reconnect Calendar
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="h-full w-full page-padding flex items-center justify-center">
        <div className="text-muted-foreground">No upcoming events</div>
      </div>
    )
  }

  return (
    <div className="h-full w-full page-padding overflow-y-auto">
      <div className="space-y-6">
        {Object.entries(groupedEvents).map(([dateLabel, dateEvents]) => (
          <div key={dateLabel}>
            <h2 className="text-lg font-semibold mb-3 text-foreground">{dateLabel}</h2>
            <div className="space-y-2">
              {dateEvents.map((event) => (
                <Card key={event.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-16 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatEventTime(event.start)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">{event.summary}</h3>
                        {event.location && (
                          <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
