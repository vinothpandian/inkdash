import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { WeatherData } from '@/types'

interface UseWeatherReturn {
  data: WeatherData | null
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  refresh: () => Promise<void>
}

const REFRESH_INTERVAL = 15 * 60 * 1000 // 15 minutes

// Transform the response from Tauri (dates come as strings)
function transformWeatherData(data: WeatherData & { lastUpdated: string }): WeatherData {
  return {
    ...data,
    lastUpdated: new Date(data.lastUpdated),
  }
}

/**
 * Hook for fetching and managing weather data
 * - Fetches from Open-Meteo API via Tauri backend
 * - Auto-refreshes every 15 minutes
 */
export function useWeather(): UseWeatherReturn {
  const [data, setData] = useState<WeatherData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const weatherData = await invoke<WeatherData & { lastUpdated: string }>('fetch_weather')
      setData(transformWeatherData(weatherData))
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
