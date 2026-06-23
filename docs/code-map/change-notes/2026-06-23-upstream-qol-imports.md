# Change Note: Upstream QoL Imports

Date: 2026-06-23

## Summary

Incorporated a small set of upstream pull-request ideas that fit this fork's
baseline cleanup goals before starting new feature development.

## Incorporated Changes

- Sunder Armor and other stacking debuffs can carry stack counts through
  `WireAura.stacks`, reconstruct them in `ClientWorld`, and display stack badges
  in the HUD.
- Targeted casts support the `autoFaceOnCast` setting. It defaults on, is exposed
  in the Key Bindings panel, applies locally through `Sim`, and is sent online
  with the `setPref` WebSocket command.
- Stale persisted graphics presets are migrated with `GFX_CONFIG_VERSION` so
  returning players are not stuck on old low graphics defaults.
- The performance overlay graph now uses a fixed-size wrapper and pure backing
  store metrics, avoiding graph width drift while samples update.
- Ordinary mob melee range grace is reduced and applies only when the mob moved,
  not merely because the target moved.

## Primary Files

- `server/game.ts`
- `src/net/online.ts`
- `src/sim/sim.ts`
- `src/sim/mob_combat.ts`
- `src/game/settings.ts`
- `src/main.ts`
- `src/render/gfx.ts`
- `src/graphics_config.ts`
- `src/ui/hud.ts`
- `src/ui/perf_overlay.ts`
- `src/ui/perf_graph_painter.ts`
- `src/ui/i18n.catalog/hud_chrome.ts`
- `src/ui/i18n.locales/*`

## Code Map Updates

- `systems/combat.md`
- `systems/networking.md`
- `systems/ui.md`
- `systems/rendering.md`
- `systems/input.md`
- `systems/save-load.md`
- `features/combat-loop.md`
- `features/pause-menu.md`
- `code-owners/source-folder-index.md`

## Verification

- `npx vitest run tests/snapshots.test.ts tests/sim.test.ts tests/settings.test.ts tests/gfx.test.ts tests/perf_graph_painter.test.ts tests/mob_combat.test.ts`
- `npx tsc --noEmit`
- `npm run build:server`
- `npm run build`
- `npm test`

## Follow-Up Notes

- Larger upstream PRs such as sortable character lists, quest sharing, and new
  zones remain design references rather than imported code.
- The `setPref` WebSocket command currently carries only the auto-face-on-cast
  preference. If more runtime preferences are added, consider a shared protocol
  type or schema.
