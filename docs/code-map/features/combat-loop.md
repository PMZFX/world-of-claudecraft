# Feature: Combat Loop

Feature ID: FEAT-COMBAT-LOOP

## Player-Facing Behavior

The player targets an enemy, attacks or uses abilities, sees damage/healing and
resource changes, receives combat feedback, and eventually kills or dies.

## Code Path

Offline:

1. Input callbacks in `src/main.ts` classify target/action through
   `src/game/interactions.ts`.
2. Commands call action methods on the local `Sim`.
3. The frame loop advances `offlineSim.tick()`.
4. `Sim.castAbility()` may auto-turn the caster toward targeted abilities
   depending on `PlayerMeta.autoFaceOnCast`.
5. `Sim.tick()` resolves attacks, abilities, AI, auras, death, loot, and events.
6. `Hud.handleEvents(events)` renders combat text, chat, meters, and notices.
7. `renderer.sync(...)` updates animations, VFX, selection, and entity views.

Online:

1. `ClientWorld` sends commands over WebSocket.
2. `server/main.ts` authenticates the socket and routes messages to
   `GameServer.handleMessage()`.
3. `GameServer` applies commands to the authoritative `Sim`.
4. Client settings can send `{ cmd: "setPref", autoFaceOnCast }` so the server
   applies the same targeted-cast facing preference.
5. Server snapshots and events update `ClientWorld`.
6. The same HUD and renderer consume the mirrored `IWorld`.

## Systems Involved

- SYS-INPUT
- SYS-GAMESTATE
- SYS-COMBAT
- SYS-ENEMYAI
- SYS-RENDER
- SYS-UI
- SYS-NETWORK

## Data Structures

- `Entity`
- `SimEvent`
- `MoveInput`
- Ability data from `src/sim/content/classes.ts`
- Threat entries from `src/sim/threat.ts`
- `PlayerMeta.autoFaceOnCast`
- `Aura.stacks` and `WireAura.stacks` for stacking debuffs
- Mob combat profiles from `src/sim/mob_combat.ts`

## Change Risks

Combat changes affect deterministic sim behavior, online authority, HUD events,
class balance, AI, loot, and tests. Facing and aura-stack changes also affect
wire protocol compatibility.

## Verification Steps

- Target a nearby hostile.
- Auto attack and use abilities.
- Take damage and heal if relevant.
- Kill a mob and verify corpse/loot.
- Repeat online and check for desync or command rejection.
- Toggle auto-face-on-cast and test targeted casts while turned away.
- Apply Sunder Armor and confirm the target debuff stack badge updates.
- Move near a mob's melee edge and confirm target movement alone does not grant
  extra mob reach.

Last verified: 2026-06-23
