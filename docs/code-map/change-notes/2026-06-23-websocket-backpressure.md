# Change Note: WebSocket Backpressure

Date: 2026-06-23

## Summary

Added outbound WebSocket backpressure protection so slow clients do not build
unbounded server-side send queues during snapshot broadcasts.

## Files Changed

- `server/game.ts`: checks `ws.bufferedAmount` before building snapshot payloads,
  skips low-priority snapshots above `WS_BACKPRESSURE_SKIP_BYTES`, closes
  critically queued sockets above `WS_BACKPRESSURE_CRITICAL_BYTES`, and exposes
  admin counters.
- `src/admin/types.ts`: mirrors the expanded server stats payload.
- `tests/snapshots.test.ts`: covers skipped snapshot behavior and critical
  backpressure disconnects.
- `.env.example`: documents the new backpressure thresholds.
- `docs/design/2026-06-23-server-performance-baseline.md`: marks the
  backpressure follow-up complete.
- `docs/code-map/systems/networking.md`: documents the new network behavior and
  verification counters.

## Notes

- Snapshot skipping happens before `lastSent` and `sentEnts` are mutated, so the
  next successful snapshot can still send the correct delta/full state.
- Non-snapshot messages are still allowed while the socket is only above the
  skip threshold. At the critical threshold, no more output is queued and the
  session is closed with WebSocket code 1013.

## Verification

- `npx vitest run tests/snapshots.test.ts tests/admin.test.ts`
- `npx tsc --noEmit`
