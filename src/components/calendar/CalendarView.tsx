import { useState, useMemo } from 'react';
import { Card } from '../ui/card';
import { CalendarHeader, type ViewMode } from './CalendarHeader';
import { WeekView } from './WeekView';
import { MultiDayView } from './MultiDayView';
import { useMultiCalendarEvents } from '../../hooks/useMultiCalendarEvents';
import { getWeekStart, getWeekEnd, getStartOfDay, getEndOfDay } from '../../utils/calendar';
import { Loader2, AlertCircle } from 'lucide-react';

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [enabledCalendarIds, setEnabledCalendarIds] = useState<string[]>([]);

  // Calculate date range based on view mode
  const { startDate, endDate } = useMemo(() => {
    if (viewMode === 'week') {
      return {
        startDate: getWeekStart(currentDate),
        endDate: getWeekEnd(currentDate),
      };
    } else {
      const numberOfDays = viewMode === '3day' ? 3 : 5;
      const start = getStartOfDay(currentDate);
      const end = new Date(start);
      end.setDate(start.getDate() + numberOfDays - 1);
      return {
        startDate: start,
        endDate: getEndOfDay(end),
      };
    }
  }, [currentDate, viewMode]);

  const { events, loading, error, calendarSources } = useMultiCalendarEvents({
    startDate,
    endDate,
    enabledCalendarIds: enabledCalendarIds.length > 0 ? enabledCalendarIds : undefined,
  });

  // Initialize enabled calendars on first load
  useMemo(() => {
    if (enabledCalendarIds.length === 0 && calendarSources.length > 0) {
      setEnabledCalendarIds(calendarSources.map((source) => source.id));
    }
  }, [calendarSources, enabledCalendarIds.length]);

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() - 7);
    } else if (viewMode === '3day') {
      newDate.setDate(currentDate.getDate() - 3);
    } else {
      newDate.setDate(currentDate.getDate() - 5);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + 7);
    } else if (viewMode === '3day') {
      newDate.setDate(currentDate.getDate() + 3);
    } else {
      newDate.setDate(currentDate.getDate() + 5);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    // Reset to today when changing view mode for better UX
    setCurrentDate(new Date());
  };

  const handleToggleCalendar = (calendarId: string) => {
    setEnabledCalendarIds((prev) => {
      if (prev.includes(calendarId)) {
        // Remove calendar
        return prev.filter((id) => id !== calendarId);
      } else {
        // Add calendar
        return [...prev, calendarId];
      }
    });
  };

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
        ) : loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading calendar events...</span>
            </div>
          </div>
        ) : viewMode === 'week' ? (
          <WeekView currentDate={currentDate} events={events} />
        ) : (
          <MultiDayView
            currentDate={currentDate}
            events={events}
            numberOfDays={viewMode === '3day' ? 3 : 5}
          />
        )}
      </div>
    </div>
  );
}
