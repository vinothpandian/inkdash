import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { TickTickData } from '@/types'

interface UseTickTickReturn {
  data: TickTickData | null
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  refresh: () => Promise<void>
}

const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

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
 * - Auto-refreshes every 5 minutes
 */
export function useTickTick(): UseTickTickReturn {
  const [data, setData] = useState<TickTickData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const tickTickData = await invoke<TickTickData & { lastUpdated: string }>(
        'fetch_ticktick_tasks'
      )
      setData(transformTickTickData(tickTickData))
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    }
  }, [])

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
    data,
    isLoading,
    error,
    lastUpdated: data?.lastUpdated ?? null,
    refresh,
  }
}
