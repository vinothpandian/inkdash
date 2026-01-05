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
  /** Number of decimal places for price display (from Yahoo priceHint) */
  priceHint?: number
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
  /** Location name (e.g., "Toronto") */
  name: string
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

// ============================================================================
// TickTick Task Types
// ============================================================================

export type TaskPriority = 'none' | 'low' | 'medium' | 'high'
export type TaskFilter = 'today' | 'week' | 'backlog'

export interface TickTickTask {
  /** Unique task ID */
  id: string
  /** Task title/content */
  title: string
  /** Task completion status */
  isCompleted: boolean
  /** Task priority (0=none, 1=low, 3=medium, 5=high) */
  priority: number
  /** Due date (ISO string) */
  dueDate?: string
  /** Start date (ISO string) */
  startDate?: string
  /** Project/list ID */
  projectId: string
  /** Project/list name */
  projectName?: string
  /** Task tags */
  tags?: string[]
  /** Created date (ISO string) */
  createdTime: string
  /** Modified date (ISO string) */
  modifiedTime: string
}

export interface TickTickProject {
  /** Unique project ID */
  id: string
  /** Project name */
  name: string
  /** Project color */
  color?: string
  /** Sort order */
  sortOrder: number
}

export interface TickTickData {
  /** List of tasks */
  tasks: TickTickTask[]
  /** List of projects/lists */
  projects: TickTickProject[]
  /** Timestamp of last update */
  lastUpdated: Date
}

// ============================================================================
// Calendar Types
// ============================================================================

export interface CalendarEventDateTime {
  /** ISO datetime string */
  dateTime?: string
  /** Date string (for all-day events) */
  date?: string
  /** Timezone */
  timeZone?: string
}

export interface CalendarEvent {
  /** Event ID */
  id: string
  /** Event title */
  summary: string
  /** Event description */
  description?: string
  /** Start time */
  start: CalendarEventDateTime
  /** End time */
  end: CalendarEventDateTime
  /** Event location */
  location?: string
  /** Link to event in Google Calendar */
  htmlLink?: string
  /** Calendar ID this event belongs to */
  calendarId: string
  /** Calendar display name */
  calendarName: string
  /** Calendar color */
  calendarColor: string
}

export interface CalendarSource {
  /** Calendar ID */
  id: string
  /** Display name */
  name: string
  /** Color for visual distinction */
  color: string
}

// ============================================================================
// Timeline Types
// ============================================================================

export interface TimelineEvent {
  /** Time in "HH:MM" format */
  time: string
  /** Display label for the event */
  label: string
  /** Type of event: marker, range-start, or range-end */
  type: 'marker' | 'range-start' | 'range-end'
}

export interface TimelineData {
  /** List of timeline events */
  events: TimelineEvent[]
  /** Start hour for the timeline display (0-23) */
  start_hour: number
  /** End hour for the timeline display (0-23) */
  end_hour: number
}
