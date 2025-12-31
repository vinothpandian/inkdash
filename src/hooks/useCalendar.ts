import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { CalendarEvent, CalendarSource } from '@/types'

interface UseCalendarReturn {
  events: CalendarEvent[]
  calendarSources: CalendarSource[]
  isLoading: boolean
  error: string | null
  isConfigured: boolean
  refresh: () => Promise<void>
  startOAuth: () => Promise<void>
}

const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

/**
 * Hook for fetching and managing Google Calendar events
 * - Fetches from Google Calendar API via Tauri backend
 * - Handles OAuth flow for authentication
 * - Supports multiple calendars with filtering
 * - Auto-refreshes every 5 minutes
 */
export function useCalendar(): UseCalendarReturn {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [calendarSources, setCalendarSources] = useState<CalendarSource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConfigured, setIsConfigured] = useState(false)

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

  const refresh = useCallback(async () => {
    const configured = await checkConfiguration()
    if (!configured) {
      setEvents([])
      setCalendarSources([])
      setError(null)
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
      await refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    }
  }, [refresh])

  useEffect(() => {
    const initialFetch = async () => {
      setIsLoading(true)
      await refresh()
      setIsLoading(false)
    }

    initialFetch()

    const intervalId = setInterval(refresh, REFRESH_INTERVAL)
    return () => clearInterval(intervalId)
  }, [refresh])

  return {
    events,
    calendarSources,
    isLoading,
    error,
    isConfigured,
    refresh,
    startOAuth,
  }
}
