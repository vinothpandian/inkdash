import { afterEach, expect, it, vi } from 'vitest';
import { createThreadsSource } from '../src/lib/pocketbaseThreads';
const token = (claims: object) => `e30.${btoa(JSON.stringify(claims))}.signature`;
afterEach(() => vi.unstubAllGlobals());
it('rejects expired tokens and unsafe URLs before making a request', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  await expect(createThreadsSource({ url: 'https://db.vinoth.app', token: token({ id: 'owner', exp: 1 }) }, vi.fn())).rejects.toThrow('expired');
  await expect(createThreadsSource({ url: 'http://db.vinoth.app', token: '' }, vi.fn())).rejects.toThrow('HTTPS');
  expect(fetcher).not.toHaveBeenCalled();
});
it('verifies the dedicated user and reads revisions in insertion order with owner filtering', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ id: 'owner', collectionName: 'open_threads_users' })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ items: [], totalPages: 1 })));
  vi.stubGlobal('fetch', fetcher);
  const secret = token({ id: 'owner', exp: Date.now() / 1000 + 3600 });
  const client = await createThreadsSource({ url: 'https://db.vinoth.app', token: secret }, vi.fn());
  expect(await client.source.read()).toEqual([]);
  const url = new URL(fetcher.mock.calls[1][0]);
  expect(url.searchParams.get('sort')).toBe('@rowid');
  expect(url.searchParams.get('filter')).toContain('owner = "owner"');
  expect(fetcher.mock.calls[0][1].headers.Authorization).toBe(secret);
  client.close();
});
it('does not accept a token for another collection', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'owner', collectionName: 'users' }))));
  await expect(createThreadsSource({ url: 'https://db.vinoth.app', token: token({ id: 'owner', exp: Date.now() / 1000 + 3600 }) }, vi.fn())).rejects.toThrow('dedicated');
});
