# System: UI

System ID: SYS-UI

## Purpose

Render and update the in-game HUD, chat, inventory, party, character, map,
settings, meters, tooltips, localization, and homepage/account UI.

## Primary Files

- `src/ui/hud.ts`: central in-game HUD.
- `src/ui/*`: focused HUD helpers and UI modules.
- `src/ui/i18n.ts`: runtime localization.
- `src/ui/i18n.catalog/*`: English source catalogs.
- `src/ui/i18n.locales/*`: non-English overlays.
- `src/ui/perf_overlay.ts`, `src/ui/perf_graph_painter.ts`: performance overlay
  DOM and frame-time graph drawing.
- `src/main.ts`: home page, auth, character select, wallet, settings, and
  gameplay UI wiring.
- `src/admin/*`: admin dashboard UI.
- `src/guide/*`: guide/wiki SPA UI.

## Entry Points

- `new Hud(world, renderer, keybinds)`
- `Hud.handleEvents(events)`
- `Hud.update()`
- `translatePage()` in `src/main.ts`
- `wireStartScreens()` in `src/main.ts`

## Data Flow

```text
IWorld state and SimEvent[]
-> Hud.handleEvents()
-> Hud.update()
-> DOM HUD and overlays
```

```text
Settings UI
-> src/game/settings.ts
-> src/main.ts applySetting()
-> Hud, Renderer, Input, audio, ClientWorld, or local Sim depending on key
```

The Key Bindings panel exposes the auto-face-on-cast toggle. The HUD also shows
stack counts for debuffs such as Sunder Armor via `.buff .stacks`.

The performance overlay wraps its canvas in `.perf-graph-wrap`; the wrapper owns
CSS size while `frameGraphCanvasMetrics()` only updates the backing store. This
keeps the graph from stretching the overlay as samples update.

## Dependencies

- `IWorld`
- `Renderer` for selection, camera, portraits, and visual hooks
- `Keybinds`
- Localization catalogs and generated locale tables
- Server and sim localization matchers for player-facing text

## What Depends On This

- All player-facing UI, including gameplay and account flows.
- Accessibility and localization coverage.
- Admin operator workflows.

## Change Risk

High. UI changes often affect localization, mobile layout, keyboard access,
touch target size, and gameplay interaction states.

## Known Unclear Areas

- Some homepage, character select, wallet, and settings UI lives in `src/main.ts`
  rather than dedicated UI modules.
- New player-facing settings text requires updates to `src/ui/i18n.catalog/*`,
  generated resolved locale tables, `src/ui/i18n.resolved.sha256`, and any
  non-Latin locale overlays needed by completeness tests.

## Verification Steps

- Run `npm run build`.
- Test desktop and mobile viewport layouts.
- Navigate with keyboard.
- Check localization for any new player-facing strings.
- Test relevant HUD panels and modal interactions.
- For perf overlay graph changes, enable the overlay, turn on the frame-time
  graph, resize the viewport, and confirm the graph width stays bounded by the
  overlay.

Last verified: 2026-06-23
