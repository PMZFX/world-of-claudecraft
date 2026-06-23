# High Risk Change Checklist

Use this checklist when changing central files or cross-cutting systems.

## Highest Risk Files

- `src/sim/sim.ts`
- `src/sim/types.ts`
- `server/main.ts`
- `server/game.ts`
- `server/db.ts`
- `src/main.ts`
- `src/render/renderer.ts`
- `src/ui/hud.ts`
- `src/net/online.ts`

## Simulation Changes

- [ ] Read `docs/code-map/systems/game-state.md`.
- [ ] Read affected gameplay system docs.
- [ ] Confirm deterministic rules still hold in `src/sim/`.
- [ ] Avoid DOM, browser, renderer, UI, network, wall-clock, and `Math.random()`
  dependencies in `src/sim/`.
- [ ] Check offline browser, online server, and headless RL impact.
- [ ] Add focused tests for new mechanics or changed formulas.

## Save/Load and Database Changes

- [ ] Read `docs/code-map/systems/save-load.md`.
- [ ] Check old saved characters load safely.
- [ ] Use optional fields and defaults for `CharacterState` additions.
- [ ] Check `ensureSchema()` migration behavior.
- [ ] Test create, save, restart, and reload for affected data.

## Online Protocol Changes

- [ ] Read `docs/code-map/systems/networking.md`.
- [ ] Inspect both `src/net/online.ts` and `server/game.ts`.
- [ ] Check auth, command validation, snapshots, events, and disconnect paths.
- [ ] Verify client and server agree on message shapes.

## UI and Frontend Changes

- [ ] Read `docs/code-map/systems/ui.md`.
- [ ] Route player-facing strings through localization.
- [ ] Preserve keyboard navigation and focus behavior.
- [ ] Check mobile touch target sizes and input font sizes.
- [ ] Check no overlap, clipping, or horizontal overflow.

## Rendering and Asset Changes

- [ ] Read `docs/code-map/systems/rendering.md`.
- [ ] Read `docs/code-map/asset-pipeline.md`.
- [ ] Check preload registration and runtime paths.
- [ ] Verify first-frame loading and browser console.
- [ ] Watch for memory and disposal regressions.

## Minimum Verification Pattern

Use the smallest relevant set, but central changes often need:

```bash
npm run build
npm test
scripts/update-code-map.sh
```

For local full-stack checks:

```bash
docker compose ps
curl -I http://127.0.0.1:18787/
```

Last verified: 2026-06-23
