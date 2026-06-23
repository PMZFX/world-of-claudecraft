# Feature: Character Creation

Feature ID: FEAT-CHARACTER-CREATION

## Player-Facing Behavior

Online players create named characters tied to an account. Offline players enter
a name and class for a browser-local session.

## Code Path

Online:

1. `wireStartScreens()` in `src/main.ts` wires character creation controls.
2. Client validates character name with `validateCharacterName()`.
3. `Api` in `src/net/online.ts` sends the character create request.
4. `handleApi()` in `server/main.ts` routes to character creation logic.
5. `initialCharacterState(cls, name, skin)` creates a temporary `Sim` and calls
   `Sim.serializeCharacter()`.
6. `createCharacterCapped()` in `server/db.ts` persists the character.
7. The roster refreshes and can enter online world.

Offline:

1. `wireStartScreens()` handles offline class card selection.
2. `handleOfflineStart(cls)` validates the name.
3. `startOffline(cls, name, skin)` creates a local `Sim`.
4. `startGame(...)` begins offline gameplay.

## Systems Involved

- SYS-BOOT
- SYS-UI
- SYS-PLAYER
- SYS-SAVELOAD
- SYS-NETWORK

## Data Structures

- `PlayerClass`
- `CharacterSummary`
- `CharacterState`
- `PlayerMeta`

## Change Risks

Changing initial state can affect new characters, database compatibility, class
defaults, skins, and offline start behavior.

## Verification Steps

- Create an online account and character.
- Create an offline character.
- Test invalid names.
- Enter the world with the newly created character.
- Relog online and confirm the character remains in the roster.

Last verified: 2026-06-23
