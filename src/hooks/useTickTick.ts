import { useState, useEffect, useCallback } from 'react'
import type { TickTickData } from '@/types'
import { fetchTickTick, getCachedTickTick, cacheTickTick } from '@/api/ticktick'

interface UseTickTickReturn {
  data: TickTickData | null
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  refresh: () => Promise<void>
}

const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

/**
 * Hook for fetching and managing TickTick tasks
 * - Fetches from TickTick API
 * - Caches data in localStorage
 * - Auto-refreshes every 5 minutes
 */
export function useTickTick(): UseTickTickReturn {
  const [data, setData] = useState<TickTickData | null>(() => getCachedTickTick())
  const [isLoading, setIsLoading] = useState(!getCachedTickTick())
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const tickTickData = await fetchTickTick()
      setData(tickTickData)
      cacheTickTick(tickTickData)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch TickTick tasks'
      setError(message)
      // Keep showing cached data on error
    }
  }, [])

  useEffect(() => {
    // Initial fetch
    const initialFetch = async () => {
      setIsLoading(true)
      await refresh()
      setIsLoading(false)
    }

    initialFetch()

    // Set up refresh interval
    const intervalId = setInterval(refresh, REFRESH_INTERVAL)

    return () => clearInterval(intervalId)
  }, [refresh])

  return {
    data,
    isLoading,
    error,
    lastUpdated: data?.lastUpdated ?? null,
    refresh,
  }
}
