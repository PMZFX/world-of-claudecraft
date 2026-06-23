# System: Input

System ID: SYS-INPUT

## Purpose

Collect keyboard, mouse, pointer-lock, touch, gamepad, and click-to-move input,
then normalize it into movement, camera, and action requests consumed by the
browser frame loop.

## Primary Files

- `src/game/input.ts`: central input state and event listeners.
- `src/game/keybinds.ts`: saved keybinding definitions and lookup.
- `src/game/settings.ts`: persisted input-adjacent preferences such as
  click-to-move, attack-move, and auto-face-on-cast.
- `src/game/gamepad.ts`: gamepad polling.
- `src/game/gamepad_bindings.ts` and `src/game/gamepad_map.ts`: gamepad mapping.
- `src/game/mobile_controls.ts`: touch controls and mobile interface mode.
- `src/game/click_move.ts`: pure click-to-move math.
- `src/game/interactions.ts`: hover and click interaction classification.
- `src/main.ts`: frame loop consumes input and sends commands.

## Entry Points

- `new Input(canvas, callbacks, keybinds)` in `src/main.ts`
- `Input.readMoveInput()`
- `Input.updateTouchLook(frameDt)`
- `GamepadManager.poll(frameDt)`
- `clickMoveStep(...)` and `resolveClickMoveAction(...)`

## Data Flow

```text
DOM events / touch / gamepad
-> Input state
-> src/main.ts frame()
-> offline Sim.moveInput or online ClientWorld.moveInput
-> Sim.tick() or WebSocket input stream
```

## Dependencies

- Uses keybind settings and browser DOM events.
- Calls interaction and click-to-move helpers.
- Does not own combat or world mutation directly.
- Targeted cast auto-facing is toggled from the Key Bindings panel but enforced
  by `Sim.castAbility()`. Online clients resend the preference after WebSocket
  hello through `ClientWorld.setAutoFaceOnCast()`.

## What Depends On This

- Player movement
- Camera control
- Interactions, targeting, loot, and attacks
- HUD keyboard shortcuts
- Mobile controls
- Gamepad support

## Change Risk

High. Input touches gameplay, UI modality, camera behavior, accessibility,
mobile controls, and online input echo.

## Known Unclear Areas

- Input, interaction resolution, and some command routing still live in
  `src/main.ts`, not only in `src/game/`.

## Verification Steps

- Move with keyboard.
- Rotate/orbit camera with mouse.
- Use click-to-move and attack-move if enabled.
- Open and close chat, inventory, character, and settings UI.
- Test touch controls if changing mobile paths.
- Test controller if changing gamepad paths.
- Toggle auto-face-on-cast and verify casts behind the player either auto-turn
  or reject, depending on the setting.

Last verified: 2026-06-23
