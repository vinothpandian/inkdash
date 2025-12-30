import { Card, CardContent } from '@/components/ui/card';

/**
 * CalendarWidget - Mini month calendar view
 * Shows current month with abbreviated day names
 * Current day is highlighted with accent
 */
export function CalendarWidget() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDate = today.getDate();

  // Get month name
  const monthName = today.toLocaleDateString('en-US', { month: 'long' });

  // Day abbreviations (Mon-Sun)
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Get first day of month and total days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const totalDays = lastDayOfMonth.getDate();

  // Get day of week for first day (0 = Sunday, adjust for Monday start)
  let startDay = firstDayOfMonth.getDay() - 1;
  if (startDay < 0) startDay = 6; // Sunday becomes 6

  // Build calendar grid
  const calendarDays: (number | null)[] = [];

  // Add empty cells for days before the 1st
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= totalDays; day++) {
    calendarDays.push(day);
  }

  // Fill remaining cells to complete the grid
  while (calendarDays.length % 7 !== 0) {
    calendarDays.push(null);
  }

  return (
    <Card className="h-full shadow-soft border-0 flex flex-col">
      <CardContent className="flex-1 flex flex-col p-5">
        {/* Month and Year */}
        <div className="text-lg font-medium-labels mb-4">
          {monthName} {currentYear}
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center text-xs text-muted-foreground font-medium"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 flex-1">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`
                flex items-center justify-center text-sm
                ${day === null ? '' : 'cursor-default'}
                ${
                  day === currentDate
                    ? 'bg-foreground text-background rounded-full font-medium'
                    : 'text-foreground'
                }
              `}
            >
              {day}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
