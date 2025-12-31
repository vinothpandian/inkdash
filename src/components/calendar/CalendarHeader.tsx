import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CalendarFilter } from './CalendarFilter'
import { formatDateRange, getWeekStart, getWeekEnd } from '@/utils/calendar'
import type { CalendarSource } from '@/types'

export type ViewMode = 'week' | '3day' | '5day'

interface CalendarHeaderProps {
  currentDate: Date
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  calendarSources?: CalendarSource[]
  enabledCalendarIds?: string[]
  onToggleCalendar?: (calendarId: string) => void
}

export function CalendarHeader({
  currentDate,
  viewMode,
  onViewModeChange,
  onPrevious,
  onNext,
  onToday,
  calendarSources = [],
  enabledCalendarIds = [],
  onToggleCalendar,
}: CalendarHeaderProps) {
  // Format date range based on view mode
  const getDateRangeText = () => {
    if (viewMode === 'week') {
      const weekStart = getWeekStart(currentDate)
      const weekEnd = getWeekEnd(currentDate)
      return formatDateRange(weekStart, weekEnd)
    } else {
      const numberOfDays = viewMode === '3day' ? 3 : 5
      const endDate = new Date(currentDate)
      endDate.setDate(currentDate.getDate() + numberOfDays - 1)
      return formatDateRange(currentDate, endDate)
    }
  }

  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-card">
      {/* Left: Date navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onToday} className="gap-2">
          <CalendarIcon className="w-4 h-4" />
          Today
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onPrevious} aria-label="Previous">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onNext} aria-label="Next">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        <div className="text-lg font-semibold ml-2">{getDateRangeText()}</div>
      </div>

      {/* Right: Calendar filter and view mode selector */}
      <div className="flex items-center gap-3">
        {onToggleCalendar && (
          <CalendarFilter
            calendarSources={calendarSources}
            enabledCalendarIds={enabledCalendarIds}
            onToggleCalendar={onToggleCalendar}
          />
        )}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={viewMode === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('week')}
          >
            Week
          </Button>
          <Button
            variant={viewMode === '5day' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('5day')}
          >
            5 Days
          </Button>
          <Button
            variant={viewMode === '3day' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('3day')}
          >
            3 Days
          </Button>
        </div>
      </div>
    </div>
  )
}
