# Branching and Commits

Use this for PMZFX fork work unless a specific task needs a different pattern.

## Branch Names

- `docs/<topic>` for documentation-only changes.
- `feature/<topic>` for new behavior.
- `fix/<topic>` for bug fixes.
- `experiment/<topic>` for throwaway or exploratory work.
- `chore/<topic>` for maintenance without behavior changes.

Examples:

```text
docs/code-map-baseline
feature/new-zone-hook
fix/inventory-save-regression
experiment/combat-tuning-pass
chore/update-dependencies
```

## Commit Style

Follow the upstream convention from `AGENTS.md`:

```text
<type>(scope): <short description>
```

Examples:

```text
docs(code-map): add fork development workflow
fix(server): guard stale websocket input
feature(combat): add first-pass threat tuning
```

Use a detailed body when the change affects architecture, data flow,
persistence, or verification.

## Commit Boundaries

Prefer commits that can be reviewed independently:

- Code map or docs baseline.
- One feature or one bug fix.
- Tests that directly support the change.
- Generated artifacts paired with the source change that requires them.

Avoid mixing unrelated source edits, generated artifacts, and local environment
changes in one commit.

## Before Committing

1. Run `git status --short`.
2. Confirm no local-only files are staged.
3. Run the relevant verification.
4. Run `scripts/update-code-map.sh` when docs/generated map artifacts need a
   refresh.
5. Use `docs/development/pr-checklist.md`.

Last verified: 2026-06-23
