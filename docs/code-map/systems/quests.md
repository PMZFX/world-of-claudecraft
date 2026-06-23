# System: Quests

System ID: SYS-QUESTS

## Purpose

Manage quest availability, objectives, progress, turn-ins, rewards, quest items,
quest tracker state, and guide content derived from quest data.

## Primary Files

- `src/sim/sim.ts`: quest state checks, progress, rewards, and turn-in logic.
- `src/sim/data.ts`: assembled quest and content data.
- `src/sim/content/zone1.ts`, `zone2.ts`, `zone3.ts`: quest, NPC, item, and mob
  definitions by zone.
- `src/sim/quest_fallback.ts`: fallback grants.
- `src/ui/quest_tracker.ts`: quest tracker UI.
- `src/ui/i18n.catalog/quests.ts`: quest localization catalog.
- `scripts/wiki/build_content.mjs`: guide content generation from game content.

## Entry Points

- Quest interaction methods inside `src/sim/sim.ts`
- Quest progress updates during kills, collection, and object interaction
- `Hud.handleEvents(events)`
- `npm run wiki:content`

## Data Flow

```text
Content quest definitions
-> Sim quest state and progress
-> events/snapshots
-> quest tracker and dialogs
-> CharacterState.questLog and questsDone
```

## Dependencies

- SYS-INVENTORY
- SYS-COMBAT
- SYS-WORLDMAP
- SYS-PROGRESSION
- SYS-SAVELOAD
- SYS-UI

## What Depends On This

Player progression, NPC interactions, quest item drops, guide content, and saved
characters.

## Change Risk

High. Quest edits can break chains, item drops, objective counts, localization,
guide generation, and persisted quest state.

## Known Unclear Areas

- Exact quest dialog rendering methods in `src/ui/hud.ts` need a deeper map
  before large quest UI changes.

## Verification Steps

- Accept, progress, and complete an affected quest.
- Check quest tracker and turn-in rewards.
- Run `npm run wiki:content` for content changes.
- Relog online and confirm quest state persists.

Last verified: 2026-06-23
