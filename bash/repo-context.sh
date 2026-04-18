#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib.sh"

TARGETS=("${@:-hub}")

for alias in "${TARGETS[@]}"; do
  repo_path="$(resolve_repo "$alias")" || {
    echo "Unknown repo: $alias" >&2
    exit 1
  }
  label="$(resolve_repo_label "$alias")"

  echo "== $label =="
  echo "path: $repo_path"
  echo "branch: $(git_current_branch "$repo_path")"
  echo "worktree: $(git_is_dirty "$repo_path")"

  if [[ "$label" == "hub" ]]; then
    echo "base branch: $(manifest_value hub defaultBranch 2>/dev/null || echo "-")"
  else
    echo "base branch: $(manifest_value "$label" baseBranch 2>/dev/null || echo "-")"
    echo "install: $(manifest_value "$label" installCommand 2>/dev/null || echo "-")"
    echo "quick verify: $(manifest_value "$label" quickVerifyCommand 2>/dev/null || echo "-")"
    echo "full verify: $(manifest_value "$label" fullVerifyCommand 2>/dev/null || echo "-")"
  fi

  instructions_path="$(first_instruction_file "$repo_path" 2>/dev/null || true)"
  if [[ -n "${instructions_path:-}" ]]; then
    echo "instructions: $instructions_path"
  fi

  echo ""
done
