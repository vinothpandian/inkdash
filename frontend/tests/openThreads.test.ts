import { describe, expect, it } from 'vitest';
import { projectOpenThreads, formatElapsed } from '../src/lib/openThreads';
const thread = (id: string, start: number, end?: number) => ({ id, name: id, stretches: [{ startedAt: start, ...(end === undefined ? {} : { endedAt: end }) }] });
const record = (payload: unknown) => ({ revision: 'revision', payload });
describe('revision projection', () => {
  it('replays closed and reopened threads in insertion order', () => {
    const reopened = { id: 'a', name: 'a', stretches: [{ startedAt: 100, endedAt: 200 }, { startedAt: 500 }] };
    expect(projectOpenThreads([record(thread('a', 100)), record(thread('a', 100, 200)), record(reopened)], 1000))
      .toEqual([{ ...reopened, openedAt: 500, elapsed: 500, total: 600 }]);
  });
  it('does not resurrect a thread whose latest revision is closed', () => {
    expect(projectOpenThreads([record(thread('a', 100)), record(thread('a', 100, 200))], 1000)).toEqual([]);
  });
  it('sorts by newest current open stretch and clamps future starts', () => {
    expect(projectOpenThreads([record(thread('b', 900)), record(thread('a', 100)), record(thread('c', 2000))], 1000).map(t => [t.id, t.elapsed]))
      .toEqual([['c', 0], ['b', 100], ['a', 900]]);
  });
  it.each([null, { id: 'a', name: 'a', stretches: [] }, thread('a', NaN), { id: 'a', name: 'a', stretches: [{ startedAt: 200, endedAt: 100 }] }, { id: 'a', name: 'a', stretches: [{ startedAt: 1 }, { startedAt: 2 }] }])('rejects invalid revisions without silently showing old state', payload => {
    expect(() => projectOpenThreads([record(thread('a', 100)), record(payload)], 1000)).toThrow();
  });
  it('hides paused and completed threads while keeping active legacy threads', () => {
    const paused = { ...thread('paused', 100), stretches: [{ startedAt: 100, pauses: [{ pausedAt: 300 }] }] };
    const completed = { ...thread('completed', 100), stretches: [{ startedAt: 100, endedAt: 400, pauses: [{ pausedAt: 300 }] }] };
    expect(projectOpenThreads([record(thread('active', 100)), record(paused), record(completed)], 1000).map(t => t.id)).toEqual(['active']);
  });
  it('replays pause and resume revisions without resurrecting the old active snapshot', () => {
    const active = thread('a', 100);
    const paused = { ...active, stretches: [{ startedAt: 100, pauses: [{ pausedAt: 300 }] }] };
    const resumed = { ...active, stretches: [{ startedAt: 100, pauses: [{ pausedAt: 300, resumedAt: 600 }] }] };
    expect(projectOpenThreads([record(active), record(paused)], 1000)).toEqual([]);
    expect(projectOpenThreads([record(active), record(paused), record(resumed)], 1000)[0]).toMatchObject({ id: 'a', elapsed: 600, total: 600 });
  });
  it('subtracts repeated pauses and resets the current counter after restart', () => {
    const restarted = { id: 'a', name: 'a', stretches: [
      { startedAt: 100, endedAt: 900, endReason: 'restarted', pauses: [{ pausedAt: 200, resumedAt: 300 }, { pausedAt: 500 }] },
      { startedAt: 900, pauses: [{ pausedAt: 1000, resumedAt: 1200 }, { pausedAt: 1300, resumedAt: 1400 }] },
    ] };
    expect(projectOpenThreads([record(restarted)], 1600)[0]).toMatchObject({ openedAt: 900, elapsed: 400, total: 700 });
  });
  it('keeps undo-completed paused runs hidden until resumed', () => {
    const paused = { id: 'a', name: 'a', stretches: [{ startedAt: 100, pauses: [{ pausedAt: 200 }] }] };
    const completed = { ...paused, stretches: [{ ...paused.stretches[0], endedAt: 500 }] };
    expect(projectOpenThreads([record(completed), record(paused)], 1000)).toEqual([]);
    expect(projectOpenThreads([record(thread('a', 100, 500)), record(thread('a', 100))], 1000)[0].elapsed).toBe(900);
  });
  it.each([
    [{ pausedAt: 50 }], [{ pausedAt: 300, resumedAt: 200 }],
    [{ pausedAt: 200 }, { pausedAt: 400 }],
    [{ pausedAt: 200, resumedAt: 500 }, { pausedAt: 400, resumedAt: 600 }],
    [{ pausedAt: NaN }],
  ])('rejects malformed pause history %j', (...pauses) => {
    expect(() => projectOpenThreads([record({ id: 'a', name: 'a', stretches: [{ startedAt: 100, pauses }] })], 1000)).toThrow();
  });
  it('formats days without wrapping after 24 hours', () => {
    expect(formatElapsed(0)).toBe('<1m');
    expect(formatElapsed(25 * 3600000 + 120000)).toBe('1d 1h 2m');
  });
});
