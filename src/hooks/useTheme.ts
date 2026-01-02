import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';
export type ThemeMode = 'light' | 'dark' | 'auto_time' | 'auto_sun';

interface SunTimes {
  sunrise: string; // ISO datetime string
  sunset: string;  // ISO datetime string
}

interface UseThemeOptions {
  mode?: ThemeMode;
  sunTimes?: SunTimes | null;
}

interface UseThemeReturn {
  theme: Theme;
  isDark: boolean;
  mode: ThemeMode;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

/**
 * Determines theme based on current time (7am-7pm light, otherwise dark)
 */
function getThemeForTime(date: Date = new Date()): Theme {
  const hour = date.getHours();
  return hour >= 7 && hour < 19 ? 'light' : 'dark';
}

/**
 * Determines theme based on sunrise/sunset times
 */
function getThemeForSun(sunTimes: SunTimes, date: Date = new Date()): Theme {
  const now = date.getTime();
  const sunrise = new Date(sunTimes.sunrise).getTime();
  const sunset = new Date(sunTimes.sunset).getTime();

  // Light mode between sunrise and sunset
  return now >= sunrise && now < sunset ? 'light' : 'dark';
}

/**
 * Applies theme class to the HTML element
 */
function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

/**
 * Hook that manages theme with multiple modes:
 * - light: Always light mode
 * - dark: Always dark mode
 * - auto_time: Switch based on time (7am/7pm)
 * - auto_sun: Switch based on sunrise/sunset from weather data
 */
export function useTheme(options: UseThemeOptions = {}): UseThemeReturn {
  const { mode: configMode = 'auto_sun', sunTimes = null } = options;

  const [mode, setModeState] = useState<ThemeMode>(configMode);
  const [theme, setTheme] = useState<Theme>(() => {
    // Initial theme based on mode
    if (configMode === 'light') return 'light';
    if (configMode === 'dark') return 'dark';
    if (configMode === 'auto_sun' && sunTimes) {
      return getThemeForSun(sunTimes);
    }
    return getThemeForTime();
  });

  // Compute the appropriate theme based on mode and sun times
  const computeTheme = useCallback((): Theme => {
    if (mode === 'light') return 'light';
    if (mode === 'dark') return 'dark';
    if (mode === 'auto_sun' && sunTimes) {
      return getThemeForSun(sunTimes);
    }
    // Fallback to time-based for auto_time or when sun times unavailable
    return getThemeForTime();
  }, [mode, sunTimes]);

  // Update theme when mode or sun times change
  useEffect(() => {
    const newTheme = computeTheme();
    if (newTheme !== theme) {
      setTheme(newTheme);
      applyTheme(newTheme);
    }
  }, [computeTheme, theme]);

  // Apply theme on mount and set up interval for auto modes
  useEffect(() => {
    applyTheme(theme);

    // Only poll if in an auto mode
    if (mode === 'auto_time' || mode === 'auto_sun') {
      const intervalId = setInterval(() => {
        const newTheme = computeTheme();
        if (newTheme !== theme) {
          setTheme(newTheme);
          applyTheme(newTheme);
        }
      }, 60000); // Check every minute

      return () => clearInterval(intervalId);
    }
  }, [theme, mode, computeTheme]);

  // Sync mode with config mode when it changes
  useEffect(() => {
    setModeState(configMode);
  }, [configMode]);

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => {
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
      return newTheme;
    });
    // Switch to manual mode (light or dark) when toggling
    setModeState((currentMode) => {
      if (currentMode === 'auto_time' || currentMode === 'auto_sun') {
        return theme === 'dark' ? 'light' : 'dark';
      }
      return currentMode === 'light' ? 'dark' : 'light';
    });
  }, [theme]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
  }, []);

  return {
    theme,
    isDark: theme === 'dark',
    mode,
    toggleTheme,
    setMode,
  };
}
