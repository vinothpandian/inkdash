import type { WeatherData, WeatherLocation, HourlyWeather } from '@/types'

/**
 * Weather location configuration
 * Modify this to change the weather location
 */
export const weatherLocation: WeatherLocation = {
  city: 'Toronto',
  country: 'Canada',
  latitude: 43.6532,
  longitude: -79.3832,
}

/**
 * Generate mock hourly weather data for 24 hours
 * Simulates a realistic temperature curve throughout the day
 */
function generateHourlyForecast(baseTemp: number): HourlyWeather[] {
  const hourlyData: HourlyWeather[] = []

  // Temperature variation throughout the day (coldest at 5am, warmest at 3pm)
  const tempVariation = [
    -6, -7, -7, -6, -5, -4, // 00:00 - 05:00
    -3, -1, 1, 3, 5, 6, // 06:00 - 11:00
    7, 8, 8, 7, 5, 3, // 12:00 - 17:00
    1, -1, -2, -3, -4, -5, // 18:00 - 23:00
  ]

  // Condition patterns (more clouds in morning and evening)
  const conditionPattern: Array<'clear' | 'partly-cloudy' | 'sunny' | 'cloudy'> = [
    'clear', 'clear', 'clear', 'clear', 'clear', 'partly-cloudy',
    'partly-cloudy', 'partly-cloudy', 'sunny', 'sunny', 'sunny', 'sunny',
    'sunny', 'sunny', 'sunny', 'partly-cloudy', 'partly-cloudy', 'partly-cloudy',
    'clear', 'clear', 'clear', 'clear', 'clear', 'clear',
  ]

  for (let hour = 0; hour < 24; hour++) {
    hourlyData.push({
      hour,
      temperature: Math.round(baseTemp + tempVariation[hour]),
      condition: conditionPattern[hour],
    })
  }

  return hourlyData
}

/**
 * Get today's sunrise and sunset times for Toronto
 * Returns ISO strings for current date
 */
function getTodaySunTimes(): { sunrise: string; sunset: string } {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const date = today.getDate()

  // Approximate sunrise/sunset for Toronto (varies by season)
  // Winter: ~7:50am sunrise, ~4:50pm sunset
  // Summer: ~5:35am sunrise, ~9:00pm sunset
  const monthIndex = today.getMonth()
  const isSummer = monthIndex >= 4 && monthIndex <= 8

  const sunriseHour = isSummer ? 5 : 7
  const sunriseMinute = isSummer ? 35 : 50
  const sunsetHour = isSummer ? 21 : 16
  const sunsetMinute = isSummer ? 0 : 50

  const sunrise = new Date(year, month, date, sunriseHour, sunriseMinute)
  const sunset = new Date(year, month, date, sunsetHour, sunsetMinute)

  return {
    sunrise: sunrise.toISOString(),
    sunset: sunset.toISOString(),
  }
}

/**
 * Mock weather data for development and testing
 * Will be replaced with real API data in production
 */
export function getMockWeatherData(): WeatherData {
  const sunTimes = getTodaySunTimes()
  const baseTemp = -2 // Winter temperature for Toronto in Celsius

  return {
    location: weatherLocation,
    condition: 'partly-cloudy',
    temperature: baseTemp,
    feelsLike: baseTemp - 5, // Wind chill factor
    humidity: 68,
    windSpeed: 15,
    unit: 'celsius',
    sunrise: sunTimes.sunrise,
    sunset: sunTimes.sunset,
    hourlyForecast: generateHourlyForecast(baseTemp),
    lastUpdated: new Date(),
  }
}

/**
 * Static mock weather data instance
 * Use getMockWeatherData() for fresh data with current timestamps
 */
export const mockWeatherData: WeatherData = getMockWeatherData()
