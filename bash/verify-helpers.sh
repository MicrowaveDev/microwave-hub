#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

python3 -m json.tool "$ROOT_DIR/submodules.manifest.json" >/dev/null
python3 -m json.tool "$ROOT_DIR/package.json" >/dev/null

"$ROOT_DIR/bash/status-all.sh" >/dev/null
"$ROOT_DIR/bash/check-worktree-safety.sh" --report-only >/dev/null
"$ROOT_DIR/bash/repo-context.sh" hub >/dev/null
"$ROOT_DIR/bash/task-context.sh" --skip-pull hub >/dev/null
"$ROOT_DIR/bash/find-in-repos.sh" --files 'AGENTS\.md$' hub >/dev/null || true
"$ROOT_DIR/bash/pending-prs.sh" >/dev/null
"$ROOT_DIR/bash/prepare-pointer-updates.sh" >/dev/null

echo "Helper verification passed."
