import { useState, useEffect, useCallback } from 'react'
import type { StockData } from '@/types'
import { fetchStocks, getCachedStocks, cacheStocks } from '@/api/stocks'

interface UseStocksReturn {
  stocks: StockData[]
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  refresh: () => Promise<void>
}

const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

/**
 * Hook for fetching and managing stock data
 * - Fetches from Yahoo Finance API
 * - Caches data in localStorage
 * - Auto-refreshes every 5 minutes
 */
export function useStocks(): UseStocksReturn {
  const [stocks, setStocks] = useState<StockData[]>(() => getCachedStocks() ?? [])
  const [isLoading, setIsLoading] = useState(!getCachedStocks())
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const stockData = await fetchStocks()
      setStocks(stockData)
      cacheStocks(stockData)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch stocks'
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

  // Get the most recent update time from all stocks
  const lastUpdated = stocks.length > 0
    ? stocks.reduce((latest, stock) =>
        stock.lastUpdated > latest ? stock.lastUpdated : latest,
        stocks[0].lastUpdated
      )
    : null

  return {
    stocks,
    isLoading,
    error,
    lastUpdated,
    refresh,
  }
}
