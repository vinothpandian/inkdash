import { expect, it, vi } from 'vitest';
import { watchRevisions } from '../src/lib/openThreadsSync';

it('subscribes before loading and coalesces events received during reads', async () => {
  let changed = () => {};
  let release = (_: unknown[]) => {};
  const unsubscribe = vi.fn();
  const read = vi.fn().mockImplementationOnce(() => new Promise(resolve => { release = resolve; })).mockResolvedValue([]);
  const subscribe = vi.fn(async (callback: () => void) => { changed = callback; return unsubscribe; });
  const stop = watchRevisions({ subscribe, read }, vi.fn(), vi.fn());
  await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(1));
  changed(); changed(); release([]);
  await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  expect(subscribe.mock.invocationCallOrder[0]).toBeLessThan(read.mock.invocationCallOrder[0]);
  stop(); expect(unsubscribe).toHaveBeenCalledOnce();
});

it('cleans up a subscription that resolves after unmount', async () => {
  let release = (_: () => void) => {};
  const unsubscribe = vi.fn();
  const read = vi.fn();
  const stop = watchRevisions({ read, subscribe: () => new Promise(resolve => { release = resolve; }) }, vi.fn(), vi.fn());
  stop(); release(unsubscribe);
  await vi.waitFor(() => expect(unsubscribe).toHaveBeenCalledOnce());
  expect(read).not.toHaveBeenCalled();
});

it('retries a failed subscription and keeps the previous snapshot on read failure', async () => {
  vi.useFakeTimers();
  const subscribe = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(vi.fn());
  const read = vi.fn().mockResolvedValueOnce([]).mockRejectedValue(new Error('offline'));
  const received = vi.fn(); const failed = vi.fn();
  const stop = watchRevisions({ subscribe, read }, received, failed);
  await vi.advanceTimersByTimeAsync(30000);
  expect(subscribe).toHaveBeenCalledTimes(2);
  expect(received).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(30000);
  expect(failed.mock.calls.length).toBeGreaterThanOrEqual(2);
  expect(received).toHaveBeenCalledTimes(1);
  stop(); vi.useRealTimers();
});

it('shows a REST snapshot even when SSE cannot connect', async () => {
  vi.useFakeTimers();
  const read = vi.fn().mockResolvedValue([]);
  const stop = watchRevisions({ read, subscribe: vi.fn().mockRejectedValue(new Error('SSE blocked')) }, vi.fn(), vi.fn());
  await vi.advanceTimersByTimeAsync(30000);
  expect(read).toHaveBeenCalled();
  stop(); vi.useRealTimers();
});
