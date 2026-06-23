# World of ClaudeCraft Code Map

This directory is a living navigation layer for the World of ClaudeCraft codebase.
It answers where systems live, what they control, what depends on them, and how to
keep the map current as code changes.

This map is not a replacement for source code. When docs and source disagree,
trust the source and update the affected docs in the same change.

## Start Here

- [Map Index](map-index.md)
- [Build and Run](build-and-run.md)
- [Entrypoints](entrypoints.md)
- [Dependency Map](dependency-map.md)
- [Source Folder Index](code-owners/source-folder-index.md)
- [Update Procedure](update-procedure.md)
- [Fork Notes](../fork-notes.md)
- [Local Fork Setup](../development/local-fork-setup.md)
- [Roadmap](../roadmap.md)

## Map Rules

- Human-maintained docs live under `systems/`, `features/`, `code-owners/`, and
  `change-notes/`.
- Mechanical artifacts live under `generated/` and are refreshed by
  `scripts/update-code-map.sh`.
- Do not manually edit files under `docs/code-map/generated/`.
- Give systems and features stable IDs so references survive file renames.
- Keep subsystem docs small. Document entry points, data flow, dependencies,
  risks, and verification, not every helper function.

## Fork Development Docs

- Use `docs/fork-notes.md` for upstream relationship and divergence decisions.
- Use `docs/roadmap.md` for selected fork work.
- Use `docs/development/branching-and-commits.md` for branch and commit shape.
- Use `docs/development/upstream-sync.md` when bringing in upstream changes.
- Use `docs/development/local-health-check.md` to verify local services quickly.
- Use `docs/development/pr-checklist.md` before publishing changes.
- Use `docs/development/high-risk-change-checklist.md` before touching central
  files or cross-cutting systems.

## Initial Scope

This first pass maps the main runtime surfaces:

- Browser client from `src/main.ts`
- Authoritative multiplayer server from `server/main.ts`
- Shared deterministic simulation in `src/sim/`
- Three.js renderer in `src/render/`
- Vanilla DOM UI in `src/ui/`
- Headless RL environment in `headless/`

Last verified: 2026-06-23
