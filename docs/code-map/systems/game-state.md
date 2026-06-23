# System: Game State

System ID: SYS-GAMESTATE

## Purpose

Represent and mutate the world state for offline play, online authoritative play,
rendering, HUD, and headless RL.

## Primary Files

- `src/sim/sim.ts`: canonical deterministic simulation.
- `src/sim/types.ts`: entities, events, items, stats, abilities, and shared
  types.
- `src/world_api.ts`: client-facing `IWorld` interface.
- `src/net/online.ts`: `ClientWorld` online mirror of server snapshots.
- `server/game.ts`: authoritative online wrapper around `Sim`.
- `headless/env_server.ts`: headless wrapper around `Sim`.

## Entry Points

- `new Sim(cfg)`
- `Sim.tick()`
- `Sim.serializeCharacter(pid)`
- `new ClientWorld(...)`
- `new GameServer()`

## Data Flow

Offline:

```text
Input -> Sim -> IWorld -> Renderer/HUD
```

Online:

```text
Input -> ClientWorld command -> GameServer -> Sim -> snapshot -> ClientWorld
```

Headless:

```text
NDJSON action -> Env -> Sim.tick() -> observation/reward
```

## Dependencies

- Content tables in `src/sim/content/*`
- Terrain and path helpers in `src/sim/world.ts`, `pathfind.ts`, `colliders.ts`
- Persistence through `server/db.ts` in online mode

## What Depends On This

- Combat, inventory, quests, dungeons, arena, rendering, UI, networking,
  persistence, and tests.

## Change Risk

High. Simulation changes can affect offline, online, tests, persistence,
localization events, and RL behavior at once.

## Known Unclear Areas

- `src/sim/sim.ts` is very large. Dedicated deeper maps should split combat,
  quests, inventory, dungeons, arena, pets, and social-adjacent hooks.

## Verification Steps

- Run `npm test`.
- Run `npm run build`.
- Test offline and online gameplay.
- For deterministic changes, add or update focused Vitest coverage.

Last verified: 2026-06-23
