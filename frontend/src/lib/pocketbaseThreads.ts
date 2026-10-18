import PocketBase, { BaseAuthStore, ClientResponseError } from 'pocketbase';
import type { RevisionRecord } from './openThreads';
import type { RevisionSource } from './openThreadsSync';

export interface ThreadsConfig { url: string; token: string }

export async function createThreadsSource(config: ThreadsConfig, connection: (connected: boolean) => void) {
  const url = new URL(config.url);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Open Threads needs a valid HTTPS PocketBase URL.');
  const pb = new PocketBase(config.url.replace(/\/+$/, ''), new BaseAuthStore());
  pb.authStore.save(config.token);
  if (!pb.authStore.isValid) throw new Error('The Open Threads token is invalid or expired. Replace it and retry.');
  let owner: string;
  try {
    const part = config.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(part));
    if (typeof claims.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(claims.id) || claims.collectionId === '_superusers') throw new Error();
    owner = claims.id;
  } catch { throw new Error('Use the dedicated Open Threads user token.'); }
  const user = await pb.collection('open_threads_users').getOne(owner);
  if (user.id !== owner || user.collectionName !== 'open_threads_users') throw new Error('Use the dedicated Open Threads user token.');
  return connectThreadsSource(pb, owner, connection);
}

export async function createBrowserThreadsSource(connection: (connected: boolean) => void) {
  if (!import.meta.env.DEV) throw new Error('Browser thread preview is available only in development.');
  const response = await fetch('/__open_threads/config', { cache: 'no-store' });
  if (!response.ok) throw new Error('Open Threads browser preview could not connect. Check the dev server runtime token.');
  const config = await response.json();
  if (typeof config.owner !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(config.owner)) throw new Error('Invalid preview account.');
  const pb = new PocketBase(`${window.location.origin}/__open_threads`, new BaseAuthStore());
  return connectThreadsSource(pb, config.owner, connection);
}

function connectThreadsSource(pb: PocketBase, owner: string, connection: (connected: boolean) => void) {
  pb.autoCancellation(false);
  let live = false;
  let disconnected = false;
  let closed = false;
  let change = () => {};
  pb.realtime.onDisconnect = () => { live = false; disconnected = true; connection(false); };
  const source: RevisionSource = {
    subscribe: async callback => {
      change = callback;
      try {
        await pb.realtime.subscribe('PB_CONNECT', () => {
          // The SDK restores collection subscriptions after reconnecting.
          // Wait for a read before claiming that the snapshot is current.
          if (disconnected) { live = true; disconnected = false; change(); }
        });
        await pb.collection('open_threads').subscribe('*', () => change());
        live = true;
      } catch (error) {
        await pb.realtime.unsubscribe();
        throw error;
      }
      return () => { closed = true; void pb.realtime.unsubscribe(); pb.cancelAllRequests(); pb.authStore.clear(); };
    },
    read: async () => {
      const records = await pb.collection('open_threads').getFullList({ sort: '@rowid', filter: pb.filter('owner = {:owner}', { owner }), batch: 500, requestKey: null });
      if (!closed) connection(live);
      return records as unknown as RevisionRecord[];
    },
  };
  return { source, close: () => { closed = true; void pb.realtime.unsubscribe(); pb.cancelAllRequests(); pb.authStore.clear(); } };
}

export function threadsError(error: unknown): string {
  if (error instanceof ClientResponseError) {
    if (error.status === 401 || error.status === 403) return 'PocketBase access was denied. Check the Open Threads token and collection rules, then retry.';
    return 'PocketBase is unavailable. Check your connection, then retry.';
  }
  return error instanceof Error ? error.message : 'Open Threads could not sync. Retry to reconnect.';
}
