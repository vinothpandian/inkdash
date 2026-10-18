import { useEffect, useState } from 'react';
import { invoke } from '@/bridge';
import { projectOpenThreads, type RevisionRecord } from '@/lib/openThreads';
import { createThreadsSource, threadsError, type ThreadsConfig } from '@/lib/pocketbaseThreads';
import { watchRevisions } from '@/lib/openThreadsSync';

export function useOpenThreads() {
  const [attempt, setAttempt] = useState(0);
  const [records, setRecords] = useState<RevisionRecord[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [status, setStatus] = useState('Connecting');
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    let stop: (() => void) | undefined;
    let close: (() => void) | undefined;
    const timer = setInterval(() => setNow(Date.now()), 60000);
    async function start() {
      try {
        const config = await invoke<ThreadsConfig | null>('get_open_threads_config');
        if (!active) return;
        if (!config) { setStatus('Not connected'); setError('Set OPEN_THREADS_POCKETBASE_TOKEN in the app environment, then retry.'); return; }
        const client = await createThreadsSource(config, connected => {
          if (active) setStatus(connected ? 'Live' : 'Reconnecting');
        });
        close = client.close;
        if (!active) { close(); return; }
        stop = watchRevisions(client.source, rows => {
          try {
            projectOpenThreads(rows, Date.now());
            setRecords(rows); setNow(Date.now()); setLoaded(true); setError(null);
          } catch { setStatus('Sync paused'); setError('PocketBase returned invalid thread data. Check Open Threads and retry.'); }
        }, reason => { setStatus('Reconnecting'); setError(threadsError(reason)); });
      } catch (reason) { if (active) { setStatus('Not connected'); setError(threadsError(reason)); } }
    }
    void start();
    return () => { active = false; stop?.(); close?.(); clearInterval(timer); };
  }, [attempt]);
  return { threads: projectOpenThreads(records, now), status, error, loaded, retry: () => {
    setStatus('Connecting'); setError(null); setAttempt(a => a + 1);
  } };
}
