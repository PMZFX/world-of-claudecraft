# CI Parity

Use `scripts/ci-parity.sh` before merging fork changes that should satisfy the
same checks as `.github/workflows/ci.yml`.

## Command

```bash
scripts/ci-parity.sh
```

## What It Runs

- `npm run i18n:gen`
- committed generated artifact diff check
- `npm run security:gate`
- `npm test`
- `npx tsc --noEmit`
- `npm run build:env`
- `npm run build:server`
- `npm run build`

## Notes

The script assumes dependencies are already installed with `npm ci`. It does
not push, commit, install packages, or start Docker services.

If the command fails only because the sandbox blocks child processes, rerun it
outside the sandbox. The test suite uses child `node` and `git` processes for
generated artifact checks.

Last verified: 2026-06-23
