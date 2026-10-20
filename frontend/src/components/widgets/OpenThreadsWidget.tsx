import { RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useOpenThreads } from '@/hooks/useOpenThreads';
import { formatElapsed } from '@/lib/openThreads';

export function OpenThreadsWidget() {
  return <OpenThreadsPanel {...useOpenThreads()} />;
}

export function OpenThreadsPanel({ threads, status, error, loaded, retry }: ReturnType<typeof useOpenThreads>) {
  const connectionFailed = Boolean(error) || status === 'Reconnecting' || status === 'Not connected' || status === 'Sync paused';
  const connectionMessage = connectionFailed
    ? `${loaded ? 'Showing last sync. ' : ''}${error || 'Connection lost. Reconnecting.'}`
    : status;
  return (
    <Card className="threads-panel h-full min-h-0 overflow-hidden" role="region" aria-label="Open threads">
      <div className="threads-header flex shrink-0 justify-end">
        <button onClick={retry} aria-label={`Reconnect Open Threads${loaded ? `, ${threads.length} open threads` : ''}${connectionFailed ? ', connection failed' : ''}`} title={`Refresh threads. ${connectionMessage}`} className="threads-refresh flex items-center gap-2 rounded-md hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground cursor-pointer" onPointerDown={e => e.stopPropagation()}>
          <span className="tabular-nums">{loaded ? threads.length : '…'}</span>
          <RotateCcw className="size-4" aria-hidden="true" />
          {connectionFailed && <span className="threads-connection-dot" aria-hidden="true" />}
        </button>
        <span className="sr-only" role={connectionFailed ? 'alert' : 'status'}>{connectionMessage}</span>
      </div>
      {!loaded ? (
        <p className="text-sm text-foreground/70 my-auto pb-3">{error ? 'Your threads will appear here once connected.' : 'Loading your open threads…'}</p>
      ) : threads.length === 0 ? (
        <div className="my-auto pb-3"><p className="text-sm font-medium">No open threads</p><p className="mt-1 text-xs text-foreground/70">Open a thread in Raycast. It will appear here after it syncs.</p></div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain threads-scroll" tabIndex={0} aria-label="Open threads, recently opened first" onTouchStart={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
          <ul className="threads-list">
            {threads.map(thread => (
              <li key={thread.id} className="thread-row">
                <div className="min-w-0">
                  <h3 className="thread-title" title={thread.name}>{thread.name}</h3>
                </div>
                <div className="thread-meta">
                  <p className="thread-since">Since <time dateTime={new Date(thread.openedAt).toISOString()}>{new Date(thread.openedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time></p>
                  <p className="thread-elapsed">{formatElapsed(thread.elapsed)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
