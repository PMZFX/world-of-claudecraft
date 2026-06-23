# System: Rendering

System ID: SYS-RENDER

## Purpose

Convert `IWorld` state into a Three.js scene: terrain, entities, character
visuals, camera, nameplates, props, weather, sky, water, VFX, and picking.

## Primary Files

- `src/render/renderer.ts`: central `Renderer`.
- `src/render/assets/loader.ts`: glTF, HDR, and texture loading.
- `src/render/assets/preload.ts`: boot-time preload registry.
- `src/render/characters/*`: character visuals, animation, portraits, preview.
- `src/render/terrain.ts`, `water.ts`, `sky.ts`, `weather.ts`: world surfaces.
- `src/render/props.ts`, `foliage.ts`, `dungeon.ts`, `quest_objects.ts`: world
  object and instance rendering.
- `src/render/vfx.ts`: visual effects.

## Entry Points

- `new Renderer(world, canvas, nameplateLayer)`
- `Renderer.prewarmInitialScene()`
- `Renderer.sync(alpha, dt, renderFacingOverride, selfAlphaLead?)`
- `Renderer.pick(clientX, clientY)`

## Data Flow

```text
IWorld entities and player state
-> Renderer.sync()
-> EntityView map
-> Three.js scene graph
-> WebGL canvas and nameplate layer
```

## Dependencies

- `IWorld` from `src/world_api.ts`
- Three.js and `n8ao`
- Render asset loaders and public media directories
- Terrain helpers from `src/sim/world.ts`

## What Depends On This

- Game visuals
- Picking and hover targeting
- Character preview on selection screens
- Player card and screenshots
- Performance overlay metrics

## Change Risk

High. Renderer changes can break boot, memory, frame rate, picking, asset
loading, or mobile GPU behavior.

## Known Unclear Areas

- `Renderer` is large and central. Future mapping should split feature cards for
  terrain, entity views, character visuals, and VFX.

## Verification Steps

- Enter world and confirm first frame clears loading screen.
- Move through all zones if terrain/weather changes.
- Target and interact with entities.
- Check browser console for missing assets or WebGL warnings.
- For visual changes, capture desktop and mobile screenshots.

Last verified: 2026-06-23
