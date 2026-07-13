#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib.sh"

SKIP_PULL=false
JSON_OUTPUT=false
TARGETS=()

for arg in "$@"; do
  if [[ "$arg" == "--skip-pull" ]]; then
    SKIP_PULL=true
    continue
  fi
  if [[ "$arg" == "--json" ]]; then
    JSON_OUTPUT=true
    SKIP_PULL=true
    continue
  fi
  TARGETS+=("$arg")
done

if [[ ${#TARGETS[@]} -eq 0 ]]; then
  TARGETS=("hub")
fi

if [[ "$JSON_OUTPUT" == true ]]; then
  exec node "$HUB_ROOT/bash/task-context-json.mjs" "${TARGETS[@]}"
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
  repo_path="$(resolve_repo "$target")"
  instructions_path="$(first_instruction_file "$repo_path" 2>/dev/null || true)"
  if [[ -n "${instructions_path:-}" ]]; then
    bytes="$(wc -c < "$instructions_path" | tr -d ' ')"
    sha="$(shasum -a 256 "$instructions_path" | awk '{print $1}')"
    echo "context-contract: sourceComplete=true helperTruncated=false workflowLoaded=true instructionsLoaded=$instructions_path bytes=$bytes sha256=$sha endMarker=END_LOADED_INSTRUCTIONS"
    echo "--- BEGIN LOADED INSTRUCTIONS: $instructions_path ---"
    sed -n '1,$p' "$instructions_path"
    echo "--- END_LOADED_INSTRUCTIONS: $instructions_path ---"
  else
    echo "context-contract: sourceComplete=true helperTruncated=false workflowLoaded=false instructionsLoaded=-"
  fi
done
