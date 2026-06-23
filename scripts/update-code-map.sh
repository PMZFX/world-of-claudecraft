#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
OUT="$ROOT/docs/code-map/generated"
mkdir -p "$OUT"

ascii() {
  perl -CS -pe 's/[^\x00-\x7F]/?/g'
}

{
  echo "# Generated Code Map Artifacts"
  echo
  echo "Generated at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "Repository: $(basename "$ROOT")"
  echo
  echo "Do not edit files in this directory manually. Run scripts/update-code-map.sh."
} > "$OUT/README.md"

git -C "$ROOT" ls-files | ascii > "$OUT/file-list.txt"

{
  echo "# Source Tree"
  echo
  echo "Generated at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo
  {
    git -C "$ROOT" ls-files
    git -C "$ROOT" ls-files --others --exclude-standard
  } | sort -u | ascii
} > "$OUT/source-tree.txt"

{
  echo "# Recent Git Changes"
  echo
  echo "## Status"
  git -C "$ROOT" status --short | ascii || true
  echo
  echo "## Recent Commits"
  git -C "$ROOT" log --oneline -20 | ascii || true
} > "$OUT/recent-git-changes.txt"

{
  echo "# Symbol Index"
  echo
  echo "Generated from TypeScript and JavaScript source declarations."
  echo
  if command -v rg >/dev/null 2>&1; then
    (
      cd "$ROOT"
      rg -n "^(export )?(abstract )?(class|interface|type|enum|function|const|let|var) [A-Za-z0-9_]+" \
        src server headless scripts \
        -g '*.ts' -g '*.tsx' -g '*.js' -g '*.mjs'
    ) | ascii || true
  else
    (
      cd "$ROOT"
      grep -RInE "^(export )?(abstract )?(class|interface|type|enum|function|const|let|var) [A-Za-z0-9_]+" \
        src server headless scripts
    ) | ascii || true
  fi
} > "$OUT/symbol-index.txt"

{
  echo "# TODO and FIXME List"
  echo
  if command -v rg >/dev/null 2>&1; then
    (
      cd "$ROOT"
      rg -n "TODO|FIXME|HACK|XXX" \
        src server headless scripts tests docs \
        -g '!docs/code-map/generated/**'
    ) | ascii || true
  else
    (
      cd "$ROOT"
      grep -RInE "TODO|FIXME|HACK|XXX" \
        src server headless scripts tests docs
    ) | ascii || true
  fi
} > "$OUT/todo-fixme.txt"

{
  echo "# Dependency Graph"
  echo
  if [ -x "$ROOT/node_modules/.bin/madge" ]; then
    echo "madge is available. Run a graph command manually if needed."
  else
    echo "No dependency graph generated: madge is not installed in this project."
    echo
    echo "Suggested optional command if added later:"
    echo
    echo "npx madge src server headless --extensions ts,tsx,js,mjs --image docs/code-map/generated/dependency-graph.svg"
  fi
} > "$OUT/dependency-graph.txt"

echo "Updated code-map generated artifacts in $OUT"
