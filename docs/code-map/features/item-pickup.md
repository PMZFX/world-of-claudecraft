# Feature: Item Pickup and Loot

Feature ID: FEAT-ITEM-PICKUP

## Player-Facing Behavior

The player interacts with a corpse or object, receives copper and/or items, sees
inventory and loot UI update, and quest collection progress may advance.

## Code Path

1. Player input reaches interaction handling in `src/main.ts`.
2. Offline mode calls the local `Sim`; online mode sends `ClientWorld.lootCorpse`
   or an interaction command.
3. Online commands are handled by `GameServer.handleMessage(...)`.
4. `src/sim/sim.ts` validates range, loot visibility, personal/shared loot, and
   quest item eligibility.
5. Inventory state and money mutate in `PlayerMeta`.
6. `SimEvent` entries are emitted for loot, rolls, quest progress, or errors.
7. HUD handles events and refreshes inventory with `Hud.onInventoryChanged()`
   when online snapshots mark inventory changed.
8. Online state persists through `Sim.serializeCharacter()` and
   `saveCharacterState()`.

## Systems Involved

- SYS-INPUT
- SYS-INVENTORY
- SYS-COMBAT
- SYS-QUESTS through quest objectives
- SYS-SAVELOAD
- SYS-UI
- SYS-NETWORK

## Data Structures

- `InvSlot`
- `ItemDef`
- `LootSlot`
- `QuestProgress`
- `CharacterState`

## Change Risks

Loot and pickup changes can break quest objectives, shared loot rules, inventory
save/load, vendor behavior, and HUD refresh logic.

## Verification Steps

- Kill and loot a normal mob.
- Loot a quest item while the quest is active.
- Try looting with a full or near-full bag if relevant.
- Relog online and confirm inventory persists.

Last verified: 2026-06-23
