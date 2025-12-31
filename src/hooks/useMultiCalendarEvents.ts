import { useState, useEffect } from 'react';
import {
  GOOGLE_CALENDAR_CONFIG,
  CALENDAR_SOURCES,
  type CalendarEvent,
  type ProcessedEvent,
  type CalendarSource,
} from '../config/calendar';

export interface UseMultiCalendarEventsOptions {
  startDate: Date;
  endDate: Date;
  enabledCalendarIds?: string[]; // Filter to only fetch these calendar IDs
}

export interface UseMultiCalendarEventsResult {
  events: ProcessedEvent[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  calendarSources: CalendarSource[];
}

// Process raw Google Calendar event into UI-friendly format
function processEvent(
  event: CalendarEvent,
  calendarSource: CalendarSource
): ProcessedEvent {
  const isAllDay = !!event.start.date;

  const startTime = isAllDay
    ? new Date(event.start.date!)
    : new Date(event.start.dateTime!);

  const endTime = isAllDay
    ? new Date(event.end.date!)
    : new Date(event.end.dateTime!);

  return {
    id: `${calendarSource.id}-${event.id}`,
    title: event.summary || '(No title)',
    description: event.description,
    startTime,
    endTime,
    isAllDay,
    location: event.location,
    url: event.htmlLink,
    calendarId: calendarSource.id,
    calendarName: calendarSource.name,
    calendarColor: calendarSource.color,
  };
}

// Fetch events from a single calendar
async function fetchCalendarEvents(
  calendarId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const { apiKey, apiUrl } = GOOGLE_CALENDAR_CONFIG;

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
      errorData.error?.message ||
        `Failed to fetch calendar '${calendarId}': ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.items || [];
}

export function useMultiCalendarEvents({
  startDate,
  endDate,
  enabledCalendarIds,
}: UseMultiCalendarEventsOptions): UseMultiCalendarEventsResult {
  const [events, setEvents] = useState<ProcessedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = () => setRefetchTrigger((prev) => prev + 1);

  // Filter calendar sources based on enabledCalendarIds
  const activeCalendarSources = enabledCalendarIds
    ? CALENDAR_SOURCES.filter((source) => enabledCalendarIds.includes(source.id))
    : CALENDAR_SOURCES;

  useEffect(() => {
    const fetchAllCalendarEvents = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch events from all active calendars in parallel
        const fetchPromises = activeCalendarSources.map(async (source) => {
          try {
            const calendarEvents = await fetchCalendarEvents(
              source.id,
              startDate,
              endDate
            );
            return calendarEvents.map((event) => processEvent(event, source));
          } catch (err) {
            console.error(`Error fetching calendar '${source.name}':`, err);
            // Return empty array for this calendar on error, but don't fail entirely
            return [];
          }
        });

        const results = await Promise.all(fetchPromises);

        // Flatten and sort all events by start time
        const allEvents = results.flat().sort((a, b) => {
          return a.startTime.getTime() - b.startTime.getTime();
        });

        setEvents(allEvents);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unknown error occurred';
        setError(message);
        console.error('Calendar fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (activeCalendarSources.length > 0) {
      fetchAllCalendarEvents();
    } else {
      setLoading(false);
      setEvents([]);
    }
  }, [startDate, endDate, enabledCalendarIds, refetchTrigger]);

  return {
    events,
    loading,
    error,
    refetch,
    calendarSources: CALENDAR_SOURCES,
  };
}
