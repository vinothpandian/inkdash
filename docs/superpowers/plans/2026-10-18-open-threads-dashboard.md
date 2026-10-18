# Open Threads dashboard implementation plan

Goal: replace the homepage timeline with a read-only, realtime, three-column list of open threads.

Architecture: a native bridge provides runtime PocketBase credentials from the existing OPEN_THREADS_POCKETBASE_URL and OPEN_THREADS_POCKETBASE_TOKEN environment variables. A memory-only PocketBase client subscribes before loading ordered revisions, reconstructs the latest thread state, and refreshes after events and reconnects. No credentials go into Vite variables or browser storage.

Design: preserve the calendar, clock, weather and matte visual style. Use three columns at dashboard width, one on narrow screens. Oldest current stretches appear first. Each item shows its name, current elapsed wall time, opening timestamp and cumulative time. The panel scrolls to keep every thread reachable. Loading, empty, missing configuration, stale data and reconnect states are explicit.

- [x] Test revision replay, close/reopen behavior, ordering, malformed data, durations and realtime lifecycle.
- [x] Implement validated revision projection and a read-only PocketBase subscription service with reconnect reconciliation and cleanup.
- [x] Add a narrowly allowed native runtime configuration command without logging secrets.
- [x] Replace the timeline with a responsive Open Threads panel and minute-based elapsed updates.
- [x] Run frontend tests/build/lint and Zig tests. Verify live connectivity if runtime credentials are available. Document setup and verification limits.

Review focus: concurrent events during initial/paginated reads; missed changes during disconnect; teardown during async setup; invalid payloads; expired or privileged tokens; overflow with many threads.

## Verification

Implemented all five tasks. `npm test --prefix frontend`: 19 tests passed. `npm run build --prefix frontend`: passed. Standalone `zig test src/open_threads_config.zig` with a writable global cache: one test passed. Mechanical UI detector: no findings. Populated panel inspected in the browser with 12 illustrative threads and a long wrapping name; preview fixture removed afterward.

Read-only live check using the existing launchctl token verified the dedicated user and SDK realtime subscription: 11 revisions reconstruct into 6 open threads. No test records were written. A sandboxed shell initially hid the launchctl token; an approved unrestricted read confirmed it exists.

Full `zig build test` is blocked by existing Zig 0.16 build APIs (`Build.sysroot`) incompatible with installed Zig 0.17. `npm run lint` is blocked by the repository's absent ESLint configuration. Neither result is a passing native app integration check.

Final independent review found a REST fallback gap when initial SSE fails. Added a regression test, confirmed it failed, then made periodic reads independent of subscription success. All 19 tests pass after the fix.
