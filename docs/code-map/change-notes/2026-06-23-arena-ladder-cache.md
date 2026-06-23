# Change Note: Arena Ladder Cache

Date: 2026-06-23

## Summary

- Added a cache for `Sim.arenaLadder(format)`.
- The cache is invalidated when players join, players leave, or an arena result
  updates ratings/wins/losses.
- `GameServer.selfWireJson()` still calls `arenaInfoFor()` per player snapshot,
  but 1v1 and 2v2 ladder construction is no longer repeated for every online
  player in that snapshot pass.

## Follow-Up

- Review whether `arenaInfoFor()` itself should be split into static standings,
  queue/match state, and ladder state so idle players do not serialize unchanged
  arena data every snapshot.

## Verification

- Run arena, arena-online, and snapshot tests.
- Run TypeScript and server build checks.
