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
```

```text
Admin status request
-> server/admin.ts
-> GameServer.adminStats()
-> tick, snapshot, wire message, wire byte, save, memory, and entity counters
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
- Snapshot volume and CPU are now visible through additive admin stats, but
  command-dispatch timing is not split by command category yet.
- `arenaInfoFor()` still runs from the self-snapshot path and should be reviewed
  before scaling online arena/leaderboard traffic.

## Verification Steps

- Register/login and enter online world.
- Open two browser sessions and confirm presence and movement.
- Exercise chat and at least one interact/loot/combat command.
- Watch server logs for protocol errors.
- Check admin stats for `snapshotMsAvg`, `messagesIn`, `messagesOut`,
  `wireBytesIn`, `wireBytesOut`, `characterSaveWrites`, and
  `characterSaveSkips` when doing server performance work.

Last verified: 2026-06-23
