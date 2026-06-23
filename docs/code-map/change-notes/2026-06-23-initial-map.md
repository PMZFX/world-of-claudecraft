# Initial Code Map

Date: 2026-06-23

## Summary

Created the first living code map under `docs/code-map/`.

## Added

- Top-level map navigation and build/run docs.
- Runtime entrypoint map for browser, server, guide/admin, and headless RL.
- Human-readable dependency and data-flow maps.
- Asset pipeline map.
- Core system cards for boot, game state, input, rendering, UI, audio, save/load,
  and networking.
- Gameplay system cards for entities, player, enemies/AI, combat, inventory,
  quests, progression, and world map.
- Feature traces for main menu, character creation, level loading, combat, loot,
  quests, and pause/settings.
- Code-owner docs for source folders, high-risk files, and unclear code.
- Update procedure and generator script for mechanical artifacts.

## Verification

- Source inspection only for map creation.
- Generated artifacts should be refreshed with `scripts/update-code-map.sh`.

## Follow-Up Mapping Passes

- Split `src/main.ts` into more detailed feature ownership notes.
- Add deeper maps for dungeons, arena, social/guilds, trading, wallet, admin,
  localization, and mobile/native wrappers.
- Add protocol-specific notes for `src/net/online.ts` and `server/game.ts`.
