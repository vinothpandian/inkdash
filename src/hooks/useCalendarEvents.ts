import { useState, useEffect } from 'react';
import {
  GOOGLE_CALENDAR_CONFIG,
  type CalendarEvent,
  type ProcessedEvent,
} from '../config/calendar';

export interface UseCalendarEventsOptions {
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
}

export interface UseCalendarEventsResult {
  events: ProcessedEvent[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Process raw Google Calendar event into UI-friendly format
function processEvent(event: CalendarEvent): ProcessedEvent {
  const isAllDay = !!event.start.date;

  const startTime = isAllDay
    ? new Date(event.start.date!)
    : new Date(event.start.dateTime!);

  const endTime = isAllDay
    ? new Date(event.end.date!)
    : new Date(event.end.dateTime!);

  return {
    id: event.id,
    title: event.summary || '(No title)',
    description: event.description,
    startTime,
    endTime,
    isAllDay,
    location: event.location,
    url: event.htmlLink,
  };
}

export function useCalendarEvents({
  startDate,
  endDate,
  enabled = true,
}: UseCalendarEventsOptions): UseCalendarEventsResult {
  const [events, setEvents] = useState<ProcessedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = () => setRefetchTrigger((prev) => prev + 1);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const fetchEvents = async () => {
      setLoading(true);
      setError(null);

      try {
        const { apiKey, calendarId, apiUrl } = GOOGLE_CALENDAR_CONFIG;

        if (!apiKey) {
          throw new Error(
            'Google Calendar API key not configured. Please set VITE_GOOGLE_CALENDAR_API_KEY in your .env file.'
          );
        }

        const params = new URLSearchParams({
          key: apiKey,
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          singleEvents: 'true',
          orderBy: 'startTime',
          maxResults: '250',
        });

        const response = await fetch(
          `${apiUrl}/calendars/${encodeURIComponent(calendarId)}/events?${params}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error?.message || `Failed to fetch calendar events: ${response.statusText}`
          );
        }

        const data = await response.json();
        const processedEvents = (data.items || []).map(processEvent);
        setEvents(processedEvents);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(message);
        console.error('Calendar fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [startDate, endDate, enabled, refetchTrigger]);

  return { events, loading, error, refetch };
}
