import type { WeatherLocation } from '@/types'

/**
 * Weather location configuration (legacy - now managed via Tauri config)
 * This is only used when running the frontend in dev mode without Tauri
 */
export const weatherLocation: WeatherLocation = {
  name: 'Toronto',
  latitude: 43.6532,
  longitude: -79.3832,
}
