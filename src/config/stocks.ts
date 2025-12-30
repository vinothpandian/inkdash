import type { StockConfig, StockData } from '@/types'

/**
 * Stock configurations for the stocks widget
 * Add or modify stocks to track as needed
 */
export const stocks: StockConfig[] = [
  { ticker: 'TRI', name: 'Thomson Reuters' },
  { ticker: 'VEQT.TO', name: 'Vanguard All-Equity' },
  { ticker: 'VGRO.TO', name: 'Vanguard Growth' },
  { ticker: 'ZGLD.TO', name: 'BMO Gold ETF' },
]

/**
 * Generate mock sparkline data for stock visualization
 * Creates a random walk pattern starting from a base value
 */
function generateSparklineData(basePrice: number, points: number = 20): number[] {
  const data: number[] = []
  let currentPrice = basePrice * 0.98 // Start slightly below current price

  for (let i = 0; i < points; i++) {
    // Random walk with slight upward bias
    const change = (Math.random() - 0.48) * (basePrice * 0.02)
    currentPrice += change
    data.push(Number(currentPrice.toFixed(2)))
  }

  // Ensure last point is close to base price
  data[data.length - 1] = basePrice

  return data
}

/**
 * Mock stock data for development and testing
 * Will be replaced with real API data in production
 */
export const mockStockData: StockData[] = [
  {
    ticker: 'TRI',
    name: 'Thomson Reuters',
    price: 213.45,
    change: 2.35,
    changePercent: 1.11,
    currency: '$',
    sparklineData: generateSparklineData(213.45),
    lastUpdated: new Date(),
  },
  {
    ticker: 'VEQT.TO',
    name: 'Vanguard All-Equity',
    price: 42.87,
    change: -0.23,
    changePercent: -0.53,
    currency: 'C$',
    sparklineData: generateSparklineData(42.87),
    lastUpdated: new Date(),
  },
  {
    ticker: 'VGRO.TO',
    name: 'Vanguard Growth',
    price: 33.12,
    change: 0.15,
    changePercent: 0.45,
    currency: 'C$',
    sparklineData: generateSparklineData(33.12),
    lastUpdated: new Date(),
  },
  {
    ticker: 'ZGLD.TO',
    name: 'BMO Gold ETF',
    price: 28.94,
    change: 0.67,
    changePercent: 2.37,
    currency: 'C$',
    sparklineData: generateSparklineData(28.94),
    lastUpdated: new Date(),
  },
]
