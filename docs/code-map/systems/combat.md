# System: Combat

System ID: SYS-COMBAT

## Purpose

Resolve player and mob attacks, abilities, resources, damage, healing, threat,
auras, deaths, loot generation, PvP, and arena outcomes.

## Primary Files

- `src/sim/sim.ts`: central combat resolution.
- `src/sim/content/classes.ts`: player abilities.
- `src/sim/content/talents*.ts`: talent modifiers.
- `src/sim/mob_combat.ts`: mob combat profiles.
- `src/sim/threat.ts`: threat computations.
- `src/ui/meters.ts`: damage/healing/threat display.
- `src/ui/combat_sfx.ts`: combat sound mapping.

## Entry Points

- `Sim.tick()`
- Ability/action methods in `src/sim/sim.ts`
- Mob combat update paths in `src/sim/sim.ts`
- `Hud.handleEvents(events)`

## Data Flow

```text
Action input or AI decision
-> Sim combat resolver
-> Entity health/resource/aura/threat changes
-> SimEvent[]
-> HUD, SFX, meters, snapshots, persistence
```

## Dependencies

- SYS-ENTITY
- SYS-PLAYER
- SYS-ENEMYAI
- SYS-INVENTORY
- SYS-PROGRESSION

## What Depends On This

Class feel, quests, loot, dungeons, arena, player survival, UI feedback, and
tests.

## Change Risk

High. Combat affects deterministic behavior, balancing, state persistence, and
online authority.

## Known Unclear Areas

- Combat code is broad inside `src/sim/sim.ts`. Major combat changes should get
  a design note under `docs/design/` before implementation.

## Verification Steps

- Run targeted combat tests if available.
- Attack with at least one melee and one caster class.
- Take damage, heal, die, loot, and relog online if persistence changes.
- For class balance, test affected class resources and cooldowns.

Last verified: 2026-06-23
