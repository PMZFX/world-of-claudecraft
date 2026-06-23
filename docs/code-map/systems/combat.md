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
- `server/game.ts`: online command dispatch and combat preference wiring.
- `src/ui/meters.ts`: damage/healing/threat display.
- `src/ui/combat_sfx.ts`: combat sound mapping.

## Entry Points

- `Sim.tick()`
- Ability/action methods in `src/sim/sim.ts`
- `Sim.setAutoFaceOnCast(enabled, pid?)`
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

Targeted casts now respect per-player `PlayerMeta.autoFaceOnCast`, defaulting
on. When enabled, targeted hostile and friendly casts rotate the caster toward
the target before validation. When disabled, hostile targeted casts preserve the
classic facing check and can be rejected while turned away.

Sunder Armor stack counts flow through `Aura.stacks` into `WireAura.stacks` and
the HUD buff/debuff stack badge. The client reconstructs stack counts from
snapshot wire data in `src/net/online.ts`.

Ordinary mob melee grace is owned by `src/sim/mob_combat.ts`.
`effectiveMobMeleeRange(profile, mobMoved)` only adds the profile's
`movingRangeBonus` when the mob itself moved during the tick; target movement
alone does not extend mob reach.

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
- For targeted-cast work, test auto-face enabled and disabled against a target
  behind the player.
- For aura-stack work, apply Sunder Armor and confirm stack count appears on the
  target debuff.
- For mob reach work, test a moving player near melee range and a moving mob
  closing into range.

Last verified: 2026-06-23
