#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib.sh"

MODE="content"

if [[ "${1:-}" == "--files" ]]; then
  MODE="files"
  shift
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 [--files] <pattern> [repo ...]" >&2
  exit 1
fi

PATTERN="$1"
shift

TARGETS=()

if [[ $# -eq 0 ]]; then
  TARGETS+=("$HUB_ROOT")
  while read -r path; do
    TARGETS+=("$HUB_ROOT/$path")
  done < <(repo_specs)
else
  for alias in "$@"; do
    TARGETS+=("$(resolve_repo "$alias")")
  done
fi

if [[ "$MODE" == "content" ]]; then
  rg -n "$PATTERN" "${TARGETS[@]}" || true
else
  rg --files "${TARGETS[@]}" | rg "$PATTERN" || true
fi
