import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface UseThemeReturn {
  theme: Theme;
  isDark: boolean;
}

/**
 * Determines theme based on current time
 * Light mode: 7:00 AM - 6:59 PM (hours 7-18)
 * Dark mode: 7:00 PM - 6:59 AM (hours 19-6)
 */
function getThemeForTime(date: Date = new Date()): Theme {
  const hour = date.getHours();
  // Light mode from 7:00 (7) to 18:59 (before 19)
  // Dark mode from 19:00 (19) to 6:59 (before 7)
  return hour >= 7 && hour < 19 ? 'light' : 'dark';
}

/**
 * Applies theme class to the HTML element
 * Adds 'dark' class for dark mode, removes it for light mode
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
 * Hook that automatically switches between light and dark theme based on time of day.
 *
 * - Light mode: 7:00 AM - 6:59 PM
 * - Dark mode: 7:00 PM - 6:59 AM
 *
 * The hook:
 * - Checks time on mount and sets initial theme
 * - Sets up an interval to check every minute for theme changes
 * - Cleans up interval on unmount
 * - Adds/removes 'dark' class on <html> element (Tailwind's class strategy)
 *
 * @returns {UseThemeReturn} Object containing current theme and isDark boolean
 */
export function useTheme(): UseThemeReturn {
  const [theme, setTheme] = useState<Theme>(() => getThemeForTime());

  const updateTheme = useCallback(() => {
    const newTheme = getThemeForTime();
    setTheme((currentTheme) => {
      if (currentTheme !== newTheme) {
        applyTheme(newTheme);
        return newTheme;
      }
      return currentTheme;
    });
  }, []);

  useEffect(() => {
    // Apply initial theme on mount
    applyTheme(theme);

    // Check every minute (60000ms) for theme changes
    const intervalId = setInterval(updateTheme, 60000);

    // Cleanup interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [theme, updateTheme]);

  return {
    theme,
    isDark: theme === 'dark',
  };
}
