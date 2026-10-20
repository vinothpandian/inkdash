export interface Pause { pausedAt: number; resumedAt?: number }
export interface Stretch { startedAt: number; endedAt?: number; pauses?: Pause[]; endReason?: 'restarted' }
export interface Thread { id: string; name: string; stretches: Stretch[]; deleted?: true }
export interface RevisionRecord { revision: string; payload: unknown }
export interface OpenThread extends Thread { openedAt: number; elapsed: number; total: number }

function timestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 8.64e15;
}
function parseThread(value: unknown): Thread {
  if (!value || typeof value !== 'object') throw new Error('Invalid thread data');
  const t = value as Thread;
  if (Object.prototype.hasOwnProperty.call(t, 'deleted') && t.deleted !== true) throw new Error('Invalid deletion flag');
  if (typeof t.id !== 'string' || !t.id || typeof t.name !== 'string' || !t.name.trim() || !Array.isArray(t.stretches) || !t.stretches.length) throw new Error('Invalid thread data');
  let previousEnd = 0;
  t.stretches.forEach((s, i) => {
    if (!s || !timestamp(s.startedAt) || s.startedAt < previousEnd ||
      (s.endedAt !== undefined ? !timestamp(s.endedAt) || s.endedAt < s.startedAt : i !== t.stretches.length - 1)) throw new Error('Invalid thread stretches');
    if (s.endReason !== undefined && (s.endReason !== 'restarted' || s.endedAt === undefined)) throw new Error('Invalid run end reason');
    if (s.pauses !== undefined) {
      if (!Array.isArray(s.pauses)) throw new Error('Invalid pause history');
      let previous = s.startedAt;
      s.pauses.forEach((pause, index) => {
        if (!pause || typeof pause !== 'object' || !timestamp(pause.pausedAt) || pause.pausedAt < previous ||
          (s.endedAt !== undefined && pause.pausedAt > s.endedAt)) throw new Error('Invalid pause time');
        if (pause.resumedAt !== undefined) {
          if (!timestamp(pause.resumedAt) || pause.resumedAt < pause.pausedAt ||
            (s.endedAt !== undefined && pause.resumedAt > s.endedAt)) throw new Error('Invalid resume time');
          previous = pause.resumedAt;
        } else if (index !== s.pauses!.length - 1) throw new Error('Unfinished pause must be last');
      });
    }
    previousEnd = s.endedAt ?? s.startedAt;
  });
  return t;
}

function isActive(thread: Thread): boolean {
  if (thread.deleted) return false;
  const current = thread.stretches[thread.stretches.length - 1];
  const pauses = current.pauses ?? [];
  return current.endedAt === undefined && (!pauses.length || pauses[pauses.length - 1].resumedAt !== undefined);
}

function stretchElapsed(stretch: Stretch, now: number): number {
  const end = stretch.endedAt ?? now;
  const paused = (stretch.pauses ?? []).reduce((sum, pause) =>
    sum + Math.max(0, Math.min(pause.resumedAt ?? end, end) - pause.pausedAt), 0);
  return Math.max(0, end - stretch.startedAt - paused);
}

// Records must arrive in server insertion order, matching Open Threads' merge rule.
export function projectOpenThreads(records: readonly RevisionRecord[], now: number): OpenThread[] {
  const latest = new Map<string, Thread>();
  for (const record of records) {
    if (typeof record.revision !== 'string' || !record.revision) throw new Error('Invalid revision');
    const thread = parseThread(record.payload);
    // Match Open Threads: deletion wins over later uploads from a stale device.
    if (!latest.get(thread.id)?.deleted) latest.set(thread.id, thread);
  }
  return [...latest.values()].filter(isActive)
    .map(t => {
      const openedAt = t.stretches[t.stretches.length - 1].startedAt;
      return { ...t, openedAt, elapsed: stretchElapsed(t.stretches[t.stretches.length - 1], now), total: t.stretches.reduce((sum, s) => sum + stretchElapsed(s, now), 0) };
    }).sort((a, b) => b.openedAt - a.openedAt || a.id.localeCompare(b.id));
}

export function formatElapsed(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60000);
  if (!minutes) return '<1m';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor(minutes % 1440 / 60);
  return [days ? `${days}d` : '', hours ? `${hours}h` : '', minutes % 60 ? `${minutes % 60}m` : ''].filter(Boolean).join(' ');
}
