#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

section() {
  printf '\n== %s ==\n' "$1"
}

section "Generate i18n artifacts"
npm run i18n:gen

section "Verify committed generated artifacts"
git diff --exit-code -- \
  src/ui/i18n.resolved.generated \
  src/admin/i18n.resolved.generated \
  src/ui/i18n.status.summary.json

section "Malicious-code gate"
npm run security:gate

section "Tests"
npm test

section "Typecheck"
npx tsc --noEmit

section "Build headless environment"
npm run build:env

section "Build server"
npm run build:server

section "Build client"
npm run build

section "CI parity complete"
git status --short --branch
