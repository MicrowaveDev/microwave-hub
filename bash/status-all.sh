#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Hub root: $ROOT_DIR"
printf "%-18s %-14s %-12s %s\n" "repo" "branch" "state" "head"

print_repo_status() {
  local repo_path="$1"
  local label="$2"
  local branch
  local head
  local state

  branch="$(git -C "$repo_path" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")"
  head="$(git -C "$repo_path" rev-parse --short HEAD 2>/dev/null || echo "unknown")"

  if [[ -n "$(git -C "$repo_path" status --porcelain 2>/dev/null)" ]]; then
    state="dirty"
  else
    state="clean"
  fi

  printf "%-18s %-14s %-12s %s\n" "$label" "$branch" "$state" "$head"
}

print_repo_status "$ROOT_DIR" "hub"

while read -r path; do
  print_repo_status "$ROOT_DIR/$path" "$path"
done < <(git -C "$ROOT_DIR" config --file "$ROOT_DIR/.gitmodules" --get-regexp path | awk '{print $2}')
