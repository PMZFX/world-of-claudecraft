# Change Note: Self Snapshot Fast Paths

Date: 2026-06-23

## Summary

- Added fast paths in `GameServer.selfWireJson()` for empty or null fields that
  were already sent to the client.
- Repeated snapshots now avoid allocating/spreading/stringifying unchanged
  absence for inventory, buyback, equipment, quest log, completed quests,
  milestones, cooldowns, party, markers, trade, duel, and market state.
- Snapshot wire semantics are unchanged: first snapshots still carry full self
  state, omitted fields still mean unchanged, and forced quest resync still
  sends empty quest arrays when needed.

## Follow-Up

- `arenaInfoFor()` remains a larger hotspot candidate because it builds ratings
  and online ladders from the snapshot path. Consider event-driven or cached
  arena self-state in a later pass.

## Verification

- Run snapshot, arena, market, and talent tests.
- Run TypeScript and server build checks.
