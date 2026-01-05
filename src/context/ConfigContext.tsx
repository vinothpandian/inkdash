import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { TimelineData } from '../types'

// ============================================================================
// Types
// ============================================================================

interface ConfigContextValue {
  /** Timeline data from config */
  timeline: TimelineData | null
  /** Whether timeline is currently loading */
  isLoading: boolean
  /** Error message if timeline fetch failed */
  error: string | null
  /** Function to reload config and timeline data */
  reloadConfig: () => Promise<void>
}

// ============================================================================
// Context
// ============================================================================

const ConfigContext = createContext<ConfigContextValue | null>(null)

// ============================================================================
// Provider
// ============================================================================

interface ConfigProviderProps {
  children: ReactNode
}

/**
 * Provider component that fetches and provides config/timeline data
 * to the component tree.
 */
export function ConfigProvider({ children }: ConfigProviderProps) {
  const [timeline, setTimeline] = useState<TimelineData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTimeline = useCallback(async () => {
    try {
      const timelineData = await invoke<TimelineData>('get_timeline')
      setTimeline(timelineData)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    }
  }, [])

  const reloadConfig = useCallback(async () => {
    setIsLoading(true)
    await fetchTimeline()
    setIsLoading(false)
  }, [fetchTimeline])

  useEffect(() => {
    let mounted = true

    const initialFetch = async () => {
      setIsLoading(true)
      await fetchTimeline()
      if (mounted) {
        setIsLoading(false)
      }
    }

    initialFetch()

    return () => {
      mounted = false
    }
  }, [fetchTimeline])

  const value: ConfigContextValue = {
    timeline,
    isLoading,
    error,
    reloadConfig,
  }

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access timeline data and config reload function.
 *
 * @returns Timeline data, loading state, error state, and reload function
 * @throws Error if used outside of ConfigProvider
 */
export function useTimeline(): ConfigContextValue {
  const context = useContext(ConfigContext)

  if (context === null) {
    throw new Error('useTimeline must be used within a ConfigProvider')
  }

  return context
}
