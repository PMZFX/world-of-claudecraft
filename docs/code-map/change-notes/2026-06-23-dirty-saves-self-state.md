# Change Note: Dirty Saves and Self-State Signatures

Date: 2026-06-23

## Summary

Added server-side dirty tracking for autosave and stable self-field signatures
for snapshots. This reduces repeated character serialization for clean sessions
and repeated JSON rebuilds for stable player self-state buckets.

## Files Changed

- `server/game.ts`: tracks `ClientSession.saveDirty`, stable self-field dirty
  bits, stable self-field signatures, autosave clean skips, serialization timing,
  and stable self JSON build/skip counters.
- `src/sim/sim.ts`: exposes `isRestingForPersistence()` so the server can mark
  resting sessions dirty without duplicating inn geometry.
- `src/admin/types.ts`: mirrors the expanded server stats payload.
- `tests/game_sessions.test.ts`: covers clean autosave serialization skips and
  dirty retry behavior after failed saves.
- `tests/snapshots.test.ts`: verifies stable self-field JSON skip counters while
  preserving delta snapshot behavior.
- `docs/design/2026-06-23-server-performance-baseline.md`: records both
  completed follow-up items.
- `docs/code-map/systems/save-load.md` and
  `docs/code-map/systems/networking.md`: document the new persistence and
  snapshot behavior.

## Notes

- Autosave can skip `Sim.serializeCharacter()` only for clean sessions. Direct
  saves, logout saves, and shutdown saves still serialize conservatively.
- Dirty state is intentionally conservative. Commands or events that may affect
  persisted state mark the session dirty even when a specific command later
  no-ops.
- Stable self-field signatures catch direct sim mutations used in tests while
  avoiding full JSON rebuilds for unchanged buckets.

## Verification

- `npx vitest run tests/game_sessions.test.ts tests/snapshots.test.ts tests/admin.test.ts`
- `npx tsc --noEmit`
