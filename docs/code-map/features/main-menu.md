# Feature: Main Menu

Feature ID: FEAT-MAIN-MENU

## Player-Facing Behavior

The player lands on the home/play screen, chooses online or offline play, can
view highscores/news/download/account panels, change language, and start a world
entry flow.

## Code Path

1. `index.html` provides the home and play DOM.
2. `src/main.ts` loads and calls `wireStartScreens()`.
3. `wireStartScreens()` localizes the page, wires nav panels, wallet controls,
   language selector, online/offline buttons, and the Play CTA.
4. Online flow routes to login/account/realm/character panels.
5. Offline flow routes to class and name selection.
6. World entry eventually calls `startGame(...)`.

## Systems Involved

- SYS-BOOT
- SYS-UI
- SYS-NETWORK for online account data
- SYS-AUDIO for homepage music

## Data Structures

- `Api` session token in `src/net/online.ts`
- `SupportedLanguage` from `src/ui/i18n.ts`
- Local settings through `src/game/settings.ts`

## Change Risks

Main menu code is concentrated in `src/main.ts`. Changes can affect localization,
mobile layout, wallet visibility, auth routing, and offline entry.

## Verification Steps

- Load homepage.
- Switch nav panels.
- Change language.
- Choose offline play.
- Choose online play when logged out and when a token exists.

Last verified: 2026-06-23
