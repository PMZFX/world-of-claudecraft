# High Risk Files

## Very High Risk

- `src/sim/sim.ts`: central deterministic simulation, persistence shape, combat,
  quests, inventory, dungeons, arena, pets, and AI.
- `src/sim/types.ts`: shared entity, event, stat, item, XP, and saved-state
  types.
- `server/main.ts`: REST routes, WebSocket auth, server boot, shutdown, and
  static serving.
- `server/game.ts`: authoritative online world, sessions, snapshots, commands,
  autosave, chat, market, social integration, and anti-bot hooks.
- `server/db.ts`: schema and persistence access.
- `src/main.ts`: browser startup, homepage, auth, character select, wallet,
  settings, shared frame loop, and gameplay wiring.
- `src/render/renderer.ts`: central Three.js scene, entity views, camera, VFX,
  picking, and prewarm.
- `src/ui/hud.ts`: central in-game DOM UI.
- `src/net/online.ts`: online REST client and WebSocket world mirror.

## Medium to High Risk

- `vite.config.ts`: build inputs, dev proxy, aliasing, and chunk behavior.
- `src/render/assets/preload.ts`: startup asset gate.
- `src/render/assets/loader.ts`: glTF/HDR/texture loader and caches.
- `src/game/input.ts`: keyboard, mouse, touch, gamepad, click-to-move input.
- `src/game/settings.ts`: persisted browser settings.
- `src/ui/i18n.ts` and `src/ui/i18n.catalog/*`: localization runtime and source
  text.
- `src/sim/content/zone*.ts`: mobs, quests, NPCs, items, and vendors.
- `src/sim/content/classes.ts`: ability behavior data.
- `src/sim/content/talents*.ts`: talent data and progression.

## Generated or Mostly Generated

- `src/render/assets/manifest.generated.ts`
- `src/game/sfx_manifest.generated.ts`
- `src/game/voice_manifest.generated.ts`
- `src/ui/i18n.resolved.generated/*`
- `src/admin/i18n.resolved.generated/*`
- `src/guide/content.generated.ts`
- `src/ui/i18n.status.json`

Use the related scripts instead of hand-editing generated files.

Last verified: 2026-06-23
