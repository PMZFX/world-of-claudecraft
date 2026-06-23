# Local Health Check

Use `scripts/local-health-check.sh` to quickly check whether the fork checkout
and local services are in a usable state.

## Command

```bash
scripts/local-health-check.sh
```

## What It Checks

- Current Git branch, status, and remotes.
- Node and npm versions.
- Docker Compose version and service status, if Docker is accessible.
- Game endpoint at `http://127.0.0.1:18787/`.
- Wiki endpoint at `http://127.0.0.1:18081/wiki/`.
- Listening local ports for game, wiki, and Postgres.
- Presence of the code map and update script.

## Environment Overrides

```bash
WOC_GAME_URL=http://127.0.0.1:18787/ \
WOC_WIKI_URL=http://127.0.0.1:18081/wiki/ \
WOC_POSTGRES_PORT=15433 \
scripts/local-health-check.sh
```

## Expected Local Ports

- Game: `18787`
- Wiki: `18081`
- Postgres: `15433`

## Notes

The script is diagnostic only. It does not start, stop, rebuild, or mutate
services. It should degrade gracefully when Docker is unavailable or the local
stack is stopped.

Last verified: 2026-06-23
