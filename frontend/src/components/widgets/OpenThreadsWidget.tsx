import { RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useOpenThreads } from '@/hooks/useOpenThreads';
import { formatElapsed } from '@/lib/openThreads';

export function OpenThreadsWidget() {
  return <OpenThreadsPanel {...useOpenThreads()} />;
}

export function OpenThreadsPanel({ threads, status, error, loaded, retry }: ReturnType<typeof useOpenThreads>) {
  return (
    <Card className="h-full min-h-0 px-5 py-4 gap-3" role="region" aria-labelledby="open-threads-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="open-threads-heading" className="text-base font-medium">Open Threads <span className="ml-2 text-sm text-foreground/70 tabular-nums">{loaded ? threads.length : ''}</span></h2>
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
        <div className="min-h-0 overflow-y-auto overscroll-contain threads-scroll" tabIndex={0} aria-label="Open threads, oldest first" onTouchStart={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
            {threads.map(thread => (
              <li key={thread.id} className="min-w-0 border-t pt-3">
                <h3 className="text-sm font-medium break-words leading-snug">{thread.name}</h3>
                <p className="mt-1 text-lg tabular-nums tracking-tight">{formatElapsed(thread.elapsed)} <span className="text-xs text-foreground/70 tracking-normal">open</span></p>
                <p className="mt-1 text-xs text-foreground/70">Since <time dateTime={new Date(thread.openedAt).toISOString()}>{new Date(thread.openedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time></p>
                {thread.stretches.length > 1 && <p className="mt-1 text-xs text-foreground/70">{formatElapsed(thread.total)} total · {thread.stretches.length} stretches</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
