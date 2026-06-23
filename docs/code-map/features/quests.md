# Feature: Quest Interaction

Feature ID: FEAT-QUESTS

## Player-Facing Behavior

Players talk to quest NPCs, accept quests, complete objectives, turn quests in,
receive rewards, and see quest tracker/HUD updates.

## Code Path

1. NPC and quest definitions live in `src/sim/content/zone*.ts` and are assembled
   through `src/sim/data.ts`.
2. The player interacts through input routing in `src/main.ts`.
3. Offline mode calls local `Sim` quest actions; online mode sends commands via
   `ClientWorld`.
4. `src/sim/sim.ts` checks quest availability, progress, completion, rewards,
   and quest item requirements.
5. `SimEvent` entries notify the HUD.
6. `src/ui/quest_tracker.ts` and `src/ui/hud.ts` render quest state.
7. Online quest state persists in `CharacterState.questLog` and
   `CharacterState.questsDone`.
8. `scripts/wiki/build_content.mjs` derives guide content from current game
   content.

## Systems Involved

- SYS-GAMESTATE
- SYS-INVENTORY
- SYS-PROGRESSION
- SYS-UI
- SYS-SAVELOAD
- SYS-WORLDMAP

## Data Structures

- `QuestDef`
- `QuestProgress`
- `CharacterState.questLog`
- `CharacterState.questsDone`

## Change Risks

Quest edits can break progression chains, guide generation, localization, item
drops, NPC interaction, and saved quest state.

## Verification Steps

- Accept a quest.
- Make progress on kill, collect, or interaction objectives.
- Turn in the quest.
- Confirm reward, tracker, and saved state.
- Run `npm run wiki:content` when content changes.

Last verified: 2026-06-23
