# System: Save and Load

System ID: SYS-SAVELOAD

## Purpose

Persist online accounts, tokens, characters, JSONB character state, market state,
chat logs, moderation data, social data, wallet links, and play sessions.

## Primary Files

- `server/db.ts`: schema and most database access.
- `server/game.ts`: autosave, logout save, shutdown save, market save.
- `server/main.ts`: account and character REST endpoints, shutdown cleanup.
- `src/sim/sim.ts`: `CharacterState`, `serializeCharacter()`, load defaults.
- `docker-compose.yml`: Postgres service and volume.

## Entry Points

- `ensureSchema()`
- `createAccount()`, `saveToken()`, `accountForToken()`
- `createCharacterCapped()`, `listCharacterSummaries()`, `getCharacter()`,
  `saveCharacterState()`
- `GameServer.saveAll(reason)`
- `Sim.serializeCharacter(pid)`

## Data Flow

```text
REST account/character request
-> server/main.ts
-> server/db.ts
-> Postgres
```

```text
Character select
-> listCharacterSummaries()
-> roster fields plus skin JSONB expression
```

```text
GameServer session
-> Sim.serializeCharacter()
-> compare serialized state with ClientSession.lastSavedStateJson
-> saveCharacterState()
-> characters.state JSONB
```

## Dependencies

- Postgres connection from `pg`.
- Simulation `CharacterState`.
- Server shutdown and session lifecycle.

## What Depends On This

- Online accounts
- Character roster
- Persistent inventory, gear, quests, talents, position, money, arena rating,
  skins, and post-cap XP
- Admin dashboard and moderation tools

## Change Risk

High. Schema or serialized-state changes can break live player data. Optional
fields and defaults in `CharacterState` are compatibility mechanisms, not
accidental looseness.

## Known Unclear Areas

- No migration folder is visible; migrations appear embedded in `ensureSchema()`.
- Autosave still serializes every online character on its interval, but skips
  the DB write when serialized state is identical to the last successful save.
  Mutation-level dirty flags are not implemented yet.

## Verification Steps

- Start Postgres and server.
- Register, create character, enter world.
- Change inventory/quest/position if relevant.
- Restart server and confirm state loads.
- Run DB-related tests when changing `server/db.ts`.
- Confirm `/api/characters` does not load full `characters.state` for roster
  display unless that endpoint intentionally needs full saved state.
- Confirm unchanged loaded characters increment `characterSaveSkips` rather than
  issuing duplicate `UPDATE characters` writes.

Last verified: 2026-06-23
