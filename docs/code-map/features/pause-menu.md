# Feature: Pause and Settings Menu

Feature ID: FEAT-PAUSE-MENU

## Player-Facing Behavior

The player can open game menus and settings panels, adjust options, keybinds,
graphics/UI preferences, and return to gameplay without unintended movement.

## Code Path

1. Key and button input is handled by `Input` and `Keybinds`.
2. `src/main.ts` wires callbacks and settings controls.
3. `src/game/settings.ts` stores preferences.
4. `src/ui/settings_controls.ts` and `src/ui/hud.ts` render in-game settings UI.
5. The frame loop sets `input.suspendMovement = !gameInputReady ||
   hud.isModalOpen()` so modal UI does not move the player behind it.
6. Some settings directly affect `Renderer`, `Hud`, `Input`, audio, and wallet
   UI behavior.

## Systems Involved

- SYS-INPUT
- SYS-UI
- SYS-RENDER
- SYS-AUDIO

## Data Structures

- `GameSettings`
- `Settings`
- `Keybinds`
- HUD modal state

## Change Risks

Settings changes can affect accessibility, mobile layout, input capture,
graphics state, persisted browser preferences, and gameplay input blocking.

## Known Unclear Areas

- This feature needs a deeper trace of exact HUD settings panel methods before
  major settings UI work.

## Verification Steps

- Open and close menus with keyboard and mouse.
- Change keybinds and confirm input updates.
- Change graphics/UI settings and confirm no layout overlap.
- Ensure movement is suspended while modal UI is open.

Last verified: 2026-06-23
