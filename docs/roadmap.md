# PMZFX Fork Roadmap

This roadmap is intentionally light until product direction is decided. Add
items here before implementation work so each feature can be tied to affected
systems and verification.

## Principles

- Keep upstream mergeability visible.
- Prefer small, reviewable changes.
- Use the code map before changing behavior.
- Write a design note for broad or high-risk changes.
- Update docs and tests with the code.

## Now

- Establish fork development process.
- Complete stabilization cleanup before adding feature work.
- Maintain the living code map.
- Keep local setup reproducible.
- Identify the first gameplay or platform changes.

## Next

Add candidate work here once selected.

| Idea | Goal | Affected Systems | Design Note | Status |
|---|---|---|---|---|
| Stabilization cleanup | Reduce setup friction and known warning noise before feature work | Build, docs, repo workflow | `docs/stabilization-backlog.md` | In progress |
| TBD | TBD | TBD | TBD | Backlog |

## Later

Longer-horizon ideas go here after they have a clear owner or direction.

| Idea | Goal | Affected Systems | Notes |
|---|---|---|---|
| TBD | TBD | TBD | TBD |

## Decision Log

Add dated decisions that shape the fork.

| Date | Decision | Reason |
|---|---|---|
| 2026-06-23 | Keep roadmap feature list empty until specific goals are chosen. | Avoid inventing fork direction before product decisions. |
| 2026-06-23 | Run a stabilization phase before gameplay feature work. | The fork already surfaced setup, CI visibility, and build-warning issues during baseline prep. |

Last verified: 2026-06-23
