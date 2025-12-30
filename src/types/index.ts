/**
 * Type definitions for the InkDash dashboard
 */

// ============================================================================
// Timezone Types
// ============================================================================

export interface TimezoneConfig {
  /** Display name for the timezone (e.g., "Minnesota", "London") */
  name: string
  /** IANA timezone identifier (e.g., "America/Chicago", "Europe/London") */
  timezone: string
}

// ============================================================================
// Stock Types
// ============================================================================

export interface StockConfig {
  /** Stock ticker symbol (e.g., "TRI", "VEQT.TO") */
  ticker: string
  /** Human-readable name for the stock */
  name: string
}

export interface StockData {
  /** Stock ticker symbol */
  ticker: string
  /** Human-readable name for the stock */
  name: string
  /** Current price in the stock's currency */
  price: number
  /** Price change from previous close (absolute value) */
  change: number
  /** Percentage change from previous close */
  changePercent: number
  /** Currency symbol (e.g., "$", "C$") */
  currency: string
  /** Sparkline data points for mini chart visualization */
  sparklineData: number[]
  /** Timestamp of last update */
  lastUpdated: Date
}

// ============================================================================
// Weather Types
// ============================================================================

export interface HourlyWeather {
  /** Hour in 24-hour format (0-23) */
  hour: number
  /** Temperature in the configured unit */
  temperature: number
  /** Weather condition for the hour */
  condition: WeatherCondition
}

export type WeatherCondition =
  | 'sunny'
  | 'partly-cloudy'
  | 'cloudy'
  | 'overcast'
  | 'rain'
  | 'snow'
  | 'thunderstorm'
  | 'fog'
  | 'clear'

export interface WeatherLocation {
  /** City name */
  city: string
  /** Country or region */
  country: string
  /** Latitude coordinate */
  latitude: number
  /** Longitude coordinate */
  longitude: number
}

export interface WeatherData {
  /** Location information */
  location: WeatherLocation
  /** Current weather condition */
  condition: WeatherCondition
  /** Current temperature */
  temperature: number
  /** "Feels like" temperature */
  feelsLike: number
  /** Humidity percentage (0-100) */
  humidity: number
  /** Wind speed in km/h */
  windSpeed: number
  /** Temperature unit */
  unit: 'celsius' | 'fahrenheit'
  /** Sunrise time as ISO string or Date */
  sunrise: string
  /** Sunset time as ISO string or Date */
  sunset: string
  /** Hourly forecast data (24 hours) */
  hourlyForecast: HourlyWeather[]
  /** Timestamp of last update */
  lastUpdated: Date
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DashboardConfig {
  /** Configured timezones to display */
  timezones: TimezoneConfig[]
  /** Configured stocks to track */
  stocks: StockConfig[]
  /** Weather location configuration */
  weatherLocation: WeatherLocation
}
