#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib.sh"

FOUND=0

printf "%-18s %-16s %-12s %s\n" "repo" "branch" "base" "status"

while read -r repo_name; do
  repo_path="$HUB_ROOT/$repo_name"
  branch="$(git_current_branch "$repo_path")"
  base_branch="$(manifest_value "$repo_name" baseBranch 2>/dev/null || echo "")"

  if [[ -z "$base_branch" ]]; then
    continue
  fi

  if [[ "$branch" != "$base_branch" ]]; then
    FOUND=1
    status="needs_pr_or_merge"
    if [[ "$(git_is_dirty "$repo_path")" == "dirty" ]]; then
      status="working_branch_dirty"
    fi
    printf "%-18s %-16s %-12s %s\n" "$repo_name" "$branch" "$base_branch" "$status"
  fi
done < <(repo_specs)

if [[ "$FOUND" -eq 0 ]]; then
  echo "No submodules are currently on a non-base branch."
fi
