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
  it('formats days without wrapping after 24 hours', () => {
    expect(formatElapsed(0)).toBe('<1m');
    expect(formatElapsed(25 * 3600000 + 120000)).toBe('1d 1h 2m');
  });
});
