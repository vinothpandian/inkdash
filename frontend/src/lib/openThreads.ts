export interface Stretch { startedAt: number; endedAt?: number }
export interface Thread { id: string; name: string; stretches: Stretch[] }
export interface RevisionRecord { revision: string; payload: unknown }
export interface OpenThread extends Thread { openedAt: number; elapsed: number; total: number }

function timestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 8.64e15;
}
function parseThread(value: unknown): Thread {
  if (!value || typeof value !== 'object') throw new Error('Invalid thread data');
  const t = value as Thread;
  if (typeof t.id !== 'string' || !t.id || typeof t.name !== 'string' || !t.name.trim() || !Array.isArray(t.stretches) || !t.stretches.length) throw new Error('Invalid thread data');
  let previousEnd = 0;
  t.stretches.forEach((s, i) => {
    if (!s || !timestamp(s.startedAt) || s.startedAt < previousEnd ||
      (s.endedAt !== undefined ? !timestamp(s.endedAt) || s.endedAt < s.startedAt : i !== t.stretches.length - 1)) throw new Error('Invalid thread stretches');
    previousEnd = s.endedAt ?? s.startedAt;
  });
  return t;
}

// Records must arrive in server insertion order, matching Open Threads' merge rule.
export function projectOpenThreads(records: readonly RevisionRecord[], now: number): OpenThread[] {
  const latest = new Map<string, Thread>();
  for (const record of records) {
    if (typeof record.revision !== 'string' || !record.revision) throw new Error('Invalid revision');
    const thread = parseThread(record.payload);
    latest.set(thread.id, thread);
  }
  return [...latest.values()].filter(t => t.stretches[t.stretches.length - 1].endedAt === undefined)
    .map(t => {
      const openedAt = t.stretches[t.stretches.length - 1].startedAt;
      return { ...t, openedAt, elapsed: Math.max(0, now - openedAt), total: t.stretches.reduce((sum, s) => sum + Math.max(0, (s.endedAt ?? now) - s.startedAt), 0) };
    }).sort((a, b) => a.openedAt - b.openedAt || a.id.localeCompare(b.id));
}

export function formatElapsed(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60000);
  if (!minutes) return '<1m';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor(minutes % 1440 / 60);
  return [days ? `${days}d` : '', hours ? `${hours}h` : '', minutes % 60 ? `${minutes % 60}m` : ''].filter(Boolean).join(' ');
}
