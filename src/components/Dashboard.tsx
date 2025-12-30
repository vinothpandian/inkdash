import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSwipe } from '@/hooks/useSwipe';
import { useTheme } from '@/hooks/useTheme';
import { OverviewPage } from '@/components/pages/OverviewPage';
import { TasksPage } from '@/components/pages/TasksPage';
import { CalendarPage } from '@/components/pages/CalendarPage';
import { StocksPage } from '@/components/pages/StocksPage';

const PAGES = [
  { id: 'overview', component: OverviewPage },
  { id: 'tasks', component: TasksPage },
  { id: 'calendar', component: CalendarPage },
  { id: 'stocks', component: StocksPage },
] as const;

const NAV_HIDE_DELAY = 10000; // 10 seconds

export function Dashboard() {
  // Initialize auto theme switching (light mode 7am-7pm, dark mode 7pm-7am)
  useTheme();

  const { currentPage, isSwiping, swipeOffset, handlers, goToPage, totalPages } = useSwipe({
    totalPages: PAGES.length,
    threshold: 50,
    initialPage: 0,
  });

  // Navigation button visibility state
  const [showNav, setShowNav] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset the hide timer and show nav buttons
  const showNavButtons = useCallback(() => {
    setShowNav(true);

    // Clear existing timer
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    // Set new timer to hide after 10 seconds
    hideTimerRef.current = setTimeout(() => {
      setShowNav(false);
    }, NAV_HIDE_DELAY);
  }, []);

  // Combined handlers that trigger both swipe and nav visibility
  const combinedHandlers = {
    onTouchStart: (e: React.TouchEvent) => {
      showNavButtons();
      handlers.onTouchStart(e);
    },
    onTouchMove: handlers.onTouchMove,
    onTouchEnd: handlers.onTouchEnd,
    onMouseDown: handlers.onMouseDown,
    onMouseMove: (e: React.MouseEvent) => {
      showNavButtons();
      handlers.onMouseMove(e);
    },
    onMouseUp: handlers.onMouseUp,
    onMouseLeave: handlers.onMouseLeave,
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  // Navigate to previous page
  const goToPrevious = useCallback(() => {
    if (currentPage > 0) {
      goToPage(currentPage - 1);
    }
  }, [currentPage, goToPage]);

  // Navigate to next page
  const goToNext = useCallback(() => {
    if (currentPage < totalPages - 1) {
      goToPage(currentPage + 1);
    }
  }, [currentPage, goToPage, totalPages]);

  // Calculate the transform offset
  // Each page is 100vw wide, so we translate by -currentPage * 100vw + swipeOffset
  const translateX = `calc(-${currentPage * 100}vw + ${swipeOffset}px)`;

  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === totalPages - 1;

  return (
    <div
      className="fixed inset-0 overflow-hidden touch-pan-y select-none bg-background"
      {...combinedHandlers}
    >
      <div
        className="flex h-full"
        style={{
          transform: `translateX(${translateX})`,
          transition: isSwiping ? 'none' : 'transform 300ms ease-out',
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

      {/* Floating Navigation Buttons */}
      {/* Previous Button */}
      <button
        onClick={goToPrevious}
        className={`
          fixed left-4 bottom-8 z-50
          w-12 h-12 min-w-[44px] min-h-[44px]
          flex items-center justify-center
          rounded-full
          bg-black/20 dark:bg-white/20
          backdrop-blur-sm
          text-white dark:text-white
          shadow-lg
          transition-all duration-300 ease-in-out
          active:scale-95 active:bg-black/30 dark:active:bg-white/30
          ${showNav && !isFirstPage
            ? 'opacity-100 translate-x-0'
            : 'opacity-0 -translate-x-4 pointer-events-none'}
        `}
        aria-label="Previous page"
        disabled={isFirstPage}
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Next Button */}
      <button
        onClick={goToNext}
        className={`
          fixed right-4 bottom-8 z-50
          w-12 h-12 min-w-[44px] min-h-[44px]
          flex items-center justify-center
          rounded-full
          bg-black/20 dark:bg-white/20
          backdrop-blur-sm
          text-white dark:text-white
          shadow-lg
          transition-all duration-300 ease-in-out
          active:scale-95 active:bg-black/30 dark:active:bg-white/30
          ${showNav && !isLastPage
            ? 'opacity-100 translate-x-0'
            : 'opacity-0 translate-x-4 pointer-events-none'}
        `}
        aria-label="Next page"
        disabled={isLastPage}
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Page Indicator */}
      <div
        className={`
          fixed bottom-8 left-1/2 -translate-x-1/2 z-50
          flex gap-2
          px-3 py-2
          rounded-full
          bg-black/20 dark:bg-white/20
          backdrop-blur-sm
          transition-all duration-300 ease-in-out
          ${showNav ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
        `}
      >
        {PAGES.map((_, index) => (
          <button
            key={index}
            onClick={() => goToPage(index)}
            className={`
              w-2 h-2 rounded-full
              transition-all duration-200
              ${index === currentPage
                ? 'bg-white w-4'
                : 'bg-white/50 hover:bg-white/70'}
            `}
            aria-label={`Go to page ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
