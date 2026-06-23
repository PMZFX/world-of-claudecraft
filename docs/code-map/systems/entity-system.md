# System: Entity System

System ID: SYS-ENTITY

## Purpose

Represent players, mobs, NPCs, doors, quest objects, pets, arena objects, and
world objects in a shared form consumed by simulation, networking, rendering,
and UI.

## Primary Files

- `src/sim/types.ts`: `Entity`, `SimEvent`, item and stat types.
- `src/sim/entity.ts`: entity construction helpers.
- `src/sim/sim.ts`: entity lifecycle, spawning, death, respawn, interaction.
- `server/game.ts`: `wireEntity()` and interest-managed snapshot data.
- `src/net/online.ts`: snapshot to client entity mirror.
- `src/render/renderer.ts`: entity views.

## Entry Points

- `new Sim(cfg)` initial entity population
- `Sim.tick()` entity updates
- `wireEntity(e)` in `server/game.ts`
- `ClientWorld` snapshot handling in `src/net/online.ts`
- `Renderer.sync(...)`

## Data Flow

```text
Sim Entity
-> server/game.ts wireEntity
-> ClientWorld mirrored Entity
-> Renderer EntityView and HUD reads
```

## Dependencies

- Content tables in `src/sim/content/*`
- Spatial helpers in `src/sim/spatial.ts`
- Render-specific view creation in `src/render/renderer.ts`

## What Depends On This

Combat, quests, loot, player movement, rendering, targeting, UI tooltips,
snapshot interest management, and persistence.

## Change Risk

High. Entity shape changes can break snapshots, rendering, HUD, save state, and
tests.

## Known Unclear Areas

- There is no separate ECS framework. Entity behavior is mostly centralized in
  `src/sim/sim.ts` and specialized render view code.

## Verification Steps

- Run entity and architecture tests.
- Enter online world and verify players, NPCs, mobs, objects, and corpses render.
- Kill a mob and verify corpse, lootability, and respawn behavior.

Last verified: 2026-06-23
