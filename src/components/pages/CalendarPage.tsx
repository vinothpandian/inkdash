import { CalendarView } from '../calendar/CalendarView';

/**
 * CalendarPage - Google Calendar API integration with custom views
 *
 * Displays Google Calendar events using the Google Calendar API.
 * Features week view, 3-day view, and 5-day view with navigation.
 *
 * Setup:
 * 1. Get API key from: https://console.cloud.google.com/apis/credentials
 * 2. Enable Google Calendar API in your project
 * 3. Add VITE_GOOGLE_CALENDAR_API_KEY and VITE_GOOGLE_CALENDAR_ID to .env
 */
export function CalendarPage() {
  return (
    <div className="h-full w-full page-padding flex flex-col overflow-hidden">
      <div className="iframe-container flex-1 min-h-0 overflow-hidden">
        <CalendarView />
      </div>
    </div>
  );
}
