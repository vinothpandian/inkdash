import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';
type ThemeMode = 'auto' | 'manual';

interface UseThemeReturn {
  theme: Theme;
  isDark: boolean;
  mode: ThemeMode;
  toggleTheme: () => void;
  setAutoMode: () => void;
}

/**
 * Determines theme based on current time
 * Light mode: 7:00 AM - 6:59 PM (hours 7-18)
 * Dark mode: 7:00 PM - 6:59 AM (hours 19-6)
 */
function getThemeForTime(date: Date = new Date()): Theme {
  const hour = date.getHours();
  return hour >= 7 && hour < 19 ? 'light' : 'dark';
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
 * Hook that manages theme with auto (time-based) and manual modes.
 */
export function useTheme(): UseThemeReturn {
  const [theme, setTheme] = useState<Theme>(() => getThemeForTime());
  const [mode, setMode] = useState<ThemeMode>('auto');

  const updateTheme = useCallback(() => {
    if (mode === 'auto') {
      const newTheme = getThemeForTime();
      setTheme((currentTheme) => {
        if (currentTheme !== newTheme) {
          applyTheme(newTheme);
          return newTheme;
        }
        return currentTheme;
      });
    }
  }, [mode]);

  const toggleTheme = useCallback(() => {
    setMode('manual');
    setTheme((currentTheme) => {
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
      return newTheme;
    });
  }, []);

  const setAutoMode = useCallback(() => {
    setMode('auto');
    const autoTheme = getThemeForTime();
    setTheme(autoTheme);
    applyTheme(autoTheme);
  }, []);

  useEffect(() => {
    applyTheme(theme);

    // Check every minute for theme changes (only matters in auto mode)
    const intervalId = setInterval(updateTheme, 60000);

    return () => {
      clearInterval(intervalId);
    };
  }, [theme, updateTheme]);

  return {
    theme,
    isDark: theme === 'dark',
    mode,
    toggleTheme,
    setAutoMode,
  };
}
