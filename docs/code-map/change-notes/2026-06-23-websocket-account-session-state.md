# Change Note: WebSocket Account Session State

Date: 2026-06-23

## Summary

WebSocket joins now use `loadAccountSessionState()` to load account state needed
for session creation in one account query.

## Files Changed

- `server/db.ts`: added `AccountSessionState`, row normalization helpers, and
  `loadAccountSessionState()`.
- `server/main.ts`: replaced separate WebSocket auth reads for moderation,
  chat mute, admin flag, and cosmetics with the bundled session-state helper.
- `tests/character_db.test.ts`: added coverage that the helper returns
  moderation, mute, admin, and normalized cosmetic state from one query.
- `docs/code-map/systems/networking.md`: documented the WebSocket auth data
  flow.
- `docs/design/2026-06-23-server-performance-baseline.md`: marked the account
  read consolidation as complete.

## Behavior Notes

- Moderation precedence remains shared with `moderationStatusForAccount()`.
- Chat mute metadata remains shared with `chatMuteStatusForAccount()`.
- REST login and admin authorization helpers still use their existing entry
  points.

## Verification

- `npx vitest run tests/character_db.test.ts tests/account_server.test.ts`
- `npx tsc --noEmit`

## Last Verified

2026-06-23
