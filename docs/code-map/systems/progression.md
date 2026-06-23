# System: Progression

System ID: SYS-PROGRESSION

## Purpose

Manage XP, levels, lifetime XP, rested XP, class ranks, talents, quest rewards,
arena ratings, and player power growth.

## Primary Files

- `src/sim/types.ts`: XP and stat helpers.
- `src/sim/sim.ts`: XP grants, level state, quest rewards, arena standings.
- `src/sim/content/classes.ts`: class ability ranks.
- `src/sim/content/talents.ts`, `talents_classic.ts`, `talents_warrior.ts`:
  talent data.
- `src/ui/xp_bar.ts`: XP display formatting.
- `src/ui/talent_i18n.ts`, `src/ui/talent_icons.ts`: talent UI support.
- `server/main.ts`: leaderboard endpoints and cache.

## Entry Points

- XP and reward paths in `src/sim/sim.ts`
- Talent allocation and loadout methods in `src/sim/sim.ts`
- `virtualLevel()` and XP helpers in `src/sim/types.ts`
- Leaderboard cache functions in `server/main.ts`

## Data Flow

```text
Kill/quest/arena result
-> Sim progression mutation
-> level/resource/stat changes
-> events and snapshots
-> HUD and persistence
```

## Dependencies

- SYS-COMBAT
- SYS-INVENTORY
- SYS-SAVELOAD
- SYS-UI

## What Depends On This

Class unlocks, player stats, guide content, leaderboard, character selection,
and long-term retention systems.

## Change Risk

Medium to high. Formula changes affect balance and persistence. New saved fields
must load older characters safely.

## Known Unclear Areas

- Talent system is split across multiple content files and HUD rendering; deeper
  feature traces are needed before major talent changes.

## Verification Steps

- Gain XP from a kill and quest turn-in.
- Level up.
- Spend and reset talent points if affected.
- Check leaderboard endpoints if lifetime XP changes.

Last verified: 2026-06-23
