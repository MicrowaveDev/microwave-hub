#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib.sh"

echo "Hub root: $HUB_ROOT"
printf "%-18s %-14s %-12s %-12s %s\n" "repo" "branch" "base" "state" "head"

print_repo_status() {
  local repo_path="$1"
  local label="$2"
  local branch="$(git_current_branch "$repo_path")"
  local head="$(git -C "$repo_path" rev-parse --short HEAD 2>/dev/null || echo "unknown")"
  local state="$(git_is_dirty "$repo_path")"
  local base_branch="-"

  if [[ "$label" == "hub" ]]; then
    base_branch="$(manifest_value hub defaultBranch 2>/dev/null || echo "-")"
  else
    base_branch="$(manifest_value "$label" baseBranch 2>/dev/null || echo "-")"
  fi

  printf "%-18s %-14s %-12s %-12s %s\n" "$label" "$branch" "$base_branch" "$state" "$head"
}

print_repo_status "$HUB_ROOT" "hub"

while read -r path; do
  print_repo_status "$HUB_ROOT/$path" "$path"
done < <(repo_specs)
