# Dead or Unclear Code

## MediaWiki Route Status

`server/main.ts` defines `WIKI_URL` and comments that the standalone community
MediaWiki redirect is deprecated in favor of the curated in-app guide served at
`/wiki`. `docker-compose.yml` still includes MediaWiki services.

Risk: medium. Do not remove MediaWiki stack files without confirming deployment
expectations and docs.

## `src/main.ts` Ownership Boundaries

`src/main.ts` owns many separate responsibilities: homepage, auth, realm and
character flow, wallet UI, localization boot, settings, game entry, and the
frame loop.

Risk: high. New feature work should avoid adding more unrelated blocks here when
a focused module under `src/game/`, `src/ui/`, or `src/net/` fits.

## Bot Detector Implementation

The public tree has `server/bot_detector/stub.ts`. Build config can alias
`#bot-detector` to a private implementation under `private/bot_detector`.

Risk: medium. Public behavior is no-op unless a private implementation is
present. Do not assume anti-bot enforcement is active in the public checkout.

## Exact Protocol Schema

The online protocol is implemented across `src/net/online.ts` and
`server/game.ts`; no single complete schema file was identified in this pass.

Risk: high. Protocol changes must inspect both sides and update tests/docs.

Last verified: 2026-06-23
