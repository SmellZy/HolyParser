#!/bin/sh

set -eu

mode="${1:---check}"

if [ "$mode" != "--check" ] && [ "$mode" != "--write" ]; then
  echo "Usage: scripts/format.sh [--check|--write]" >&2
  exit 2
fi

find apps packages .github docs/adr \
  -type f \
  \( \
    -name '*.ts' -o \
    -name '*.tsx' -o \
    -name '*.json' -o \
    -name '*.css' -o \
    -name '*.mjs' -o \
    -name '*.yaml' -o \
    -name '*.yml' -o \
    -name '*.md' \
  \) \
  -not -path '*/node_modules/*' \
  -not -path '*/.next/*' \
  -print0 |
  xargs -0 -n 1 node node_modules/prettier/bin/prettier.cjs "$mode"

node node_modules/prettier/bin/prettier.cjs "$mode" \
  compose.yaml \
  package.json \
  README.md \
  docs/LOCAL_DEVELOPMENT.md
