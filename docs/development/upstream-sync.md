# Upstream Sync Procedure

Use this when bringing changes from `levy-street/world-of-claudecraft` into the
PMZFX fork.

## Preflight

```bash
git status --short --branch
git remote -v
git fetch upstream
```

Confirm:

- `origin` points to `https://github.com/PMZFX/world-of-claudecraft.git`.
- `upstream` fetch points to `https://github.com/levy-street/world-of-claudecraft.git`.
- `upstream` push is disabled.

## Inspect Upstream Changes

```bash
git log --oneline main..upstream/main
git diff --stat main..upstream/main
git diff --name-status main..upstream/main
```

Then map changed files to systems using:

- `docs/code-map/map-index.md`
- `docs/code-map/update-procedure.md`
- `docs/code-map/code-owners/source-folder-index.md`

## Integrate

For a clean fork with no local commits beyond docs/process, a merge commit keeps
history explicit:

```bash
git merge upstream/main
```

For feature branches, rebase only when it will not rewrite shared public history:

```bash
git rebase upstream/main
```

## After Integration

1. Resolve conflicts by trusting source over stale docs.
2. Update affected code-map system docs and feature traces.
3. Add a change note under `docs/code-map/change-notes/`.
4. Refresh generated artifacts:

   ```bash
   scripts/update-code-map.sh
   ```

5. Run relevant verification.
6. Push to the fork:

   ```bash
   git push origin main
   ```

## Conflict Hotspots

Expect extra care around:

- `src/main.ts`
- `src/sim/sim.ts`
- `server/game.ts`
- `server/main.ts`
- `server/db.ts`
- `src/render/renderer.ts`
- `src/ui/hud.ts`
- generated i18n and media manifest files
- fork docs under `docs/code-map/`, `docs/development/`, `docs/fork-notes.md`,
  and `docs/roadmap.md`

Last verified: 2026-06-23
