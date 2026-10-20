import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
vi.mock('../src/hooks/useOpenThreads', () => ({ useOpenThreads: vi.fn() }));
import { OpenThreadsPanel } from '../src/components/widgets/OpenThreadsWidget';
const base = { threads: [], status: 'Live', error: null, loaded: true, retry: vi.fn() };
it('distinguishes a successful empty result from loading', () => {
  expect(renderToStaticMarkup(<OpenThreadsPanel {...base} />)).toContain('No open threads');
  expect(renderToStaticMarkup(<OpenThreadsPanel {...base} loaded={false} />)).toContain('Loading your open threads');
});
it('labels retained snapshots when a sync fails', () => {
  const html = renderToStaticMarkup(<OpenThreadsPanel {...base} error="Connection lost" />);
  expect(html).toContain('Showing last sync');
  expect(html).toContain('role="alert"');
  expect(html).toContain('Reconnect Open Threads');
  expect(html).toContain('threads-connection-dot');
});
it('combines count and reconnect without a visible heading or healthy indicator', () => {
  const html = renderToStaticMarkup(<OpenThreadsPanel {...base} />);
  expect(html).toContain('Reconnect Open Threads, 0 open threads');
  expect(html).not.toContain('<h2');
  expect(html).not.toContain('threads-connection-dot');
  expect(html).toContain('class="sr-only" role="status"');
});
it('marks a disconnected subscription even before a fetch error arrives', () => {
  const html = renderToStaticMarkup(<OpenThreadsPanel {...base} status="Reconnecting" />);
  expect(html).toContain('threads-connection-dot');
  expect(html).toContain('connection failed');
});
it('escapes names and gives every thread a compact scrollable entry', () => {
  const threads = Array.from({ length: 30 }, (_, i) => ({ id: String(i), name: '<script>name</script>', stretches: [{ startedAt: 0, endedAt: 60000 }, { startedAt: 120000 }], openedAt: 120000, elapsed: 60000, total: 120000 }));
  const html = renderToStaticMarkup(<OpenThreadsPanel {...base} threads={threads} />);
  expect(html.match(/<li /g)).toHaveLength(30);
  expect(html).toContain('&lt;script&gt;name&lt;/script&gt;');
  expect(html).toContain('1m');
  expect(html).not.toContain('stretches</p>');
  expect(html).toContain('recently opened first');
  expect(html.indexOf('<h3')).toBeLessThan(html.indexOf('Since '));
  expect(html.indexOf('</h3>')).toBeLessThan(html.indexOf('1m'));
  expect(html).toContain('thread-row');
  expect(html).toContain('overflow-y-auto');
});
