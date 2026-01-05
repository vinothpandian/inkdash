import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Sun, Moon, RotateCcw } from 'lucide-react';
import { useSwipe } from '@/hooks/useSwipe';
import { useTheme, type ThemeMode } from '@/hooks/useTheme';
import { useWeather } from '@/hooks/useWeather';
import { ConfigProvider, useTimeline } from '@/context/ConfigContext';
import { OverviewPage } from '@/components/pages/OverviewPage';
import { TasksPage } from '@/components/pages/TasksPage';
import { CalendarPage } from '@/components/pages/CalendarPage';
import { StocksPage } from '@/components/pages/StocksPage';

interface DisplayConfig {
  fullscreen: boolean;
  theme_mode: ThemeMode;
}

interface AppConfig {
  display: DisplayConfig;
}

const PAGES = [
  { id: 'overview', label: 'Home', component: OverviewPage },
  { id: 'tasks', label: 'Tasks', component: TasksPage },
  { id: 'calendar', label: 'Calendar', component: CalendarPage },
  { id: 'stocks', label: 'Stocks', component: StocksPage },
] as const;

const DOCK_HIDE_DELAY = 2000; // 2 seconds after leaving hover zone
const HOVER_ZONE_HEIGHT = 50; // Bottom 50px triggers dock

export function Dashboard() {
  return (
    <ConfigProvider>
      <DashboardContent />
    </ConfigProvider>
  );
}

function DashboardContent() {
  // Access config context for reload functionality
  const { isLoading: isReloading, reloadConfig } = useTimeline();
  // Fetch config for theme mode
  const [themeMode, setThemeMode] = useState<ThemeMode>('auto_sun');
  useEffect(() => {
    invoke<AppConfig>('get_config')
      .then((config) => {
        setThemeMode(config.display.theme_mode);
      })
      .catch((err) => {
        console.error('Failed to load config:', err);
      });
  }, []);

  // Fetch weather data for sunrise/sunset times
  const { data: weatherData } = useWeather();
  const sunTimes = weatherData
    ? { sunrise: weatherData.sunrise, sunset: weatherData.sunset }
    : null;

  // Theme management with sunrise/sunset support
  const { isDark, toggleTheme } = useTheme({ mode: themeMode, sunTimes });

  const { currentPage, isSwiping, swipeOffset, handlers, goToPage } = useSwipe({
    totalPages: PAGES.length,
    threshold: 50,
    initialPage: 0,
  });

  // Dock visibility state
  const [showDock, setShowDock] = useState(false);
  const [isDockHovered, setIsDockHovered] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clear hide timer
  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  // Schedule dock hide
  const scheduleDockHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      if (!isDockHovered) {
        setShowDock(false);
      }
    }, DOCK_HIDE_DELAY);
  }, [clearHideTimer, isDockHovered]);

  // Handle mouse move to detect hover zone
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const isInHoverZone = mouseY >= rect.height - HOVER_ZONE_HEIGHT;

    if (isInHoverZone) {
      setShowDock(true);
      clearHideTimer();
    } else if (showDock && !isDockHovered) {
      scheduleDockHide();
    }
  }, [showDock, isDockHovered, clearHideTimer, scheduleDockHide]);

  // Handle touch near bottom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const touch = e.touches[0];
    const touchY = touch.clientY - rect.top;
    const isInHoverZone = touchY >= rect.height - HOVER_ZONE_HEIGHT;

    if (isInHoverZone) {
      setShowDock(true);
      clearHideTimer();
    }

    handlers.onTouchStart(e);
  }, [handlers, clearHideTimer]);

  // Dock hover handlers
  const handleDockEnter = useCallback(() => {
    setIsDockHovered(true);
    clearHideTimer();
  }, [clearHideTimer]);

  const handleDockLeave = useCallback(() => {
    setIsDockHovered(false);
    scheduleDockHide();
  }, [scheduleDockHide]);

  // Handle page navigation
  const navigateToPage = useCallback((pageIndex: number) => {
    goToPage(pageIndex);
    // Keep dock visible briefly after navigation
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setShowDock(false);
      setIsDockHovered(false);
    }, 1500);
  }, [goToPage, clearHideTimer]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      clearHideTimer();
    };
  }, [clearHideTimer]);

  // Calculate the transform offset
  const translateX = `calc(-${currentPage * 100}vw + ${swipeOffset}px)`;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden touch-pan-y select-none bg-background"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (!isDockHovered) {
          scheduleDockHide();
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handlers.onTouchMove}
      onTouchEnd={handlers.onTouchEnd}
    >
      {/* Pages Container */}
      <div
        className="flex h-full"
        style={{
          transform: `translateX(${translateX})`,
          transition: isSwiping ? 'none' : 'transform 300ms cubic-bezier(0.25, 1, 0.5, 1)',
          width: `${PAGES.length * 100}vw`,
        }}
      >
        {PAGES.map(({ id, component: PageComponent }) => (
          <div
            key={id}
            className="h-full w-screen flex-shrink-0"
          >
            <PageComponent />
          </div>
        ))}
      </div>

      {/* Floating Dock Navigation */}
      <div
        className={`
          fixed bottom-6 left-1/2 -translate-x-1/2
          z-[9999]
          transition-all duration-300 ease-out
          ${showDock
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'}
        `}
        onMouseEnter={handleDockEnter}
        onMouseLeave={handleDockLeave}
      >
        <div className="floating-dock flex items-center gap-1 px-2 py-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-accent-warm/20 transition-colors duration-200"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-accent-warm" />
            ) : (
              <Moon className="w-4 h-4 text-dock-inactive hover:text-dock-active transition-colors" />
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-border mx-1" />

          {/* Page Navigation */}
          {PAGES.map((page, index) => {
            const isActive = index === currentPage;
            return (
              <button
                key={page.id}
                onClick={() => navigateToPage(index)}
                className={`
                  relative flex items-center justify-center
                  transition-all duration-200 ease-out
                  ${isActive
                    ? 'w-auto px-4 py-2'
                    : 'w-10 h-10'}
                `}
                aria-label={`Go to ${page.label}`}
                title={page.label}
              >
                {/* Dot or expanded state */}
                {isActive ? (
                  <span className="text-sm font-medium-labels text-accent-warm whitespace-nowrap">
                    {page.label}
                  </span>
                ) : (
                  <span
                    className="w-2 h-2 rounded-full bg-dock-inactive hover:bg-dock-active transition-colors duration-200"
                  />
                )}
              </button>
            );
          })}

          {/* Divider */}
          <div className="w-px h-5 bg-border mx-1" />

          {/* Reload Config Button */}
          <button
            onClick={reloadConfig}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-accent-warm/20 transition-colors duration-200"
            aria-label="Reload config"
            title="Reload config"
            disabled={isReloading}
          >
            <RotateCcw
              className={`w-4 h-4 text-dock-inactive hover:text-dock-active transition-colors ${isReloading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
