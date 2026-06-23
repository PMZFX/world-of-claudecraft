# Change Note: Command Timing Buckets

Date: 2026-06-23

## Summary

Added additive command timing counters to `GameServer.adminStats()` so server
performance work can see which broad WebSocket action category is consuming
synchronous handler time.

## Files Changed

- `server/game.ts`: records per-message elapsed time with buckets for parse,
  protocol, input, combat, targeting, interaction, inventory, quest, chat,
  social, party, pet, trade, duel, arena, talents, market, dev, dungeon,
  telemetry, and other commands.
- `tests/game_sessions.test.ts`: covers parse, input, quest, chat, and unknown
  command buckets.
- `docs/design/2026-06-23-server-performance-baseline.md`: marks command timing
  instrumentation complete and keeps remaining follow-up work current.
- `docs/code-map/systems/networking.md`: documents the new admin stats field
  and its measurement scope.

## Notes

- Timings cover JSON parsing plus synchronous command dispatch inside
  `GameServer.handleMessage()`.
- Timings do not include asynchronous work launched by a command after dispatch
  returns.
- `commandTimings` is additive in the admin stats payload.

## Verification

- `npx vitest run tests/game_sessions.test.ts tests/admin.test.ts`
- `npx tsc --noEmit`
