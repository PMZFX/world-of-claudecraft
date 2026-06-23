# Change Note: Server Performance Baseline

Date: 2026-06-23

## Summary

- Added a lightweight character roster DB query so `/api/characters` avoids
  loading full saved character state for character select.
- Added a realm-scoped account character index for roster/cap checks.
- Added configurable Postgres pool sizing via `PG_POOL_MAX` and
  `PG_CONNECTION_TIMEOUT_MS`.
- Added server admin counters for snapshot time, snapshot recipients, inbound
  and outbound message counts, approximate wire bytes, character save writes,
  and character save skips.
- Added conservative dirty-save avoidance so unchanged serialized character
  state skips the `UPDATE characters` write.
- Added `docs/design/2026-06-23-server-performance-baseline.md` with ranked
  follow-up work for dirty saves, self-state wire versioning, auth query
  consolidation, command timing, and WebSocket backpressure.

## Affected Docs

- `docs/code-map/systems/save-load.md`
- `docs/code-map/systems/networking.md`

## Verification

- Run focused DB and admin tests.
- Run TypeScript/build checks before committing.
