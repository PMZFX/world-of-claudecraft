# Feature: Level Loading

Feature ID: FEAT-LEVEL-LOADING

## Player-Facing Behavior

After choosing a character or offline setup, a loading screen appears, assets
load, then the game world appears with HUD, renderer, input, and audio ready.

## Code Path

1. `prepareWorldEntry()` in `src/main.ts` gates duplicate entry and mobile
   preflight.
2. `startGame(...)` calls `enterLoadingState(...)`.
3. `ensureLocaleLoaded(getLanguage())` loads active locale if needed.
4. `assetsReady(...)` waits for render/audio media registered by render modules.
5. `mountGameUi()` clones the game UI template.
6. `new Renderer(...)` builds the Three.js scene.
7. `new Hud(...)` binds the HUD to `IWorld`.
8. `renderer.prewarmInitialScene()` warms views and renderer state.
9. `requestAnimationFrame(frame)` starts the game loop.
10. The loading screen hides after the first frame.

## Systems Involved

- SYS-BOOT
- SYS-RENDER
- SYS-UI
- SYS-AUDIO
- SYS-GAMESTATE

## Data Structures

- `IWorld`
- `Renderer`
- `Hud`
- Asset preload registry in `src/render/assets/preload.ts`

## Change Risks

Changing load order can cause blank screens, missed locale loading, missing
assets, WebGL failures, or input activation before the first frame.

## Verification Steps

- Enter offline world on a cold page load.
- Enter online world.
- Reload and enter again with cached assets.
- Check browser console for asset or renderer failures.

Last verified: 2026-06-23
