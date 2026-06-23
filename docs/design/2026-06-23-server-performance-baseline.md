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
- Added command timing buckets to `GameServer.adminStats()`. The buckets track
  JSON parse failures, protocol/input handling, and broad command categories
  such as combat, inventory, quests, chat, social, arena, talents, market, and
  dungeon commands. The timing covers JSON parse plus synchronous dispatch; it
  does not include async work that a command starts after returning.
- Added WebSocket outbound backpressure protection. `broadcastSnapshots()` skips
  low-priority snapshot frames for clients over `WS_BACKPRESSURE_SKIP_BYTES`
  before mutating their delta state, and `sendRaw()` closes critically queued
  sockets at `WS_BACKPRESSURE_CRITICAL_BYTES`. Admin stats expose skipped
  snapshot and disconnect counters.
- Added server-owned character dirty tracking for autosave. Clean loaded
  sessions skip `Sim.serializeCharacter()` during autosave, while direct saves,
  logout saves, and shutdown saves still serialize conservatively. Dirty state
  is marked from valid movement, mutating commands, sim events, passive
  regen/rest states, and live account-cosmetic updates.
- Added stable self-field signatures for player snapshots. Stable buckets such
  as inventory, buyback, equipment, cosmetics, quests, milestones, stats,
  weapon, and talents skip JSON rebuilds while their signatures and dirty bits
  are unchanged. Volatile buckets such as cooldowns, party, trade, duel, arena,
  and market continue to be evaluated normally.
- Added per-player `arenaInfoFor()` caching keyed by sim tick and arena-state
  version. This avoids rebuilding arena standings, queue state, match rosters,
  Fiesta details, and ladder references repeatedly within the same tick while
  preserving same-tick invalidation for queue, match, result, and augment
  changes.

## Ranked Follow-Up Work

1. Combine WebSocket auth account reads where possible. Current join performs
   several account lookups before the player reaches the world.
2. Split full character state into smaller persistence domains only if dirty
   tracking and self-state versioning are not enough. This is higher risk
   because inventory, gear, quests, talents, stats, and position currently share
   one JSONB document.

## Verification

- DB tests should cover the new roster query and realm-scoped indexes.
- Admin stats should remain additive so existing admin clients continue to work.
- Manual performance runs should compare admin `snapshotMsAvg`, command timing
  buckets, backpressure counters, `characterSaveCleanSkips`,
  `characterSaveSerializeMsAvg`, `selfStableJsonBuilds`,
  `selfStableJsonSkips`, wire byte counters, and online player count before and
  after protocol/tick changes.

Last verified: 2026-06-23
