# System: Enemies and AI

System ID: SYS-ENEMYAI

## Purpose

Control mob spawning, aggro, wandering, threat, chasing, leashing, evade, pets,
boss adds, dungeon behaviors, and arena bots.

## Primary Files

- `src/sim/sim.ts`: AI update paths, mob lifecycle, leashing, pets, bosses.
- `src/sim/mob_combat.ts`: combat profiles for mobs.
- `src/sim/threat.ts`: threat table helpers.
- `src/sim/content/zone1.ts`, `zone2.ts`, `zone3.ts`: mob definitions.
- `src/sim/content/dungeons.ts`, `temple.ts`, `warlock_pets.ts`: specialized
  mobs and encounters.

## Entry Points

- `Sim.tick()`
- Mob update sections inside `src/sim/sim.ts`
- Boss add spawn helpers in `src/sim/sim.ts`
- Threat helpers in `src/sim/threat.ts`

## Data Flow

```text
World/mob content
-> Sim construction and spawn helpers
-> Sim.tick() AI update
-> combat/threat/loot/quest events
```

## Dependencies

- SYS-ENTITY
- SYS-COMBAT
- SYS-WORLDMAP
- SYS-INVENTORY

## What Depends On This

Combat pacing, quest kill credit, loot drops, dungeon encounters, arena practice,
pet behavior, and world feel.

## Change Risk

High for shared AI or boss logic. Medium for isolated mob data edits.

## Known Unclear Areas

- The AI code is embedded in `src/sim/sim.ts`, so exact boundaries need deeper
  follow-up maps before major AI refactors.

## Verification Steps

- Pull and leash several normal mobs.
- Kill quest mobs and check credit.
- Test a dungeon encounter if boss logic changes.
- Run existing smoke scripts for affected classes or dungeons.

Last verified: 2026-06-23
