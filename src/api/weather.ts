import type { WeatherData, WeatherCondition, HourlyWeather } from '@/types'
import { weatherLocation } from '@/config/weather'

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast'

interface OpenMeteoResponse {
  current: {
    temperature_2m: number
    apparent_temperature: number
    weather_code: number
    relative_humidity_2m: number
    wind_speed_10m: number
  }
  hourly: {
    time: string[]
    temperature_2m: number[]
    weather_code: number[]
  }
  daily: {
    sunrise: string[]
    sunset: string[]
  }
}

/**
 * Map WMO weather codes to our WeatherCondition type
 * https://open-meteo.com/en/docs#weathervariables
 */
function mapWeatherCode(code: number): WeatherCondition {
  if (code === 0) return 'clear'
  if (code >= 1 && code <= 3) return 'partly-cloudy'
  if (code >= 45 && code <= 48) return 'fog'
  if (code >= 51 && code <= 67) return 'rain'
  if (code >= 71 && code <= 77) return 'snow'
  if (code >= 80 && code <= 82) return 'rain'
  if (code >= 85 && code <= 86) return 'snow'
  if (code >= 95 && code <= 99) return 'thunderstorm'
  return 'cloudy'
}

/**
 * Fetch weather data from Open-Meteo API
 */
export async function fetchWeather(): Promise<WeatherData> {
  const { latitude, longitude } = weatherLocation

  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: 'temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m',
    hourly: 'temperature_2m,weather_code',
    daily: 'sunrise,sunset',
    timezone: 'America/Toronto',
    forecast_days: '1',
  })

  const response = await fetch(`${OPEN_METEO_BASE}?${params}`)

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`)
  }

  const data: OpenMeteoResponse = await response.json()

  // Get current hour to slice hourly data from now
  const currentHour = new Date().getHours()

  // Build hourly forecast for next 24 hours
  const hourlyForecast: HourlyWeather[] = []
  for (let i = 0; i < 24; i++) {
    const hourIndex = (currentHour + i) % 24
    hourlyForecast.push({
      hour: hourIndex,
      temperature: Math.round(data.hourly.temperature_2m[currentHour + i] ?? data.hourly.temperature_2m[hourIndex]),
      condition: mapWeatherCode(data.hourly.weather_code[currentHour + i] ?? data.hourly.weather_code[hourIndex]),
    })
  }

  return {
    location: weatherLocation,
    condition: mapWeatherCode(data.current.weather_code),
    temperature: Math.round(data.current.temperature_2m),
    feelsLike: Math.round(data.current.apparent_temperature),
    humidity: data.current.relative_humidity_2m,
    windSpeed: Math.round(data.current.wind_speed_10m),
    unit: 'celsius',
    sunrise: data.daily.sunrise[0],
    sunset: data.daily.sunset[0],
    hourlyForecast,
    lastUpdated: new Date(),
  }
}

const CACHE_KEY = 'inkdash_weather_cache'

/**
 * Get cached weather data from localStorage
 */
export function getCachedWeather(): WeatherData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const data = JSON.parse(cached)
    data.lastUpdated = new Date(data.lastUpdated)
    return data
  } catch {
    return null
  }
}

/**
 * Save weather data to localStorage cache
 */
export function cacheWeather(data: WeatherData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // Ignore storage errors
  }
}
