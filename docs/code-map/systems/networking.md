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

## Verification Steps

- Register/login and enter online world.
- Open two browser sessions and confirm presence and movement.
- Exercise chat and at least one interact/loot/combat command.
- Watch server logs for protocol errors.

Last verified: 2026-06-23
