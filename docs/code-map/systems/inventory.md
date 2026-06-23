# System: Inventory

System ID: SYS-INVENTORY

## Purpose

Manage bags, equipment, vendor buyback, loot drops, quest items, money, item
definitions, trading, and inventory UI updates.

## Primary Files

- `src/sim/sim.ts`: inventory mutation, loot, money, vendors, equipment.
- `src/sim/content/items.ts`: base item definitions.
- `src/sim/content/zone*.ts`: zone quest and vendor items.
- `src/sim/equipment_rules.ts`: equipment validation.
- `src/ui/hud.ts`: inventory, vendor, character, and loot UI.
- `server/game.ts`: online command validation and inventory snapshot changes.

## Entry Points

- Loot and item methods inside `src/sim/sim.ts`
- `ClientWorld.lootCorpse(id)`
- `GameServer.handleMessage(...)` for loot/vendor/trade commands
- `Hud.onInventoryChanged()`

## Data Flow

```text
Mob death or interaction
-> Sim loot/inventory mutation
-> SimEvent and state change
-> HUD inventory refresh
-> online save via CharacterState
```

## Dependencies

- SYS-COMBAT
- SYS-QUESTS via quest item objectives
- SYS-SAVELOAD
- SYS-UI

## What Depends On This

Looting, vendors, quest collection objectives, gear, character power, trading,
and persistence.

## Change Risk

High. Inventory touches save state and quest logic. Item definition edits can
also affect guide content generation.

## Known Unclear Areas

- Inventory UI ownership is primarily in `src/ui/hud.ts`; deeper mapping should
  identify exact HUD methods before large UI changes.

## Verification Steps

- Loot copper and items.
- Equip and unequip gear.
- Buy and sell at a vendor.
- Complete a collect quest.
- Relog online and confirm items persist.

Last verified: 2026-06-23
