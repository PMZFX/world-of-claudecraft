# Change Note: Code Map Refresh

Date: 2026-06-23

## Summary

Refreshed the living code map after the server performance commits so the human
navigation docs and generated artifacts match the current repository state.

## Files Checked

- `docs/code-map/map-index.md`
- `docs/code-map/entrypoints.md`
- `docs/code-map/data-flow-map.md`
- `docs/code-map/dependency-map.md`
- `docs/code-map/systems/networking.md`
- `docs/code-map/systems/save-load.md`
- `docs/code-map/update-procedure.md`
- `docs/design/2026-06-23-server-performance-baseline.md`

## Updates

- Added current performance change notes to the map index.
- Added `loadAccountSessionState()` to WebSocket join and online data-flow
  documentation.
- Documented the account-session helper in the save/load map because it owns
  account persistence fields used during session creation.
- Updated the maintenance procedure to call out that generated git-status
  artifacts can become stale immediately after a commit.
- Regenerated `docs/code-map/generated/`.

## Verification

- `scripts/update-code-map.sh`
- `bash -n scripts/update-code-map.sh`
- `git diff --check`

## Last Verified

2026-06-23
