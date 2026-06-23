# System: World Map

System ID: SYS-WORLDMAP

## Purpose

Define zones, terrain, roads, dungeons, NPCs, props, quest objects, mob spawns,
colliders, fishing, weather biomes, and map/minimap presentation.

## Primary Files

- `src/sim/world.ts`: deterministic terrain and biome helpers.
- `src/sim/data.ts`: assembled world content.
- `src/sim/content/zone1.ts`, `zone2.ts`, `zone3.ts`: zone content.
- `src/sim/content/dungeons.ts`, `temple.ts`: dungeon and temple content.
- `src/sim/colliders.ts`, `pathfind.ts`, `spatial.ts`: navigation and spatial
  logic.
- `src/render/terrain.ts`, `props.ts`, `foliage.ts`, `dungeon.ts`,
  `weather.ts`, `sky.ts`, `water.ts`: visual world.
- `src/ui/map_terrain.ts`, `minimap_zoom.ts`, `coords.ts`, `compass.ts`:
  map-related UI.

## Entry Points

- `groundHeight(...)`, `terrainHeight(...)`, `zoneBiomeAt(...)`
- `generateDecorations(seed)`
- `new Sim(cfg)` world population
- `Renderer` terrain and prop construction

## Data Flow

```text
Zone/content tables and terrain helpers
-> Sim entity placement and collision/pathing
-> Renderer terrain/props/weather
-> HUD minimap and coordinates
```

## Dependencies

- SYS-ENTITY
- SYS-RENDER
- SYS-QUESTS through quest object/NPC placement
- SYS-ENEMYAI through mob spawn data

## What Depends On This

Movement, aggro, quest routing, dungeons, visual landmarks, weather, minimap,
and performance.

## Change Risk

Medium to high. Terrain and collider changes can strand NPCs, break pathing,
or desync sim and render if not kept deterministic.

## Known Unclear Areas

- The exact source of every prop and quest object is split across content files
  and renderer modules.

## Verification Steps

- Start in Eastbrook Vale and travel across zone boundaries.
- Interact with relevant NPCs and quest objects.
- Check minimap and coordinates.
- Verify visual terrain aligns with collision and pathing.

Last verified: 2026-06-23
