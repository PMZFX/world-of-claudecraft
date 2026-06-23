# Source Folder Index

## Root Files

- `package.json`: npm scripts, runtime dependencies, and dev dependencies. Safe
  to edit when changing commands or dependencies, but verify with `npm ci` and
  `npm run build`.
- `vite.config.ts`: Vite inputs, aliases, dev proxy, build defines, and test
  config. High risk for browser boot and local dev.
- `Dockerfile` and `docker-compose.yml`: production/local container stack.
  Machine-specific changes belong in ignored `docker-compose.override.yml`.
- `.env.example`: documented env defaults. Safe to edit only for intentional
  config contract changes.

## `src/sim/`

Deterministic simulation core shared by browser offline, server online, and
headless RL. High risk. Do not add DOM, browser, render, UI, network, or
wall-clock dependencies.

Common reasons to visit: combat, entities, quests, items, XP, talents, dungeons,
terrain/collision helpers, saved character state.

## `src/sim/content/`

Game content tables: classes, abilities, zones, quests, mobs, items, dungeons,
skins, talents, and pets. Medium to high risk because content feeds sim, guide,
localization, and tests.

## `src/game/`

Browser gameplay glue: input, keybinds, settings, mobile controls, camera,
audio, SFX, music, performance reporting, and interactions. Medium to high risk.

## `src/render/`

Three.js renderer and runtime asset loading. High risk for visual startup,
performance, memory, and mobile compatibility.

## `src/render/assets/`

Asset loader, preload gate, stats, and generated media manifest. Generated files
should be regenerated, not hand-edited.

## `src/ui/`

Vanilla DOM gameplay UI and localization. High risk for localization,
accessibility, mobile layout, and player-facing strings.

## `src/ui/i18n.catalog/`

English source translation catalogs. Edit when adding user-facing UI text.

## `src/ui/i18n.locales/`

Non-English overlays. The project guidance says contributors should generally
avoid hand-editing these per-PR.

## `src/admin/`

Admin dashboard client. Admin UI strings are player/operator-facing and must
follow localization rules.

## `src/guide/`

In-app guide/wiki SPA. Some content is generated from game data. Safe to edit
for guide UI and pages, but regenerate guide content when source content changes.

## `src/net/`

Browser REST and WebSocket networking, wallet client helpers, and native
attestation client code. High risk for online protocol and auth flows.

## `server/`

Authoritative Node server, database access, REST APIs, WebSocket sessions,
moderation, social systems, wallet linking, and admin APIs. High risk.

## `server/bot_detector/`

Public no-op bot-detector contract and stub. Production can swap in a private
implementation via `#bot-detector`.

## `headless/`

Gym/RL environment server over stdio. Medium risk. It should use the real sim,
not a separate gameplay implementation.

## `scripts/`

Build, content, media, smoke, audit, and automation scripts. Risk depends on the
script. Generated outputs should be understood before committing.

## `tests/`

Vitest unit/integration tests and helpers. Safe to edit with behavior changes.

## `public/`

Static site assets, runtime models/textures/audio/VFX, icons, privacy pages, and
fallback pages. Asset path changes are medium risk because render modules often
refer to public-relative paths.

## `docs/`

Human docs, design notes, release notes, screenshots, and this code map.

## `mediawiki/`

Standalone MediaWiki container support. Current server comments suggest the
standalone MediaWiki route is being retired in favor of the in-app guide.

## `android/` and `ios/`

Capacitor mobile wrappers. High risk if changing native build or app identity.

Last verified: 2026-06-23
