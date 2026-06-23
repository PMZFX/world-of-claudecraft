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

## Verification Steps

- Run `npm run build`.
- Test desktop and mobile viewport layouts.
- Navigate with keyboard.
- Check localization for any new player-facing strings.
- Test relevant HUD panels and modal interactions.

Last verified: 2026-06-23
