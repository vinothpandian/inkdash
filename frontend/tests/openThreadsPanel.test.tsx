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
});
it('escapes names, renders reopened totals, and gives every thread a scrollable entry', () => {
  const threads = Array.from({ length: 30 }, (_, i) => ({ id: String(i), name: '<script>name</script>', stretches: [{ startedAt: 0, endedAt: 60000 }, { startedAt: 120000 }], openedAt: 120000, elapsed: 60000, total: 120000 }));
  const html = renderToStaticMarkup(<OpenThreadsPanel {...base} threads={threads} />);
  expect(html.match(/<li /g)).toHaveLength(30);
  expect(html).toContain('&lt;script&gt;name&lt;/script&gt;');
  expect(html).toContain('2m');
  expect(html).toContain('sm:grid-cols-3');
  expect(html).toContain('overflow-y-auto');
});
