# System: Boot Lifecycle

System ID: SYS-BOOT

## Purpose

Own startup, world entry, initialization order, game loop startup, and shutdown
across browser, server, and headless runtimes.

## Primary Files

- `src/main.ts`: browser startup, home page wiring, offline/online entry, shared
  `startGame()` frame loop setup.
- `server/main.ts`: server boot, DB readiness, REST routing, WebSocket auth,
  shutdown handlers.
- `headless/env_server.ts`: RL environment boot over stdio or benchmark mode.
- `vite.config.ts`: Vite entry HTML files and dev proxy config.

## Entry Points

- `wireStartScreens()` in `src/main.ts`
- `startGame(world, offlineSim, online, keybindScope)` in `src/main.ts`
- `main()` in `server/main.ts`
- `serve()` and `bench()` in `headless/env_server.ts`

## Main Responsibilities

- Load localization and browser/home-page UI.
- Gate game entry with loading screen, asset preload, renderer construction, and
  HUD construction.
- Start the browser animation frame loop.
- Start the server tick loop and HTTP/WebSocket listeners.
- Persist state during server shutdown.

## Data Flow

Browser:

```text
index.html -> src/main.ts -> wireStartScreens() -> startGame() -> frame()
```

Server:

```text
node dist-server/server.cjs -> server/main.ts main() -> GameServer.start()
```

## Dependencies

- SYS-GAMESTATE
- SYS-INPUT
- SYS-RENDER
- SYS-UI
- SYS-NETWORK
- SYS-SAVELOAD

## What Depends On This

Every runtime mode depends on boot ordering. Renderer, HUD, asset loading,
network auth, sim ticks, and persistence all assume boot completed in the right
order.

## Change Risk

High. Startup changes can strand the loading screen, break offline entry, reject
online sessions, skip asset preload, or fail to save characters on shutdown.

## Known Unclear Areas

- `src/main.ts` combines homepage, auth, wallet, character selection, and game
  loop responsibilities.
- `server/main.ts` still mentions deprecated standalone MediaWiki redirect
  configuration.

## Verification Steps

- `npm run build`
- Start offline play from the browser.
- Start online play through account and character selection.
- Stop the Compose stack and confirm no shutdown errors in game logs.
- Run `npm run bench` for headless boot if RL changes are involved.

Last verified: 2026-06-23
