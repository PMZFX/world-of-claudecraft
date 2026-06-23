# PMZFX Fork Notes

This document tracks how the PMZFX fork should relate to upstream
`levy-street/world-of-claudecraft`.

## Current Fork Position

- Upstream repository: `https://github.com/levy-street/world-of-claudecraft`
- Fork repository: `https://github.com/PMZFX/world-of-claudecraft`
- Default branch: `main`
- Current development direction: not yet chosen.

## What We Preserve For Now

- Keep the upstream project structure.
- Keep the existing build, test, Docker, and deployment assumptions unless a
  planned fork change requires divergence.
- Keep the code map current as a development aid.
- Keep local machine overrides ignored.

## What We May Diverge On Later

Add decisions here once the roadmap is defined.

| Area | Decision | Status |
|---|---|---|
| Branding | TBD | Open |
| Gameplay systems | TBD | Open |
| Economy or Web3 behavior | TBD | Open |
| Deployment model | TBD | Open |
| Community/admin tooling | TBD | Open |

## Upstream Sync Policy

Before pulling upstream changes:

```bash
git fetch upstream
git log --oneline main..upstream/main
git diff --name-status main..upstream/main
```

Then:

1. Review changed files against `docs/code-map/map-index.md`.
2. Identify affected systems and feature traces.
3. Merge or rebase with care around local fork changes.
4. Run relevant verification.
5. Update affected code-map docs and add a change note.
6. Run `scripts/update-code-map.sh`.

## Local Remotes

Recommended local setup:

```text
origin   https://github.com/PMZFX/world-of-claudecraft.git
upstream https://github.com/levy-street/world-of-claudecraft.git
```

Disable accidental upstream pushes:

```bash
git remote set-url --push upstream DISABLED
```

## Commit Baselines

Recommended baseline sequence:

1. Code map and development process.
2. Roadmap and first design notes.
3. First implementation branch.

No baseline commit has been made by Codex unless explicitly requested.

Last verified: 2026-06-23
