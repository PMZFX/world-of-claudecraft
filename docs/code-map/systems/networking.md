# System: Networking

System ID: SYS-NETWORK

## Purpose

Connect browser clients to the authoritative online world through REST and
WebSocket APIs.

## Primary Files

- `src/net/online.ts`: REST helper and `ClientWorld` WebSocket mirror.
- `server/main.ts`: REST routing, WebSocket upgrade, auth handshake.
- `server/game.ts`: session management, command handling, snapshots, events.
- `server/ws_buffer.ts`: pre-auth message buffering.
- `server/ratelimit.ts`, `server/web_login_guard.ts`, `server/turnstile.ts`:
  abuse and login controls.

## Entry Points

- `new Api(base)`
- `new ClientWorld(token, characterId, cls, base, clientSeed)`
- `ClientWorld.flushInput()`
- `handleApi(req, res)`
- `authenticateWebSocket(ws, raw, req)`
- `GameServer.handleMessage(session, raw)`
- `GameServer.adminStats()`

## Data Flow

```text
Client REST request -> server/main.ts -> server/db.ts or handler module
```

```text
ClientWorld WebSocket command
-> GameServer.handleMessage()
-> Sim mutation/tick state
-> GameServer snapshot/event broadcast
-> ClientWorld mirror
```

```text
GameServer.selfWireJson()
-> always serializes core self movement/resource/combat fields
-> sends heavier self fields only when their JSON differs
-> skips already-sent empty/null heavy fields before allocation/stringify
-> skips stable self-field JSON rebuilds while field signatures and dirty bits
   are unchanged
-> snapshot frames are skipped before delta-state mutation when ws.bufferedAmount
   is above WS_BACKPRESSURE_SKIP_BYTES
```

```text
Admin status request
-> server/admin.ts
-> GameServer.adminStats()
-> tick, snapshot, command timing, backpressure, wire message, wire byte, save,
   memory, and entity counters
```

## Dependencies

- `ws`
- Browser `WebSocket`
- Auth tokens from `server/db.ts`
- `IWorld` interface for rendering/HUD

## What Depends On This

- Online play
- Accounts and character selection
- Chat, parties, guilds, arena, trading, moderation
- Admin live views and internal operational endpoints

## Change Risk

High. Protocol drift can desync clients, cause rubber-banding, drop commands,
break auth, or expose moderation/security regressions.

## Known Unclear Areas

- The wire protocol is implemented directly in `ClientWorld` and `GameServer`;
  there is no single schema file for every message type.
- Snapshot volume, wire volume, saves, and synchronous command-dispatch timing
  are visible through additive admin stats. Command timings are broad buckets
  and do not include async work that a command launches after returning.
- Stable self-field JSON work is visible through `selfStableJsonBuilds` and
  `selfStableJsonSkips`. Stable fields currently include inventory, buyback,
  equipment, cosmetics, quests, milestones, stats, weapon, and talents.
- Arena self-state uses `Sim.arenaInfoFor()` caching keyed by sim tick and
  arena-state version. Queue/match/result/augment changes invalidate within the
  same tick; normal tick changes refresh naturally.
- Slow WebSocket clients skip snapshot frames above `WS_BACKPRESSURE_SKIP_BYTES`
  and are disconnected above `WS_BACKPRESSURE_CRITICAL_BYTES`. This protects the
  server queue but can make a slow client visually stale until its buffer drains.

## Verification Steps

- Register/login and enter online world.
- Open two browser sessions and confirm presence and movement.
- Exercise chat and at least one interact/loot/combat command.
- Queue for arena if changing arena snapshot behavior.
- Watch server logs for protocol errors.
- Check admin stats for `snapshotMsAvg`, `commandTimings`, `messagesIn`,
  `messagesOut`, `wireBytesIn`, `wireBytesOut`, `characterSaveWrites`, and
  `characterSaveSkips`, plus `backpressureSkippedSnapshots` and
  `backpressureDisconnects`, `selfStableJsonBuilds`, and
  `selfStableJsonSkips`, when doing server performance work.

Last verified: 2026-06-23
