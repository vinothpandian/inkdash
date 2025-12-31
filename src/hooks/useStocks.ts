import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { StockData } from '@/types'

interface UseStocksReturn {
  stocks: StockData[]
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  refresh: () => Promise<void>
}

const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

// Transform the response from Tauri (dates come as strings)
function transformStockData(data: (StockData & { lastUpdated: string })[]): StockData[] {
  return data.map((stock) => ({
    ...stock,
    lastUpdated: new Date(stock.lastUpdated),
  }))
}

/**
 * Hook for fetching and managing stock data
 * - Fetches from Yahoo Finance API via Tauri backend
 * - Auto-refreshes every 5 minutes
 */
export function useStocks(): UseStocksReturn {
  const [stocks, setStocks] = useState<StockData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const stockData = await invoke<(StockData & { lastUpdated: string })[]>('fetch_stocks')
      setStocks(transformStockData(stockData))
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

  const lastUpdated =
    stocks.length > 0
      ? stocks.reduce(
          (latest, stock) => (stock.lastUpdated > latest ? stock.lastUpdated : latest),
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
