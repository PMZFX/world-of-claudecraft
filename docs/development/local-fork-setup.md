# Local Fork Setup

This document captures PMZFX fork setup notes for local development. Keep
machine-specific values out of tracked config unless they are safe defaults for
the fork.

## Repository Remotes

Expected local remotes:

```bash
git remote -v
```

```text
origin   https://github.com/PMZFX/world-of-claudecraft.git
upstream https://github.com/levy-street/world-of-claudecraft.git
```

`upstream` push should remain disabled locally:

```bash
git remote set-url --push upstream DISABLED
```

## Local Ports

This workstation uses nonstandard local ports to avoid collisions with other
projects:

- Game server: `http://127.0.0.1:18787/`
- Wiki container: `http://127.0.0.1:18081/wiki/`
- Postgres: `127.0.0.1:15433`

These are configured in ignored local files:

- `.env`
- `docker-compose.override.yml`

Do not commit machine-local secrets, passwords, or port overrides.

## First-Time Setup

```bash
npm ci
cp .env.example .env
```

Set a strong local `POSTGRES_PASSWORD` in `.env`. Keep `DATABASE_URL` in sync
with the local Postgres port.

For this workstation, `DATABASE_URL` should use port `15433`:

```text
postgres://eastbrook:<password>@127.0.0.1:15433/eastbrook
```

## Local Compose Override

The local ignored `docker-compose.override.yml` should map:

```yaml
services:
  postgres:
    ports: !override
      - "127.0.0.1:15433:5432"

  game:
    environment:
      WIKI_URL: http://localhost:18081/wiki/index.php/Main_Page
    ports: !override
      - "127.0.0.1:18787:8787"
    volumes: !override
      - ${EASTBROOK_MEDIA_DIR:-./media-cache}:/app/dist/media:z

  mediawiki:
    environment:
      MEDIAWIKI_SERVER: http://localhost:18081
    ports: !override
      - "127.0.0.1:18081:80"
```

The `:z` suffix is needed on SELinux hosts so the game container can write to
the media cache bind mount.

## Common Commands

Install dependencies:

```bash
npm ci
```

Build:

```bash
npm run build
```

Run offline browser dev:

```bash
npm run dev
```

Run full local instance:

```bash
docker compose up -d --build
```

Check services:

```bash
docker compose ps
curl -I http://127.0.0.1:18787/
curl -I http://127.0.0.1:18081/wiki/
```

Or run the local diagnostic script:

```bash
scripts/local-health-check.sh
```

Stop services:

```bash
docker compose down
```

## Pulling Upstream

```bash
git fetch upstream
git log --oneline main..upstream/main
git diff --stat main..upstream/main
```

Before merging upstream changes, read:

- `docs/code-map/update-procedure.md`
- `docs/fork-notes.md`
- `docs/development/upstream-sync.md`

After merging or rebasing upstream changes, refresh generated map artifacts:

```bash
scripts/update-code-map.sh
```

Last verified: 2026-06-23
