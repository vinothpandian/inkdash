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

export function Dashboard() {
  // Initialize auto theme switching (light mode 7am-7pm, dark mode 7pm-7am)
  useTheme();

  const { currentPage, isSwiping, swipeOffset, handlers } = useSwipe({
    totalPages: PAGES.length,
    threshold: 50,
    initialPage: 0,
  });

  // Calculate the transform offset
  // Each page is 100vw wide, so we translate by -currentPage * 100vw + swipeOffset
  const translateX = `calc(-${currentPage * 100}vw + ${swipeOffset}px)`;

  return (
    <div
      className="fixed inset-0 overflow-hidden touch-pan-y select-none bg-background"
      {...handlers}
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
    </div>
  );
}
