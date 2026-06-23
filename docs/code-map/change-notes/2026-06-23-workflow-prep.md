# Workflow Prep

Date: 2026-06-23

## Summary

Added workflow docs and a diagnostic local health-check script for continued
development on the PMZFX fork.

## Added

- `docs/development/branching-and-commits.md`
- `docs/development/upstream-sync.md`
- `docs/development/local-health-check.md`
- `scripts/local-health-check.sh`

## Code Map Impact

No source architecture changed. Generated code-map artifacts were refreshed so
the new docs and script appear in the mechanical indexes.

## Verification

- Run `scripts/update-code-map.sh`.
- Run `bash -n scripts/update-code-map.sh`.
- Run `bash -n scripts/local-health-check.sh`.
- Check new/touched docs and scripts for non-ASCII characters.
