import { useState, useEffect, useCallback, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { TickTickData } from '@/types'

interface UseTickTickReturn {
  data: TickTickData | null
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  lastUpdated: Date | null
  refresh: () => Promise<void>
}

interface RefreshIntervals {
  ticktick_minutes: number
  calendar_minutes: number
}

const DEFAULT_REFRESH_INTERVAL = 15 * 60 * 1000 // 15 minutes

// Transform the response from Tauri (dates come as strings)
function transformTickTickData(data: TickTickData & { lastUpdated: string }): TickTickData {
  return {
    ...data,
    lastUpdated: new Date(data.lastUpdated),
  }
}

/**
 * Hook for fetching and managing TickTick tasks
 * - Fetches from TickTick API via Tauri backend
 * - Auto-refreshes based on config (default: 15 minutes)
 */
export function useTickTick(): UseTickTickReturn {
  const [data, setData] = useState<TickTickData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async (showRefreshing = true) => {
    if (showRefreshing) setIsRefreshing(true)
    try {
      const tickTickData = await invoke<TickTickData & { lastUpdated: string }>(
        'fetch_ticktick_tasks'
      )
      setData(transformTickTickData(tickTickData))
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      if (showRefreshing) setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const setup = async () => {
      setIsLoading(true)

      // Fetch refresh interval from config
      let intervalMs = DEFAULT_REFRESH_INTERVAL
      try {
        const intervals = await invoke<RefreshIntervals>('get_refresh_intervals')
        intervalMs = intervals.ticktick_minutes * 60 * 1000
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
    data,
    isLoading,
    isRefreshing,
    error,
    lastUpdated: data?.lastUpdated ?? null,
    refresh: () => refresh(true),
  }
}
