# Design: Fork Identity Baseline

## Goal

Define how the PMZFX fork should handle upstream branding, domains, community
links, legal pages, native identifiers, and public metadata before feature work
or public deployment.

## Current Behavior

The fork still presents itself mostly as upstream World of ClaudeCraft. This is
acceptable for local development, but risky for a public PMZFX deployment because
many links and identifiers point to upstream-controlled properties.

## Current Code Locations

| Area | Primary Locations | Current State |
|---|---|---|
| Project name and README | `README.md`, `package.json`, `.github/*` | Mostly upstream World of ClaudeCraft and levy-street links. |
| Browser shell SEO/social metadata | `index.html`, `play.html`, `guide.html`, `public/*.html` | Canonicals and Open Graph URLs point to `worldofclaudecraft.com`. |
| Community links | `index.html`, `play.html`, `README.md`, `.github/*`, `public/*` | Discord, GitHub, sponsor, and social links point to upstream accounts. |
| Legal/support pages | `public/privacy.html`, `public/terms.html`, `public/support.html`, `public/data-deletion.html` | Contact and service identity are upstream-oriented. |
| Sitemap and SEO generation | `public/sitemap.xml`, `scripts/build_sitemap.mjs` | URLs are generated or preserved under `worldofclaudecraft.com`. |
| Native app identity | `.env.example`, `docker-compose.yml`, `server/native_attestation.ts`, `capacitor.config.ts`, `android/`, `ios/` | Package/bundle IDs default to `com.worldofclaudecraft`. |
| Runtime public origin | `server/player_card.ts`, `.env.example`, `package.json` | Defaults point to `https://worldofclaudecraft.com`. |
| Wallet-link copy | `server/wallet.ts`, `server/wallet_link.ts`, UI wallet strings | Account-linking text names World of ClaudeCraft. |
| Database/service names | `.env.example`, `docker-compose.yml`, docs | Internal service/database names still use `eastbrook`. |

## Decisions

| Date | Decision | Reason |
|---|---|---|
| 2026-06-23 | Do not do a broad rename before product direction is chosen. | Renaming touches SEO, legal, i18n, native app IDs, docs, and user-facing strings. |
| 2026-06-23 | Do not ship upstream analytics in the fork baseline. | Hardcoded upstream analytics IDs would report to upstream-controlled accounts. |
| 2026-06-23 | Treat upstream public links as development placeholders only. | A public fork deployment should not send players to upstream support, Discord, sponsor, or legal channels unless explicitly intended. |
| 2026-06-23 | Keep internal `eastbrook` service/database names for now. | They are not public identity, and changing them would add migration risk without product value. |

## Proposed Identity Model

Until a final product name exists, use a two-layer identity:

- **Repository identity**: PMZFX fork of World of ClaudeCraft.
- **Runtime/public identity**: TBD, not yet changed from upstream.

This avoids premature naming churn while making it clear which references are
unsafe for public deployment.

## Affected Systems

- SYS-UI: browser shell metadata, landing page links, wallet/account UI copy.
- SYS-NETWORK: public origin, support URLs, player-card links.
- SYS-SAVELOAD: no direct impact expected.
- SYS-BUILD: sitemap, native build defaults, generated metadata.
- SYS-ASSET: logos, screenshots, icons, social preview images.
- SYS-SECURITY: legal/support contact routes and third-party links.

## Migration Plan

1. Choose a public fork name and deployment domain.
2. Choose whether the fork keeps World of ClaudeCraft attribution in-product,
   README-only, or not at all.
3. Replace upstream community/support links with PMZFX-owned destinations or
   remove them until destinations exist.
4. Update legal/support pages before public deployment.
5. Update canonical URLs, Open Graph metadata, sitemap generation, and public
   origin defaults together.
6. Decide whether native package IDs are in scope. If yes, update native IDs as
   a dedicated high-risk branch.
7. Replace or retain logos and social preview assets based on the final name.
8. Update i18n source strings and regenerate locale artifacts if user-facing
   strings change.
9. Run `scripts/ci-parity.sh` and a local service health check.

## Risks

- SEO/canonical mismatches can point search crawlers and previews to upstream.
- Legal/support pages can imply upstream support responsibility for PMZFX users.
- Native app package/bundle ID changes are high-risk and should not be mixed
  with web copy changes.
- User-facing text changes require i18n updates and generated artifact checks.
- Upstream syncs may reintroduce upstream links unless fork identity is treated
  as a tracked divergence.

## Verification

- `rg -n "worldofclaudecraft|levy-street|discord\\.gg|github.com/sponsors|woc@"`.
- `npm run i18n:gen` if UI strings changed.
- `scripts/ci-parity.sh`.
- Manual checks for homepage, play page, guide page, legal/support pages, and
  social preview metadata.
- If Docker/public origin changes: `scripts/local-health-check.sh`.

## Code Map Updates Required

When identity changes are implemented, update:

- `docs/code-map/build-and-run.md`
- `docs/code-map/systems/ui.md`
- `docs/code-map/systems/networking.md`
- `docs/code-map/asset-pipeline.md`
- `docs/fork-notes.md`
- `docs/development/local-fork-setup.md` if environment defaults change.

Last verified: 2026-06-23
