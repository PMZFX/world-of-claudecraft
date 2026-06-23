# Glossary

## Realm

The named online world served by one `GameServer` process. Realm config lives in
`server/realm.ts` and is exposed through REST endpoints in `server/main.ts`.

## Sim

The deterministic game simulation implemented by `src/sim/sim.ts`. It owns
entities, combat, quests, inventory, XP, dungeons, arena state, and serialized
character state.

## IWorld

The client-facing world interface in `src/world_api.ts`. Both offline `Sim` and
online `ClientWorld` satisfy this surface so the renderer and HUD can use one
model.

## ClientWorld

The online WebSocket mirror in `src/net/online.ts`. It receives authoritative
snapshots from the server and sends player commands and movement input.

## HUD

The in-game vanilla DOM UI implemented mainly in `src/ui/hud.ts` plus helper
modules under `src/ui/`.

## Renderer

The Three.js scene manager in `src/render/renderer.ts`. It converts `IWorld`
entities into visible scene views, camera, terrain, props, weather, VFX, and
nameplates.

Last verified: 2026-06-23
