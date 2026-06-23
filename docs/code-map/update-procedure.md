# Code Map Update Procedure

## When Pulling Upstream Changes

1. Fetch upstream:

   ```bash
   git fetch upstream
   ```

2. Compare changed files:

   ```bash
   git diff --name-status HEAD..upstream/main
   git diff --stat HEAD..upstream/main
   git log --oneline HEAD..upstream/main
   ```

3. Group changed files by owning system:

   - `src/sim/*`: SYS-GAMESTATE, SYS-ENTITY, SYS-COMBAT, SYS-INVENTORY,
     SYS-QUESTS, SYS-PROGRESSION, SYS-WORLDMAP
   - `src/game/*`: SYS-INPUT, SYS-AUDIO, SYS-BOOT
   - `src/render/*`: SYS-RENDER and `asset-pipeline.md`
   - `src/ui/*`: SYS-UI
   - `src/net/*`, `server/main.ts`, `server/game.ts`: SYS-NETWORK
   - `server/db.ts`: SYS-SAVELOAD
   - `public/*`: asset pipeline

4. For each affected subsystem doc:

   - Check whether primary files changed.
   - Check whether entry points changed.
   - Check whether data flow changed.
   - Check whether dependencies or change risk changed.
   - Update `Last verified` only for docs actually checked.

5. Update affected feature traces:

   - Main menu or account flow changes: `features/main-menu.md`
   - Character roster or creation changes: `features/character-creation.md`
   - Loading, assets, or renderer boot changes: `features/level-loading.md`
   - Combat, AI, ability, or stat changes: `features/combat-loop.md`
   - Loot, item, vendor, or inventory changes: `features/item-pickup.md`
   - Quest content or progress changes: `features/quests.md`
   - Settings, keybind, or modal changes: `features/pause-menu.md`

6. Regenerate mechanical artifacts:

   ```bash
   scripts/update-code-map.sh
   ```

7. Add a change note under:

   ```text
   docs/code-map/change-notes/YYYY-MM-DD-summary.md
   ```

8. Verify the project with the smallest relevant command set, commonly:

   ```bash
   npm run build
   npm test
   ```

## When Making Our Own Major Changes

Before large behavior or architecture changes, add a design note under
`docs/design/` with:

- Goal
- Current behavior
- Current code locations
- Proposed behavior
- Affected systems
- Migration plan
- Risks
- Verification
- Code map updates required

After implementation, update affected system docs and feature traces in the same
change.

## Generated Artifacts

Generated files live under `docs/code-map/generated/`. They are overwritten by
`scripts/update-code-map.sh` and should not be edited manually.

Last verified: 2026-06-23
