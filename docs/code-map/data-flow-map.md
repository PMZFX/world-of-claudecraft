# Data Flow Map

## Offline Gameplay

```text
Player input
-> src/game/input.ts
-> src/main.ts frame loop
-> Sim.moveInput and Sim action methods
-> Sim.tick()
-> SimEvent[]
-> Hud.handleEvents()
-> Renderer.sync()
-> Hud.update()
```

Offline mode has no database persistence. The browser-local `Sim` is the source
of truth.

## Online Gameplay

```text
Player input
-> src/game/input.ts
-> ClientWorld.flushInput()
-> WebSocket /ws
-> server/main.ts authenticateWebSocket()
-> accountForToken(), loadAccountSessionState(), getCharacter()
-> GameServer.handleMessage()
-> authoritative Sim
-> GameServer broadcast snapshots/events
-> ClientWorld snapshot mirror
-> Renderer.sync()
-> Hud.update()
```

Online mode makes the server authoritative. Client actions are commands and
movement intent. Combat rolls, loot, quest credit, vendor actions, party state,
and character persistence resolve server-side.

## Persistent Character Data

```text
Sim CharacterState
-> Sim.serializeCharacter()
-> GameServer autosave/logout/shutdown
-> server/db.ts saveCharacterState()
-> Postgres characters.state JSONB
-> server/main.ts getCharacter()
-> GameServer.join()
-> Sim.addPlayer(...state...)
```

Important risk: `CharacterState` in `src/sim/sim.ts` is backward-compatible by
using optional fields and defaults for older saves. Changes here can break live
characters.

## Static and Generated Content

```text
src/sim/content/*
-> src/sim/data.ts
-> Sim construction and gameplay rules
-> scripts/wiki/build_content.mjs
-> src/guide/content.generated.ts
-> guide.html SPA
```

## Asset Loading

```text
public/*
-> src/render/assets/loader.ts
-> render modules registerPreload()
-> src/render/assets/preload.ts assetsReady()
-> src/main.ts startGame()
-> Renderer constructor and prewarmInitialScene()
```

Last verified: 2026-06-23
