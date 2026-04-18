#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib.sh"

TARGETS=("$@")

if [[ ${#TARGETS[@]} -eq 0 ]]; then
  while read -r repo_name; do
    TARGETS+=("$repo_name")
  done < <(repo_specs)
fi

printf "%-18s %-12s %-12s %-12s %s\n" "repo" "branch" "base" "worktree" "pointer_readiness"

for alias in "${TARGETS[@]}"; do
  repo_path="$(resolve_repo "$alias")" || {
    echo "Unknown repo: $alias" >&2
    exit 1
  }
  repo_name="$(basename "$repo_path")"
  branch="$(git_current_branch "$repo_path")"
  base_branch="$(manifest_value "$repo_name" baseBranch 2>/dev/null || echo "-")"
  worktree_state="$(git_is_dirty "$repo_path")"
  readiness="blocked"

  if [[ "$branch" == "$base_branch" && "$worktree_state" == "clean" ]]; then
    local_head="$(git -C "$repo_path" rev-parse HEAD 2>/dev/null || echo "")"
    remote_head="$(git -C "$repo_path" rev-parse "origin/$base_branch" 2>/dev/null || echo "")"

    if [[ -n "$local_head" && -n "$remote_head" && "$local_head" == "$remote_head" ]]; then
      readiness="ready"
    else
      readiness="base_branch_not_synced_local_origin_ref"
    fi
  elif [[ "$branch" != "$base_branch" ]]; then
    readiness="not_on_base_branch"
  elif [[ "$worktree_state" != "clean" ]]; then
    readiness="dirty_worktree"
  fi

  printf "%-18s %-12s %-12s %-12s %s\n" "$repo_name" "$branch" "$base_branch" "$worktree_state" "$readiness"
done
