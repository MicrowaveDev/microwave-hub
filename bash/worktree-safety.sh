#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HAS_ISSUES=0

echo "Hub root: $ROOT_DIR"

check_repo() {
  local repo_path="$1"
  local label="$2"
  local branch
  local status_output

  branch="$(git -C "$repo_path" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")"
  status_output="$(git -C "$repo_path" status --porcelain 2>/dev/null || true)"

  if [[ "$branch" == "HEAD" ]]; then
    echo "DETACHED HEAD: $label ($repo_path)"
    HAS_ISSUES=1
  fi

  if [[ -n "$status_output" ]]; then
    echo "DIRTY WORKTREE: $label ($repo_path)"
    HAS_ISSUES=1
  fi
}

check_repo "$ROOT_DIR" "hub"

while read -r path; do
  check_repo "$ROOT_DIR/$path" "$path"
done < <(git -C "$ROOT_DIR" config --file "$ROOT_DIR/.gitmodules" --get-regexp path | awk '{print $2}')

if [[ "$HAS_ISSUES" -ne 0 ]]; then
  echo "Worktree safety check failed."
  exit 1
fi

echo "All tracked repos are on named branches and currently clean."
