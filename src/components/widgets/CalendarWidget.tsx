import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';

/**
 * CalendarWidget - Mini month calendar view using shadcn Calendar
 * Shows current month with today highlighted
 */
export function CalendarWidget() {
  const today = new Date();

  return (
    <Card className="h-full">
      <CardContent className="h-full flex items-center justify-center p-2">
        <Calendar
          mode="single"
          selected={today}
          defaultMonth={today}
          showOutsideDays={false}
          captionLayout="label"
          weekStartsOn={1}
          fixedWeeks={false}
          classNames={{
            root: 'w-full h-full flex flex-col',
            months: 'flex-1 flex flex-col',
            month: 'flex-1 flex flex-col gap-1',
            month_caption: 'flex justify-center pt-1',
            caption_label: 'text-base font-medium-labels',
            nav: 'hidden',
            table: 'w-full flex-1',
            weekdays: 'flex',
            weekday: 'flex-1 text-center text-xs text-muted-foreground font-medium',
            week: 'flex',
            day: 'flex-1 flex items-center justify-center p-0 text-sm aspect-square',
            outside: 'text-muted-foreground/50',
            today: 'bg-foreground text-background rounded-full font-medium',
          }}
          components={{
            DayButton: ({ day, modifiers, ...props }) => (
              <button
                type="button"
                className={`w-6 h-6 flex items-center justify-center text-sm
                  ${modifiers.today ? 'bg-foreground text-background rounded-full font-medium' : ''}
                  ${modifiers.outside ? 'text-muted-foreground/40' : 'text-foreground'}
                `}
                {...props}
              >
                {day.date.getDate()}
              </button>
            ),
          }}
        />
      </CardContent>
    </Card>
  );
}
