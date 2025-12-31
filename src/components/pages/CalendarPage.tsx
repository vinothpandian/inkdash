/**
 * CalendarPage - Google Calendar iframe with padded container
 *
 * Displays Google Calendar in a rounded, padded iframe container.
 */
export function CalendarPage() {
  return (
    <div className="h-full w-full page-padding flex flex-col overflow-hidden">
      <div className="iframe-container flex-1 min-h-0">
        <iframe
          src="https://calendar.google.com"
          title="Google Calendar"
          className="h-full w-full border-0"
          allow="calendar"
        />
      </div>
    </div>
  );
}
