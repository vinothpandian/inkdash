import { useState } from 'react'
import { Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { CALENDAR_COLORS, type CalendarColor } from '@/config/calendar'
import type { CalendarSource } from '@/types'

interface CalendarFilterProps {
  calendarSources: CalendarSource[]
  enabledCalendarIds: string[]
  onToggleCalendar: (calendarId: string) => void
}

export function CalendarFilter({
  calendarSources,
  enabledCalendarIds,
  onToggleCalendar,
}: CalendarFilterProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (calendarSources.length <= 1) {
    // Don't show filter if there's only one calendar
    return null
  }

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)} className="gap-2">
        <Filter className="w-4 h-4" />
        Calendars
        {enabledCalendarIds.length < calendarSources.length && (
          <span className="text-xs text-muted-foreground">
            ({enabledCalendarIds.length}/{calendarSources.length})
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-20 p-3">
            <div className="text-sm font-semibold mb-2">Filter Calendars</div>
            <div className="space-y-2">
              {calendarSources.map((source) => {
                const isEnabled = enabledCalendarIds.includes(source.id)
                const colorKey = source.color as CalendarColor
                const colorConfig = CALENDAR_COLORS[colorKey] || CALENDAR_COLORS.blue

                return (
                  <label
                    key={source.id}
                    className="flex items-center gap-3 cursor-pointer hover:bg-accent/50 rounded p-2 transition-colors"
                  >
                    <Checkbox
                      checked={isEnabled}
                      onCheckedChange={() => onToggleCalendar(source.id)}
                    />
                    <div
                      className={`w-3 h-3 rounded-full border-2 ${colorConfig.border}`}
                      style={{ backgroundColor: colorConfig.hex }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{source.name}</div>
                    </div>
                  </label>
                )
              })}
            </div>

            {/* Quick actions */}
            <div className="mt-3 pt-3 border-t border-border flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => {
                  calendarSources.forEach((source) => {
                    if (!enabledCalendarIds.includes(source.id)) {
                      onToggleCalendar(source.id)
                    }
                  })
                }}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => {
                  enabledCalendarIds.forEach((id) => {
                    onToggleCalendar(id)
                  })
                }}
              >
                Clear All
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
