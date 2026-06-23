# Dependency Map

## Human-Readable System Map

Browser startup:

```text
index.html
-> src/main.ts
-> src/game/* input, settings, audio, mobile controls
-> src/net/online.ts for online play
-> src/sim/sim.ts for offline play
-> src/render/renderer.ts
-> src/ui/hud.ts
```

Server startup:

```text
server/main.ts
-> server/db.ts
-> server/game.ts
-> src/sim/sim.ts
-> server/social.ts, server/chat_filter.ts, server/admin.ts
-> dist/ static client build
```

Simulation core:

```text
src/sim/sim.ts
-> src/sim/types.ts
-> src/sim/data.ts
-> src/sim/content/*
-> src/sim/world.ts
-> src/sim/pathfind.ts
-> src/sim/mob_combat.ts
```

Rendering:

```text
src/render/renderer.ts
-> src/render/assets/*
-> src/render/characters/*
-> src/render/terrain.ts, sky.ts, weather.ts, water.ts
-> public/models, public/textures, public/env, public/vfx
-> IWorld from src/world_api.ts
```

UI:

```text
src/ui/hud.ts
-> src/ui/* feature modules
-> src/ui/i18n.ts
-> src/ui/i18n.catalog/*
-> IWorld from src/world_api.ts
```

Online networking:

```text
src/net/online.ts
-> WebSocket / REST
-> server/main.ts
-> server/game.ts
-> src/sim/sim.ts
```

## System Inventory

| ID | System | Primary files | Role | Risk |
|---|---|---|---|---|
| SYS-BOOT | Boot lifecycle | `src/main.ts`, `server/main.ts`, `headless/env_server.ts` | Central | High |
| SYS-GAMESTATE | Game state | `src/sim/sim.ts`, `src/world_api.ts`, `src/net/online.ts` | Central | High |
| SYS-INPUT | Input | `src/game/input.ts`, `src/game/keybinds.ts`, `src/game/gamepad.ts` | Central | High |
| SYS-RENDER | Rendering | `src/render/renderer.ts`, `src/render/assets/*` | Central client | High |
| SYS-UI | UI | `src/ui/hud.ts`, `src/ui/*`, `src/main.ts` | Central client | High |
| SYS-AUDIO | Audio | `src/game/audio.ts`, `music.ts`, `sfx.ts`, `voice.ts` | Client support | Medium |
| SYS-NETWORK | Networking | `src/net/online.ts`, `server/main.ts`, `server/game.ts` | Central online | High |
| SYS-SAVELOAD | Save/load | `server/db.ts`, `server/game.ts`, `src/sim/sim.ts` | Central online | High |
| SYS-ENTITY | Entity system | `src/sim/entity.ts`, `src/sim/types.ts`, `src/sim/sim.ts` | Central | High |
| SYS-COMBAT | Combat | `src/sim/sim.ts`, `src/sim/mob_combat.ts`, `src/sim/content/classes.ts` | Central gameplay | High |
| SYS-INVENTORY | Inventory | `src/sim/sim.ts`, `src/sim/content/items.ts`, `src/ui/hud.ts` | Gameplay | High |
| SYS-QUESTS | Quests | `src/sim/sim.ts`, `src/sim/content/zone*.ts`, `src/ui/quest_tracker.ts` | Gameplay | High |
| SYS-PROGRESSION | Progression | `src/sim/types.ts`, `src/sim/content/talents*`, `src/ui/xp_bar.ts` | Gameplay | Medium |
| SYS-WORLDMAP | World map | `src/sim/world.ts`, `src/sim/content/zone*.ts`, `src/render/terrain.ts` | Gameplay/render | Medium |

## Machine-Generated Map

Run:

```bash
scripts/update-code-map.sh
```

The script refreshes mechanical indexes under `docs/code-map/generated/`. It
does not overwrite human subsystem or feature docs.

Last verified: 2026-06-23
