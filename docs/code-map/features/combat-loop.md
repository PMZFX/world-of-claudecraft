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
4. `Sim.tick()` resolves attacks, abilities, AI, auras, death, loot, and events.
5. `Hud.handleEvents(events)` renders combat text, chat, meters, and notices.
6. `renderer.sync(...)` updates animations, VFX, selection, and entity views.

Online:

1. `ClientWorld` sends commands over WebSocket.
2. `server/main.ts` authenticates the socket and routes messages to
   `GameServer.handleMessage()`.
3. `GameServer` applies commands to the authoritative `Sim`.
4. Server snapshots and events update `ClientWorld`.
5. The same HUD and renderer consume the mirrored `IWorld`.

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

## Change Risks

Combat changes affect deterministic sim behavior, online authority, HUD events,
class balance, AI, loot, and tests.

## Verification Steps

- Target a nearby hostile.
- Auto attack and use abilities.
- Take damage and heal if relevant.
- Kill a mob and verify corpse/loot.
- Repeat online and check for desync or command rejection.

Last verified: 2026-06-23
