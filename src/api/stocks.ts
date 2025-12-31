import type { StockData, StockConfig } from '@/types'
import { stocks as stockConfigs } from '@/config/stocks'

const CORS_PROXY = 'https://corsproxy.io/?'
const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'

// Currency symbol mapping (from Glance)
const currencyToSymbol: Record<string, string> = {
  USD: '$',
  EUR: '€',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  GBP: '£',
  CHF: 'Fr',
  NZD: 'N$',
  INR: '₹',
  BRL: 'R$',
  RUB: '₽',
  TRY: '₺',
  ZAR: 'R',
  CNY: '¥',
  KRW: '₩',
  HKD: 'HK$',
  SGD: 'S$',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  PLN: 'zł',
  PHP: '₱',
}

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        regularMarketPrice: number
        previousClose: number
        chartPreviousClose: number
        currency: string
        shortName: string
        priceHint: number
      }
      indicators: {
        quote: Array<{
          close: (number | null)[]
        }>
      }
    }> | null
    error: {
      code: string
      description: string
    } | null
  }
}

/**
 * Fetch stock data from Yahoo Finance API
 */
async function fetchSingleStock(config: StockConfig): Promise<StockData> {
  const url = `${CORS_PROXY}${encodeURIComponent(`${YAHOO_BASE}/${config.ticker}?interval=1d&range=1mo`)}`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Stock API error for ${config.ticker}: ${response.status}`)
  }

  const data: YahooChartResponse = await response.json()

  if (data.chart.error || !data.chart.result?.[0]) {
    throw new Error(`Stock API error for ${config.ticker}: ${data.chart.error?.description ?? 'No data'}`)
  }

  const result = data.chart.result[0]
  const { regularMarketPrice, chartPreviousClose, currency, shortName, priceHint } = result.meta

  // Get sparkline data (last 21 non-null closing prices, like Glance)
  const closePrices = result.indicators.quote[0].close
    .filter((p): p is number => p !== null)
    .slice(-21)

  // Calculate previous price - prefer second-to-last chart price if available (like Glance)
  let previous = regularMarketPrice
  if (closePrices.length >= 2 && closePrices[closePrices.length - 2] !== 0) {
    previous = closePrices[closePrices.length - 2]
  } else if (chartPreviousClose) {
    previous = chartPreviousClose
  }

  // Calculate percent change
  const changePercent = previous ? ((regularMarketPrice - previous) / previous) * 100 : 0
  const change = regularMarketPrice - previous

  // Format currency symbol using comprehensive map
  const currencySymbol = currencyToSymbol[currency?.toUpperCase()] ?? currency ?? '$'

  // Use priceHint for decimal places (default to 2)
  const decimals = priceHint ?? 2

  return {
    ticker: config.ticker,
    name: config.name || shortName,
    price: regularMarketPrice,
    change: Number(change.toFixed(decimals)),
    changePercent: Number(changePercent.toFixed(2)),
    currency: currencySymbol,
    sparklineData: closePrices,
    priceHint: decimals,
    lastUpdated: new Date(),
  }
}

/**
 * Fetch all configured stocks
 */
export async function fetchStocks(): Promise<StockData[]> {
  const results = await Promise.allSettled(
    stockConfigs.map(config => fetchSingleStock(config))
  )

  const stocks: StockData[] = []
  const errors: string[] = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      stocks.push(result.value)
    } else {
      errors.push(`${stockConfigs[index].ticker}: ${result.reason}`)
    }
  })

  if (errors.length > 0 && stocks.length === 0) {
    throw new Error(`Failed to fetch stocks: ${errors.join(', ')}`)
  }

  return stocks
}

const CACHE_KEY = 'inkdash_stocks_cache'

/**
 * Get cached stock data from localStorage
 */
export function getCachedStocks(): StockData[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const data = JSON.parse(cached)
    return data.map((stock: StockData) => ({
      ...stock,
      lastUpdated: new Date(stock.lastUpdated),
    }))
  } catch {
    return null
  }
}

/**
 * Save stock data to localStorage cache
 */
export function cacheStocks(data: StockData[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // Ignore storage errors
  }
}
