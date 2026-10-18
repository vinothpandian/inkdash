import type { RevisionRecord } from './openThreads';

export interface RevisionSource {
  subscribe: (changed: () => void) => Promise<() => void>;
  read: () => Promise<RevisionRecord[]>;
}

// Subscribe first; serialize reads and replay once more if an event arrived mid-read.
export function watchRevisions(source: RevisionSource, received: (rows: RevisionRecord[]) => void, failed: (error: unknown) => void) {
  let stopped = false;
  let reading = false;
  let dirty = false;
  let unsubscribe: (() => void) | undefined;
  async function refresh() {
    dirty = true;
    if (reading || stopped) return;
    reading = true;
    try {
      while (dirty && !stopped) {
        dirty = false;
        const rows = await source.read();
        if (!stopped) received(rows);
      }
    } catch (error) {
      if (!stopped) failed(error);
    } finally { reading = false; }
  }
  let subscribing = false;
  function connect() {
    if (stopped || subscribing || unsubscribe) return;
    subscribing = true;
    void source.subscribe(() => { void refresh(); }).then(stop => {
      if (stopped) { stop(); return; }
      unsubscribe = stop;
      void refresh();
    }).catch(error => { if (!stopped) failed(error); }).finally(() => { subscribing = false; });
  }
  connect();
  // Also reconciles missed events and remains useful when SSE is temporarily unavailable.
  const timer = setInterval(() => {
    if (!unsubscribe) connect();
    void refresh();
  }, 30000);
  return () => { stopped = true; clearInterval(timer); unsubscribe?.(); };
}
