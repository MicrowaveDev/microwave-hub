#!/usr/bin/env bash
set -euo pipefail

HUB_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST_PATH="$HUB_ROOT/submodules.manifest.json"

log() {
  echo "[$(basename "$0" .sh)] $*"
}

hub_root_dir() {
  echo "$HUB_ROOT"
}

repo_specs() {
  git -C "$HUB_ROOT" config --file "$HUB_ROOT/.gitmodules" --get-regexp path | awk '{print $2}'
}

git_current_branch() {
  local repo_path="${1:-.}"
  git -C "$repo_path" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown"
}

git_is_dirty() {
  local repo_path="${1:-.}"
  if [[ -n "$(git -C "$repo_path" status --porcelain 2>/dev/null)" ]]; then
    echo "dirty"
  else
    echo "clean"
  fi
}

resolve_repo() {
  local alias="${1:-hub}"

  if [[ "$alias" == "hub" ]]; then
    echo "$HUB_ROOT"
    return 0
  fi

  while read -r path; do
    if [[ "$alias" == "$path" || "$alias" == "$(basename "$path")" ]]; then
      echo "$HUB_ROOT/$path"
      return 0
    fi
  done < <(repo_specs)

  if [[ -d "$HUB_ROOT/$alias" ]]; then
    echo "$HUB_ROOT/$alias"
    return 0
  fi

  return 1
}

resolve_repo_label() {
  local alias="${1:-hub}"

  if [[ "$alias" == "hub" ]]; then
    echo "hub"
    return 0
  fi

  echo "$(basename "$alias")"
}

manifest_value() {
  local repo_name="$1"
  local field="$2"

  python3 - "$MANIFEST_PATH" "$repo_name" "$field" <<'PY'
import json
import sys

manifest_path, repo_name, field = sys.argv[1:]
with open(manifest_path, "r", encoding="utf-8") as fh:
    data = json.load(fh)

if repo_name == "hub":
    value = data.get("hub", {}).get(field)
else:
    value = None
    for repo in data.get("submodules", []):
        if repo.get("name") == repo_name or repo.get("path") == repo_name:
            value = repo.get(field)
            break

if value is None:
    sys.exit(1)

if isinstance(value, list):
    for item in value:
        print(item)
else:
    print(value)
PY
}

first_instruction_file() {
  local repo_path="$1"

  if [[ -f "$repo_path/AGENTS.md" ]]; then
    echo "$repo_path/AGENTS.md"
    return 0
  fi

  if [[ -f "$repo_path/CLAUDE.md" ]]; then
    echo "$repo_path/CLAUDE.md"
    return 0
  fi

  return 1
}

ensure_clean_repo() {
  local repo_path="$1"

  if [[ "$(git_is_dirty "$repo_path")" == "dirty" ]]; then
    log "ERROR: $repo_path has uncommitted changes."
    exit 1
  fi
}
