# Pull Request Checklist

Use this checklist for fork changes before opening or merging a PR.

## Scope

- [ ] The change has a clear goal.
- [ ] The branch name matches the change type, for example `feature/...`,
  `fix/...`, `docs/...`, or `experiment/...`.
- [ ] Unrelated edits are excluded.

## Code Map

- [ ] Read `docs/code-map/map-index.md`.
- [ ] Read affected subsystem docs under `docs/code-map/systems/`.
- [ ] Read affected feature traces under `docs/code-map/features/`.
- [ ] Updated affected code-map docs if architecture, behavior, data flow,
  persistence, or entry points changed.
- [ ] Ran `scripts/update-code-map.sh` if generated map artifacts should change.
- [ ] Added a code-map change note for broad architecture or subsystem changes.

## Risk Checks

- [ ] Checked `docs/development/high-risk-change-checklist.md` if touching high
  risk files.
- [ ] Considered save/load compatibility for serialized character or DB changes.
- [ ] Considered online/offline parity if touching simulation or client world.
- [ ] Considered mobile, accessibility, and localization if touching UI.
- [ ] Considered performance and memory if touching renderer or assets.

## Verification

- [ ] Ran the smallest relevant test/build command set.
- [ ] Documented any skipped verification and why.
- [ ] For UI changes, checked keyboard use and mobile layout where relevant.
- [ ] For online changes, tested or reasoned through both client and server sides.
- [ ] For content changes, regenerated guide/content artifacts if needed.

## Documentation

- [ ] Updated user-facing docs if commands, setup, or behavior changed.
- [ ] Added or updated a design note under `docs/design/` for major changes.
- [ ] Kept generated files separate from human-maintained docs.

Last verified: 2026-06-23
