import { useState, useEffect, useCallback, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { CalendarEvent, CalendarSource } from '@/types'

interface UseCalendarReturn {
  events: CalendarEvent[]
  calendarSources: CalendarSource[]
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  isConfigured: boolean
  refresh: () => Promise<void>
  startOAuth: () => Promise<void>
}

interface RefreshIntervals {
  ticktick_minutes: number
  calendar_minutes: number
}

const DEFAULT_REFRESH_INTERVAL = 30 * 60 * 1000 // 30 minutes

/**
 * Hook for fetching and managing Google Calendar events
 * - Fetches from Google Calendar API via Tauri backend
 * - Handles OAuth flow for authentication
 * - Supports multiple calendars with filtering
 * - Auto-refreshes based on config (default: 30 minutes)
 */
export function useCalendar(): UseCalendarReturn {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [calendarSources, setCalendarSources] = useState<CalendarSource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConfigured, setIsConfigured] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const checkConfiguration = useCallback(async () => {
    try {
      const configured = await invoke<boolean>('is_calendar_configured')
      setIsConfigured(configured)
      return configured
    } catch {
      setIsConfigured(false)
      return false
    }
  }, [])

  const refresh = useCallback(async (showRefreshing = true) => {
    if (showRefreshing) setIsRefreshing(true)

    const configured = await checkConfiguration()
    if (!configured) {
      setEvents([])
      setCalendarSources([])
      setError(null)
      if (showRefreshing) setIsRefreshing(false)
      return
    }

    try {
      // Fetch calendar sources and events in parallel
      const [sources, calendarEvents] = await Promise.all([
        invoke<CalendarSource[]>('get_calendar_sources'),
        invoke<CalendarEvent[]>('fetch_calendar_events'),
      ])
      setCalendarSources(sources)
      setEvents(calendarEvents)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      if (showRefreshing) setIsRefreshing(false)
    }
  }, [checkConfiguration])

  const startOAuth = useCallback(async () => {
    try {
      setError(null)
      // Start the OAuth flow (opens browser)
      await invoke('start_google_oauth')
      // Wait for the callback
      await invoke('complete_google_oauth')
      // Refresh to get events
      await refresh(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    }
  }, [refresh])

  useEffect(() => {
    const setup = async () => {
      setIsLoading(true)

      // Fetch refresh interval from config
      let intervalMs = DEFAULT_REFRESH_INTERVAL
      try {
        const intervals = await invoke<RefreshIntervals>('get_refresh_intervals')
        intervalMs = intervals.calendar_minutes * 60 * 1000
      } catch {
        // Use default if config fetch fails
      }

      await refresh(false)
      setIsLoading(false)

      // Set up interval with configured duration
      intervalRef.current = setInterval(() => refresh(false), intervalMs)
    }

    setup()

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [refresh])

  return {
    events,
    calendarSources,
    isLoading,
    isRefreshing,
    error,
    isConfigured,
    refresh: () => refresh(true),
    startOAuth,
  }
}
