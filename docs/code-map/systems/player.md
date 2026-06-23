# System: Player

System ID: SYS-PLAYER

## Purpose

Represent player characters, movement, class abilities, resources, equipment,
quests, inventory, talents, skins, party state, and online session identity.

## Primary Files

- `src/sim/sim.ts`: player state, actions, serialization, combat, inventory.
- `src/sim/content/classes.ts`: class abilities and spell data.
- `src/sim/content/talents*.ts`: talents and specializations.
- `src/game/input.ts`: movement and action input.
- `src/main.ts`: player command routing.
- `server/game.ts`: online player sessions.
- `src/ui/hud.ts`: player-facing panels and HUD state.

## Entry Points

- `Sim.addPlayer(...)` through constructor or `GameServer.join()`
- `Sim.serializeCharacter(pid)`
- `Input.readMoveInput()`
- `ClientWorld.flushInput()`
- `GameServer.join()`

## Data Flow

```text
Input/commands
-> Sim player entity and PlayerMeta
-> events/snapshots
-> HUD, renderer, persistence
```

## Dependencies

- SYS-INPUT
- SYS-COMBAT
- SYS-INVENTORY
- SYS-PROGRESSION
- SYS-SAVELOAD

## What Depends On This

Every player-facing gameplay feature.

## Change Risk

High. Player state crosses simulation, persistence, networking, rendering, and
UI. Backward compatibility matters for existing saved characters.

## Known Unclear Areas

- Player-related logic is distributed across `src/sim/sim.ts`, `src/main.ts`,
  `src/ui/hud.ts`, and `server/game.ts`.

## Verification Steps

- Create offline and online characters for at least one class.
- Move, attack, loot, equip, spend talent points, and relog online.
- Check HUD resources and action bars.

Last verified: 2026-06-23
