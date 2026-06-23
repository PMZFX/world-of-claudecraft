#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

GAME_URL="${WOC_GAME_URL:-http://127.0.0.1:18787/}"
WIKI_URL="${WOC_WIKI_URL:-http://127.0.0.1:18081/wiki/}"
POSTGRES_PORT="${WOC_POSTGRES_PORT:-15433}"

section() {
  printf '\n== %s ==\n' "$1"
}

check_cmd() {
  command -v "$1" >/dev/null 2>&1
}

section "Git"
git status --short --branch
printf '\nRemotes:\n'
git remote -v

section "Node"
if check_cmd node; then node --version; else echo "node not found"; fi
if check_cmd npm; then npm --version; else echo "npm not found"; fi

section "Docker Compose"
if check_cmd docker && docker compose version >/dev/null 2>&1; then
  docker compose version
  docker compose ps
else
  echo "docker compose unavailable or Docker daemon not accessible"
fi

section "HTTP"
if check_cmd curl; then
  echo "Game: $GAME_URL"
  curl -fsSI "$GAME_URL" | sed -n '1,6p' || echo "game endpoint not reachable"
  echo
  echo "Wiki: $WIKI_URL"
  curl -fsSI "$WIKI_URL" | sed -n '1,8p' || echo "wiki endpoint not reachable"
else
  echo "curl not found"
fi

section "Ports"
if check_cmd ss; then
  ss -ltn | awk -v pg=":$POSTGRES_PORT" -v game=":18787" -v wiki=":18081" '$4 ~ pg || $4 ~ game || $4 ~ wiki { print }'
else
  echo "ss not found"
fi

section "Code Map"
test -f docs/code-map/map-index.md && echo "code map present" || echo "code map missing"
test -x scripts/update-code-map.sh && echo "update-code-map script executable" || echo "update-code-map script missing or not executable"
