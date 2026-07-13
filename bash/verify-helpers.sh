#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

python3 -m json.tool "$ROOT_DIR/submodules.manifest.json" >/dev/null
python3 -m json.tool "$ROOT_DIR/package.json" >/dev/null

"$ROOT_DIR/bash/status-all.sh" >/dev/null
"$ROOT_DIR/bash/check-worktree-safety.sh" --report-only >/dev/null
"$ROOT_DIR/bash/repo-context.sh" hub >/dev/null
"$ROOT_DIR/bash/task-context.sh" --skip-pull hub >/dev/null
"$ROOT_DIR/bash/task-context.sh" --json agent-viewer \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const x=JSON.parse(s);if(!x.complete||x.truncated||x.targets[0].name!=="agent-viewer")process.exit(1)})'
"$ROOT_DIR/bash/task-context.sh" --json artist-helper \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const x=JSON.parse(s);const t=x.targets[0];if(!t.workflowLoaded||!t.instruction?.complete||!t.instruction.content.includes("# Artist Helper Agent Guide"))process.exit(1)})'
node "$ROOT_DIR/bash/verify-instruction-contracts.mjs" >/dev/null
node "$ROOT_DIR/bash/test-capture-command-output.mjs" >/dev/null
node --test "$ROOT_DIR/bash/test-agent-flow-state.mjs" >/dev/null
node --test "$ROOT_DIR/bash/test-context-strategy-comparison.mjs" >/dev/null
route="$(node "$ROOT_DIR/bash/resolve-agent-route.mjs" --prompt 'Run the production image-description queue for July')"
[[ "$route" == "npm run task:context -- artist-helper" ]]
route="$(node "$ROOT_DIR/bash/resolve-agent-route.mjs" --prompt 'Refactor a small parser')"
[[ "$route" == "no-exact-route" ]]
printf '%s' '{"prompt":"Run the production image-description queue","actions":[{"command":"npm run task:context -- artist-helper"}]}' \
  | node "$ROOT_DIR/bash/validate-agent-route-trace.mjs" >/dev/null
if printf '%s' '{"prompt":"Run the production image-description queue","actions":[{"command":"cat package.json"},{"command":"npm run task:context -- artist-helper"}]}' \
  | node "$ROOT_DIR/bash/validate-agent-route-trace.mjs" >/dev/null 2>&1; then
  echo "Expected route trace validation to reject a pre-route package probe." >&2
  exit 1
fi
"bash" -n "$ROOT_DIR/bash/verify-backpack-core-consumers.sh"
"$ROOT_DIR/bash/find-in-repos.sh" --files 'AGENTS\.md$' hub >/dev/null || true
find_preview="$($ROOT_DIR/bash/find-in-repos.sh --limit 2 'task:context' hub)"
[[ "$(printf '%s\n' "$find_preview" | wc -l | tr -d ' ')" -le 4 ]]
[[ "$find_preview" == *"showing="* ]]
"$ROOT_DIR/bash/pending-prs.sh" >/dev/null
"$ROOT_DIR/bash/prepare-pointer-updates.sh" >/dev/null
"$ROOT_DIR/bash/shrink-screenshots.sh" --help >/dev/null 2>&1 || true
printf '## Source of truth\n\nSmoke.\n\n## Scope\n\n- Check issue body validation.\n\n## Verification\n\n- Helper smoke.\n' \
  | "$ROOT_DIR/bash/gh-safe.sh" check --kind issue >/dev/null
printf '## Summary\n\n- Closes #1.\n\n## Verification\n\n- Helper smoke.\n' \
  | "$ROOT_DIR/bash/gh-safe.sh" check --kind pr >/dev/null
if printf '## Summary\\n\\n- Closes #1.\\n\\n## Verification\\n\\n- Bad smoke.\n' \
  | "$ROOT_DIR/bash/gh-safe.sh" check --kind pr >/dev/null 2>&1; then
  echo "Expected gh-safe to reject literal escaped newlines." >&2
  exit 1
fi

echo "Helper verification passed."
