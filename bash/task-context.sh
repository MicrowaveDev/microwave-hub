#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib.sh"

SKIP_PULL=false
TARGETS=()

for arg in "$@"; do
  if [[ "$arg" == "--skip-pull" ]]; then
    SKIP_PULL=true
    continue
  fi
  TARGETS+=("$arg")
done

if [[ ${#TARGETS[@]} -eq 0 ]]; then
  TARGETS=("hub")
fi

if [[ "$SKIP_PULL" == false ]]; then
  if [[ "$(git_is_dirty "$HUB_ROOT")" == "dirty" ]]; then
    log "Hub worktree is dirty; skipping pull. Use --skip-pull or clean the hub first."
  else
    log "Syncing hub..."
    git -C "$HUB_ROOT" pull --rebase
    git -C "$HUB_ROOT" submodule update --init --recursive
  fi
fi

log "Running safety scan..."
"$HUB_ROOT/bash/check-worktree-safety.sh" --report-only

for target in "${TARGETS[@]}"; do
  "$HUB_ROOT/bash/repo-context.sh" "$target"
done
