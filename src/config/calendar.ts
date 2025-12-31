// Google Calendar API Configuration

export const GOOGLE_CALENDAR_CONFIG = {
  apiKey: import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY || '',
  calendarId: import.meta.env.VITE_GOOGLE_CALENDAR_ID || 'primary',
  apiUrl: 'https://www.googleapis.com/calendar/v3',
} as const;

// Calendar event type from Google Calendar API
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  colorId?: string;
  htmlLink?: string;
  status?: string;
}

// Processed event for UI rendering
export interface ProcessedEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  location?: string;
  color?: string;
  url?: string;
}
