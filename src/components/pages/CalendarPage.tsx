/**
 * CalendarPage - Google Calendar iframe with padded container
 *
 * Displays Google Calendar in a rounded, padded iframe container.
 * Uses the embeddable calendar URL format.
 *
 * To customize: Replace the src with your own calendar embed URL from:
 * Google Calendar > Settings > Settings for my calendar > Integrate calendar > Embed code
 */
export function CalendarPage() {
  // Using Google Calendar embed URL - customize with your calendar ID
  // Format: https://calendar.google.com/calendar/embed?src=YOUR_EMAIL&mode=WEEK
  const calendarUrl = "https://calendar.google.com/calendar/embed?mode=WEEK&showTitle=0&showNav=1&showPrint=0&showTabs=0&showCalendars=0&showTz=0";

  return (
    <div className="h-full w-full page-padding flex flex-col overflow-hidden">
      <div className="iframe-container flex-1 min-h-0">
        <iframe
          src={calendarUrl}
          title="Google Calendar"
          className="h-full w-full border-0"
          style={{ minHeight: '100%' }}
        />
      </div>
    </div>
  );
}
