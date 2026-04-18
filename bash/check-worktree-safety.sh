#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib.sh"

REPORT_ONLY=false
HAS_ISSUES=0

for arg in "$@"; do
  if [[ "$arg" == "--report-only" ]]; then
    REPORT_ONLY=true
  fi
done

echo "Hub root: $HUB_ROOT"

check_repo() {
  local repo_path="$1"
  local label="$2"
  local branch="$(git_current_branch "$repo_path")"
  local worktree_state="$(git_is_dirty "$repo_path")"

  if [[ "$branch" == "HEAD" ]]; then
    echo "DETACHED HEAD: $label ($repo_path)"
    HAS_ISSUES=1
  fi

  if [[ "$worktree_state" == "dirty" ]]; then
    echo "DIRTY WORKTREE: $label ($repo_path)"
    HAS_ISSUES=1
  fi
}

check_repo "$HUB_ROOT" "hub"

while read -r path; do
  check_repo "$HUB_ROOT/$path" "$path"
done < <(repo_specs)

if [[ "$HAS_ISSUES" -ne 0 ]]; then
  echo "Worktree safety check failed."
  if [[ "$REPORT_ONLY" == true ]]; then
    exit 0
  fi
  exit 1
fi

echo "All tracked repos are on named branches and currently clean."
