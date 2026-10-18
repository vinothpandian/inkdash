import { RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useOpenThreads } from '@/hooks/useOpenThreads';
import { formatElapsed } from '@/lib/openThreads';

export function OpenThreadsWidget() {
  return <OpenThreadsPanel {...useOpenThreads()} />;
}

export function OpenThreadsPanel({ threads, status, error, loaded, retry }: ReturnType<typeof useOpenThreads>) {
  return (
    <Card className="h-full max-h-[25rem] min-h-0 px-4 py-3 gap-2" role="region" aria-labelledby="open-threads-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="open-threads-heading" className="text-base font-medium">Open Threads <span className="ml-2 text-xs text-foreground/70 tabular-nums">{loaded ? threads.length : ''}</span></h2>
        <div className="flex items-center gap-2 text-xs text-foreground/70">
          <span role="status">{error && loaded ? 'Showing last sync' : status}</span>
          <button onClick={retry} aria-label="Reconnect Open Threads" title="Reconnect Open Threads" className="p-2 rounded-md hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground cursor-pointer" onPointerDown={e => e.stopPropagation()}>
            <RotateCcw className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
      {error && <p role="alert" className="text-xs text-foreground/80">{error}</p>}
      {!loaded ? (
        <p className="text-sm text-foreground/70 my-auto pb-3">{error ? 'Your threads will appear here once connected.' : 'Loading your open threads…'}</p>
      ) : threads.length === 0 ? (
        <div className="my-auto pb-3"><p className="text-sm font-medium">No open threads</p><p className="mt-1 text-xs text-foreground/70">Open a thread in Raycast. It will appear here after it syncs.</p></div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain threads-scroll" tabIndex={0} aria-label="Open threads, recently opened first" onTouchStart={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
          <ul className="h-full grid grid-cols-3 gap-x-4 gap-y-2" style={{ gridAutoRows: 'clamp(104px, calc((100% - 1rem) / 3), 112px)' }}>
            {threads.map(thread => (
              <li key={thread.id} className="min-w-0 min-h-0 border-t py-1 flex flex-col justify-center gap-1 overflow-hidden">
                <p className="text-xs leading-4 text-foreground/70 shrink-0">Since <time dateTime={new Date(thread.openedAt).toISOString()}>{new Date(thread.openedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time></p>
                <div className="min-h-0 flex items-center overflow-hidden">
                  <h3 className="text-base font-medium break-words leading-5 line-clamp-2" title={thread.name}>{thread.name}</h3>
                </div>
                <p className="text-sm leading-5 tabular-nums shrink-0 text-foreground/80">{formatElapsed(thread.elapsed)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
