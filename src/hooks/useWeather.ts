import { useState, useEffect, useCallback } from 'react'
import type { WeatherData } from '@/types'
import { fetchWeather, getCachedWeather, cacheWeather } from '@/api/weather'

interface UseWeatherReturn {
  data: WeatherData | null
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  refresh: () => Promise<void>
}

const REFRESH_INTERVAL = 15 * 60 * 1000 // 15 minutes

/**
 * Hook for fetching and managing weather data
 * - Fetches from Open-Meteo API
 * - Caches data in localStorage
 * - Auto-refreshes every 15 minutes
 */
export function useWeather(): UseWeatherReturn {
  const [data, setData] = useState<WeatherData | null>(() => getCachedWeather())
  const [isLoading, setIsLoading] = useState(!getCachedWeather())
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const weatherData = await fetchWeather()
      setData(weatherData)
      cacheWeather(weatherData)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch weather'
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
