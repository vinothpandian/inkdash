import { CalendarView } from '@/components/calendar/CalendarView'

/**
 * CalendarPage - Google Calendar integration with week/multi-day views
 *
 * Features:
 * - Week view, 3-day view, and 5-day view
 * - Multiple calendar support with color coding
 * - Calendar filter to toggle visibility
 * - Navigation (previous/next/today)
 */
export function CalendarPage() {
  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <CalendarView />
    </div>
  )
}
