# Entrypoints

## Browser Client

Primary entry files:

- `index.html` loads the main browser application.
- `src/main.ts` is the main browser module.
- `vite.config.ts` declares Vite build inputs for `index.html`, `admin.html`,
  `play.html`, and `guide.html`.

Important symbols:

- `wireStartScreens()` in `src/main.ts`
- `prepareWorldEntry()` in `src/main.ts`
- `startGame(world, offlineSim, online, keybindScope)` in `src/main.ts`
- `requestAnimationFrame(frame)` loop inside `startGame()`

Offline path:

1. `wireStartScreens()` wires the home and play UI.
2. Offline class selection calls `startOffline(...)`.
3. `startOffline(...)` creates a browser-local `Sim`.
4. `startGame(...)` mounts the game UI, creates `Renderer`, `Hud`, `Input`, and
   starts the animation frame loop.
5. The frame loop advances `offlineSim.tick()` at `DT` and then calls
   `renderer.sync(...)` and `hud.update()`.

Online path:

1. `wireStartScreens()` routes online play through auth, realm, and character UI.
2. Character entry creates `ClientWorld` from `src/net/online.ts`.
3. `ClientWorld` opens `/ws` and sends the auth frame.
4. `startGame(...)` mounts the same renderer and HUD over the `ClientWorld`
   mirror.
5. The frame loop sends movement input with `ClientWorld.flushInput()`, drains
   server events, and renders interpolated snapshots.

## Multiplayer Server

Primary entry files:

- `server/main.ts`
- `server/game.ts`

Important symbols:

- `main()` in `server/main.ts`
- `handleApi(req, res)` in `server/main.ts`
- `authenticateWebSocket(ws, raw, req)` in `server/main.ts`
- `GameServer` in `server/game.ts`
- `GameServer.start()`, `GameServer.join()`, `GameServer.handleMessage()`,
  `GameServer.leave()`

Server startup flow:

1. `main()` waits for Postgres through `pool.query('SELECT 1')`.
2. `ensureSchema()` creates or migrates database tables.
3. Cleanup and warm-up jobs run: orphan sessions, chat logs, perf reports,
   market, chat filter, blocked IPs, and leaderboard caches.
4. `http.createServer(...)` routes `/api/*`, `/admin/api/*`, `/internal/*`,
   player cards under `/p/`, and static files.
5. `WebSocketServer` accepts only `/ws`.
6. First WebSocket message must be `{t:"auth", token, character, clientSeed}`.
7. `GameServer.join()` attaches the authenticated character to the shared
   authoritative `Sim`.
8. `game.start()` begins the server tick loop.
9. SIGINT and SIGTERM trigger character, market, session, chat log, and DB
   shutdown cleanup.

## Headless RL Environment

Primary entry files:

- `headless/env_server.ts`
- `headless/protocol.ts`
- `python/example_random_agent.py`

Important symbols:

- `Env` in `headless/env_server.ts`
- `serve()` in `headless/env_server.ts`
- `bench()` in `headless/env_server.ts`
- `validateAction(value)` in `headless/protocol.ts`

Headless flow:

1. `npm run build:env` bundles `headless/env_server.ts`.
2. `npm run env` runs NDJSON over stdio.
3. Reset creates a `Sim` with a configured class and seed.
4. Step validates an action, advances the real sim, and returns observation,
   reward, and episode state.

## Admin and Guide Entrypoints

- `admin.html` with `src/admin/main.ts` for the admin dashboard.
- `guide.html` with `src/guide/main.ts` for the in-app guide/wiki SPA.

## Unresolved Questions

- `server/main.ts` still defines `WIKI_URL`, but comments say the standalone
  MediaWiki redirect is deprecated in favor of the in-app guide.
- `src/main.ts` is very large and owns startup, home page, online auth, wallet,
  settings, and the gameplay frame loop. Future maps should break this into more
  focused feature traces.

Last verified: 2026-06-23
