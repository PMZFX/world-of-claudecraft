# Design: Server Performance Baseline

## Goal

Prepare the fork for server-side performance work without changing gameplay
behavior. This pass focuses on faster player loading, better operational
visibility, and a short list of high-value follow-up work.

## Current Hot Paths

- Startup: `server/main.ts` calls `ensureSchema()`, loads the world market, warms
  leaderboard/release caches, then starts `GameServer`.
- WebSocket join: `authenticateWebSocket()` validates token/moderation state,
  loads the full character row with `getCharacter()`, loads mute/admin/cosmetic
  account state, then calls `GameServer.join()`.
- Character roster: `/api/characters` now uses `listCharacterSummaries()` so
  character select does not load full JSONB state just to show id/name/class/
  level/skin/rename/online status.
- Tick/action loop: `GameServer.start()` processes input, `Sim.tick()`,
  server-side events, antibot, snapshots, social positions, and autosave.
- Snapshot loop: `broadcastSnapshots()` performs per-session interest queries,
  uses per-entity wire caches, then sends player-specific `self` deltas.
- Persistence: autosave serializes every online character every 30 seconds with
  concurrency `SAVE_CONCURRENCY = 4`.

## Changes In This Pass

- Added `listCharacterSummaries()` in `server/db.ts` for the character roster.
  It returns skin via a JSONB expression but does not select the full `state`.
- Added `characters_account_realm_id` to support account+realm roster and cap
  checks.
- Added `PG_POOL_MAX` and `PG_CONNECTION_TIMEOUT_MS` environment knobs for
  server pool sizing.
- Added additive admin stats from `GameServer.adminStats()`:
  `snapshotMsAvg`, `snapshotRecipientsAvg`, `messagesIn`, `messagesOut`,
  `wireBytesIn`, `wireBytesOut`, `characterSaveWrites`, and
  `characterSaveSkips`.
- Added conservative dirty-save avoidance: `GameServer.saveCharacter()` compares
  serialized character state against the last successfully persisted JSON and
  skips the DB write when unchanged.
- Added `selfWireJson()` fast paths for already-sent empty/null fields. Repeated
  snapshots now avoid allocating and stringifying empty inventory/buyback,
  equipment, quest arrays, milestones, cooldowns, party/marker/trade/duel, and
  market absence.
- Added `Sim.arenaLadder()` caching with invalidation on player join/leave and
  arena result updates. `arenaInfoFor()` still calls it from snapshots, but the
  live 1v1/2v2 ladders are now built once per invalidation instead of once per
  player snapshot.

## Ranked Follow-Up Work

1. Add mutation-level dirty flags so autosave can avoid serializing characters
   whose persisted state cannot have changed since the last successful save.
2. Version player self-state buckets in the sim so `selfWireJson()` does not
   repeatedly stringify stable inventory, gear, quests, stats, cooldowns,
   party, marks, trade, duel, arena, market, and talents every snapshot.
3. Split or cache the rest of `arenaInfoFor()` output. Ladder construction is
   cached, but per-player arena self-state still serializes from snapshots.
4. Combine WebSocket auth account reads where possible. Current join performs
   several account lookups before the player reaches the world.
5. Add lightweight timing around command dispatch categories. This will show
   whether action processing is dominated by chat/social DB work, sim commands,
   JSON parsing, or antibot checks.
6. Consider backpressure policy for slow WebSocket clients using
   `ws.bufferedAmount` so one stuck client cannot build unbounded pending output.
7. Split full character state into smaller persistence domains only if dirty
   tracking and self-state versioning are not enough. This is higher risk
   because inventory, gear, quests, talents, stats, and position currently share
   one JSONB document.

## Verification

- DB tests should cover the new roster query and realm-scoped indexes.
- Admin stats should remain additive so existing admin clients continue to work.
- Manual performance runs should compare admin `snapshotMsAvg`, wire byte
  counters, and online player count before and after protocol/tick changes.

Last verified: 2026-06-23
