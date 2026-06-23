# Change Note: Arena Info Cache

Date: 2026-06-23

## Summary

Added per-player arena info caching so snapshot generation does not rebuild
arena self-state repeatedly within the same sim tick.

## Files Changed

- `src/sim/sim.ts`: caches `arenaInfoFor(pid)` by player, sim tick, and
  arena-state version. Queue, match, result, return, and augment state changes
  invalidate the cache immediately.
- `tests/arena.test.ts`: covers same-tick cache hits, same-tick queue
  invalidation, and tick-based refresh.
- `docs/design/2026-06-23-server-performance-baseline.md`: marks arena info
  caching complete.
- `docs/code-map/systems/networking.md`: documents arena self-state caching in
  the snapshot path.

## Notes

- `arenaLadder()` remains separately cached by format.
- `arenaInfoFor()` still refreshes on every sim tick, so countdown timers,
  Fiesta ring state, respawn timers, and power-ups remain current.

## Verification

- `npx vitest run tests/arena.test.ts tests/arena_online.test.ts tests/snapshots.test.ts`
- `npx tsc --noEmit`
