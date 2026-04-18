# Multi-Repo Hub: Helper Scripts Blueprint

A reference for building helper scripts in any git-submodule hub. Describes the helper categories, their responsibilities, safety checks, implementation patterns, and shell code snippets you can adapt.

---

## Architecture Overview

A hub is a parent git repo that tracks child repos as submodules. The hub stores a pointer (commit SHA) for each submodule. Helpers automate the recurring workflows:

```
hub/
├── bash/
│   ├── lib.sh                      # shared functions, sourced by all scripts
│   ├── push-submodule.sh           # commit + push a submodule + update hub pointer
│   ├── update-submodule-pointer.sh # move hub pointer after PR merge
│   ├── personal-branch.sh          # create/reuse personal working branch
│   ├── pending-prs.sh              # list branches needing PRs
│   ├── prepare-pointer-updates.sh  # pre-flight pointer readiness check
│   ├── status-all.sh               # workspace-wide git status
│   ├── check-worktree-safety.sh    # detect unsafe workspace states
│   ├── clean-worktrees.sh          # clean orphaned worktrees
│   ├── task-context.sh             # start-of-task sync + safety + context
│   ├── repo-context.sh             # branch/worktree/instructions for a repo
│   ├── find-in-repos.sh            # cross-repo content/file search
│   └── kill-port.sh                # kill stale dev server on a port
├── package.json                    # yarn aliases for all helpers
└── CLAUDE.md                       # agent instructions
```

All scripts use `set -euo pipefail` and source `lib.sh` for shared functions.

---

## 1. Shared Library (`lib.sh`)

Every other script sources this file. It provides functions that scripts use instead of reimplementing common patterns.

### Functions to implement

| Function | Purpose | Example |
|----------|---------|---------|
| `hub_root_dir` | Return the absolute path of the hub root | `git rev-parse --show-toplevel` |
| `log` | Standardized logging with `[script-name]` prefix | `echo "[push-submodule] $*"` |
| `git_current_branch` | Return current branch name, or `DETACHED` | `git branch --show-current \|\| echo DETACHED` |
| `git_is_dirty` | Return `dirty` or `clean` | Check `git status --porcelain` output |
| `log_context` | Log cwd, hub root, target repo, branch, clean/dirty before any mutation | Combines the above |
| `repo_specs` | Return a list of all submodule name→path mappings | Hardcoded or parsed from `.gitmodules` |
| `resolve_repo <alias>` | Convert a shorthand alias to an absolute path | Map `ui` → `./my-frontend` |
| `ensure_clean_repo` | Exit with error if the repo has uncommitted changes | Gate for push/pointer scripts |
| `ensure_on_branch <branch>` | Exit with error if not on the expected branch | Gate for pointer updates |
| `derive_user_slug` | Derive a branch-safe username from `git config user.name` | Lowercase, replace spaces with dashes |

### Shell pattern

```bash
#!/usr/bin/env bash
set -euo pipefail

# Resolve hub root regardless of where the script is called from
HUB_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() { echo "[$(basename "$0" .sh)] $*"; }

git_current_branch() {
  git branch --show-current 2>/dev/null || echo "DETACHED"
}

git_is_dirty() {
  if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    echo "dirty"
  else
    echo "clean"
  fi
}

ensure_clean_repo() {
  local repo_path="$1"
  if [ "$(cd "$repo_path" && git_is_dirty)" = "dirty" ]; then
    log "ERROR: $repo_path has uncommitted changes. Stash or commit first."
    exit 1
  fi
}

derive_user_slug() {
  git config user.name | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/--*/-/g'
}

resolve_repo() {
  local alias="$1"
  # Add your alias→path mapping here
  case "$alias" in
    ui|frontend)  echo "$HUB_ROOT/my-frontend" ;;
    api|backend)  echo "$HUB_ROOT/my-backend" ;;
    docs)         echo "$HUB_ROOT/my-docs" ;;
    *)            echo "$HUB_ROOT/$alias" ;;
  esac
}
```

---

## 2. Push Submodule (`push-submodule.sh`)

The most important helper. Enforces branch policy, pushes the submodule, and optionally updates the hub pointer.

### Responsibilities

1. Validate the submodule exists and is a clean git repo
2. Commit staged changes with the provided message (if any uncommitted changes)
3. Determine branch policy for this repo:
   - **Personal-branch repos**: switch to `<user-slug>/dev`, push, print compare link, do NOT update hub pointer
   - **Shared-branch repos**: push current branch, update hub pointer automatically
4. After push on personal-branch repos: fetch base branch, rebase personal branch onto it

### Safety checks

- Refuse if submodule directory doesn't exist or isn't a git repo
- Refuse if worktree is dirty with files outside the intended commit
- Refuse if detached HEAD
- Refuse if `git config user.name` is not configured
- Refuse repos that use a different push flow (e.g., task-branch repos)

### Shell pattern

```bash
#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"

REPO="$1"
MESSAGE="${2:-}"
REPO_PATH="$(resolve_repo "$REPO")"

[ -d "$REPO_PATH/.git" ] || { log "ERROR: $REPO_PATH is not a git repo"; exit 1; }

cd "$REPO_PATH"
log "target=$REPO branch=$(git_current_branch) worktree=$(git_is_dirty)"

ensure_clean_repo "$REPO_PATH"

# Determine branch policy
BASE_BRANCH="main"  # or read from config
PERSONAL_BRANCH_REPOS="my-docs my-backend"  # repos using personal branches

if echo "$PERSONAL_BRANCH_REPOS" | grep -qw "$REPO"; then
  # Personal branch flow
  USER_SLUG="$(derive_user_slug)"
  BRANCH="${USER_SLUG}/dev"

  git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH"
  git push -u origin "$BRANCH"

  log "Pushed $BRANCH"
  log "Compare: https://github.com/YOUR_ORG/$REPO/compare/$BASE_BRANCH...$BRANCH"
  log "Pointer update waits until PR is merged."

  # Rebase onto base branch to stay current
  git fetch origin "$BASE_BRANCH"
  git rebase "origin/$BASE_BRANCH"
else
  # Shared branch flow
  BRANCH="$(git_current_branch)"
  git push origin "$BRANCH"
  log "Pushed $BRANCH"

  # Update hub pointer
  cd "$HUB_ROOT"
  bash bash/update-submodule-pointer.sh "$REPO"
fi
```

---

## 3. Update Submodule Pointer (`update-submodule-pointer.sh`)

Moves the hub's submodule pointer to the latest base branch commit. Batches multiple repos into one hub commit.

### Responsibilities

1. For each requested repo:
   - Fetch origin
   - Validate HEAD is on the base branch (refuse if on a feature/personal branch)
   - If on a fully-merged branch: auto-switch to base branch
   - If repo has nested submodules: validate nested pointers
2. Stage all changed pointers
3. Create one hub commit
4. Push hub

### Safety checks

- Refuse if submodule is on a working branch that isn't merged to base
- Refuse if nested submodule validation fails
- Refuse if no pointer changes detected (nothing to commit)

### Shell pattern

```bash
#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"

REPOS=("$@")
[ ${#REPOS[@]} -gt 0 ] || { log "Usage: $0 <repo> [repo ...]"; exit 1; }

CHANGED=0
for REPO in "${REPOS[@]}"; do
  REPO_PATH="$(resolve_repo "$REPO")"
  cd "$REPO_PATH"

  BASE_BRANCH="main"  # or look up per-repo config
  CURRENT="$(git_current_branch)"

  git fetch origin "$BASE_BRANCH" --quiet

  if [ "$CURRENT" != "$BASE_BRANCH" ]; then
    # Check if current branch is fully merged into base
    UNMERGED="$(git log --oneline "origin/$BASE_BRANCH..$CURRENT" | wc -l | tr -d ' ')"
    if [ "$UNMERGED" -gt 0 ]; then
      log "ERROR: $REPO is on '$CURRENT' with $UNMERGED unmerged commits. Merge to $BASE_BRANCH first."
      exit 1
    fi
    # Safe to switch — branch is fully contained in base
    git checkout "$BASE_BRANCH"
    git pull --rebase origin "$BASE_BRANCH"
  fi

  # Validate nested submodules if any
  if [ -f .gitmodules ]; then
    git submodule update --init --recursive
    # Add nested pointer validation here
  fi

  cd "$HUB_ROOT"
  git add "$REPO_PATH"
  CHANGED=1
  log "Staged pointer for $REPO ($(cd "$REPO_PATH" && git rev-parse --short HEAD))"
done

if [ "$CHANGED" -eq 0 ]; then
  log "No pointer changes detected"
  exit 0
fi

# One commit for all pointer updates
REPO_LIST="$(printf '%s, ' "${REPOS[@]}" | sed 's/, $//')"
git commit -m "Update submodule pointers: $REPO_LIST"
git pull --rebase origin main
git push origin main
log "Hub pointer updated and pushed"
```

---

## 4. Personal Branch (`personal-branch.sh`)

Creates or switches to a long-lived personal working branch and rebases it onto the base branch.

### Why

Instead of creating a new branch per task (which fragments history and creates merge noise), each developer reuses one personal branch (`<user>/dev`) and rebases it frequently.

### Shell pattern

```bash
#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"

REPO="$1"
BASE="${2:-main}"
SUFFIX="${3:-dev}"
REPO_PATH="$(resolve_repo "$REPO")"

cd "$REPO_PATH"
ensure_clean_repo "$REPO_PATH"

USER_SLUG="$(derive_user_slug)"
BRANCH="${USER_SLUG}/${SUFFIX}"

git fetch origin "$BASE" --quiet

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
else
  git checkout -b "$BRANCH" "origin/$BASE"
fi

git rebase "origin/$BASE"

# Set upstream if remote branch exists
if git ls-remote --heads origin "$BRANCH" | grep -q "$BRANCH"; then
  git branch --set-upstream-to="origin/$BRANCH"
fi

log "Ready on $REPO:$BRANCH (rebased onto $BASE)"
```

---

## 5. Pending PRs (`pending-prs.sh`)

Lists submodule branches that have commits ahead of their base branch — work that needs a PR.

### Shell pattern

```bash
#!/usr/bin/env bash
set -eo pipefail
source "$(dirname "$0")/lib.sh"

USER_SLUG="$(derive_user_slug)"
FOUND=0

while IFS='|' read -r LABEL PATH BASE_BRANCH; do
  [ -d "$PATH/.git" ] || continue
  cd "$PATH"
  git fetch origin --quiet 2>/dev/null || continue

  CURRENT="$(git_current_branch)"

  # Check current branch
  if [ "$CURRENT" != "$BASE_BRANCH" ]; then
    AHEAD="$(git rev-list --count "origin/$BASE_BRANCH..$CURRENT" 2>/dev/null || echo 0)"
    if [ "$AHEAD" -gt 0 ]; then
      echo "  $LABEL: $CURRENT ($AHEAD commits ahead of $BASE_BRANCH)"
      echo "    https://github.com/YOUR_ORG/$LABEL/compare/$BASE_BRANCH...$CURRENT"
      FOUND=1
    fi
  fi

  # Check personal branch on remote (if different from current)
  PERSONAL="${USER_SLUG}/dev"
  if [ "$PERSONAL" != "$CURRENT" ] && git ls-remote --heads origin "$PERSONAL" | grep -q "$PERSONAL"; then
    AHEAD="$(git rev-list --count "origin/$BASE_BRANCH..origin/$PERSONAL" 2>/dev/null || echo 0)"
    if [ "$AHEAD" -gt 0 ]; then
      echo "  $LABEL: $PERSONAL ($AHEAD commits ahead of $BASE_BRANCH, remote only)"
      echo "    https://github.com/YOUR_ORG/$LABEL/compare/$BASE_BRANCH...$PERSONAL"
      FOUND=1
    fi
  fi
done <<< "$(repo_specs)"

[ "$FOUND" -gt 0 ] || echo "No pending PRs found."
```

---

## 6. Status All (`status-all.sh`)

One command to see branch + dirty state across the entire workspace.

### Shell pattern

```bash
#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"

VERBOSE="${1:-}"

while IFS='|' read -r LABEL PATH _; do
  [ -d "$PATH/.git" ] || continue
  echo "── $LABEL ──"
  echo "  path: $PATH"
  cd "$PATH"
  echo "  $(git status -sb | head -1)"
  if [ "$VERBOSE" = "--verbose" ] || [ "$VERBOSE" = "-v" ]; then
    echo "  fetch: $(git remote get-url origin 2>/dev/null || echo 'N/A')"
  fi
  echo ""
done <<< "$(repo_specs)"
```

---

## 7. Worktree Safety Check (`check-worktree-safety.sh`)

Scans all repos for states that could cause data loss or confusing behavior during multi-repo operations.

### What it detects

| State | Risk |
|-------|------|
| Detached HEAD | Commits land on no branch; easy to lose |
| Dirty worktree | Uncommitted changes block rebase/checkout |
| Active rebase/merge/cherry-pick | Repo is mid-operation; don't start new work |
| Unmerged conflicts | Files need manual resolution |
| Multiple linked worktrees | Concurrent checkouts can cause confusion |
| Prunable worktrees | Orphaned metadata from deleted worktrees |

### Shell pattern

```bash
#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"

ISSUES=0
REPORT_ONLY=false
[ "${1:-}" = "--report-only" ] && REPORT_ONLY=true

while IFS='|' read -r LABEL PATH _; do
  [ -d "$PATH/.git" ] || continue
  cd "$PATH"

  PROBLEMS=()

  # Detached HEAD
  [ "$(git_current_branch)" = "DETACHED" ] && PROBLEMS+=("detached HEAD")

  # Dirty worktree
  [ "$(git_is_dirty)" = "dirty" ] && PROBLEMS+=("dirty worktree")

  # Active git operations
  [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ] && PROBLEMS+=("rebase in progress")
  [ -f .git/MERGE_HEAD ] && PROBLEMS+=("merge in progress")
  [ -f .git/CHERRY_PICK_HEAD ] && PROBLEMS+=("cherry-pick in progress")

  # Unmerged conflicts
  UNMERGED="$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l | tr -d ' ')"
  [ "$UNMERGED" -gt 0 ] && PROBLEMS+=("$UNMERGED unmerged files")

  # Linked worktrees
  WORKTREE_COUNT="$(git worktree list --porcelain 2>/dev/null | grep -c '^worktree ' || echo 1)"
  [ "$WORKTREE_COUNT" -gt 1 ] && PROBLEMS+=("$WORKTREE_COUNT linked worktrees")

  if [ ${#PROBLEMS[@]} -gt 0 ]; then
    echo "[unsafe] $LABEL: $(IFS=', '; echo "${PROBLEMS[*]}")"
    ISSUES=1
  fi
done <<< "$(repo_specs)"

if [ "$ISSUES" -gt 0 ] && [ "$REPORT_ONLY" = false ]; then
  exit 1
fi
```

---

## 8. Clean Worktrees (`clean-worktrees.sh`)

Removes orphaned git worktree metadata left behind when worktree directories are deleted.

### Key design: report first, fix only with explicit flag

```bash
#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"

MODE="report"  # default
[ "${1:-}" = "--fix" ] && [ "${2:-}" = "--yes" ] && MODE="fix"

while IFS='|' read -r LABEL PATH _; do
  [ -d "$PATH/.git" ] || continue
  cd "$PATH"

  PRUNABLE="$(git worktree list --porcelain 2>/dev/null | grep -c '^prunable' || echo 0)"
  [ "$PRUNABLE" -eq 0 ] && continue

  echo "[$LABEL] $PRUNABLE prunable worktree(s)"

  if [ "$MODE" = "fix" ]; then
    git worktree prune
    echo "  pruned"
  fi
done <<< "$(repo_specs)"
```

---

## 9. Task Context (`task-context.sh`)

Start-of-task entry point. Combines sync + safety scan + repo context into one command.

### Flow

```bash
#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"

SKIP_PULL=false
TARGETS=()

for arg in "$@"; do
  [ "$arg" = "--skip-pull" ] && SKIP_PULL=true && continue
  TARGETS+=("$arg")
done

# 1. Sync hub
if [ "$SKIP_PULL" = false ]; then
  log "Syncing hub..."
  cd "$HUB_ROOT"
  git pull --rebase
  git submodule update --init --recursive
fi

# 2. Safety scan
log "Running safety scan..."
bash "$HUB_ROOT/bash/check-worktree-safety.sh" --report-only

# 3. Print context for targets
for TARGET in "${TARGETS[@]}"; do
  bash "$HUB_ROOT/bash/repo-context.sh" "$TARGET"
done
```

---

## 10. Repo Context (`repo-context.sh`)

Quick read-only snapshot of a repo's state.

```bash
#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"

for ALIAS in "${@:-hub}"; do
  REPO_PATH="$(resolve_repo "$ALIAS")"
  LABEL="$(resolve_repo_label "$ALIAS")"

  echo "── $LABEL ──"
  echo "  path:      $REPO_PATH"

  if [ -d "$REPO_PATH/.git" ]; then
    cd "$REPO_PATH"
    echo "  branch:    $(git_current_branch)"
    echo "  worktree:  $(git_is_dirty)"
  fi

  # Print instruction files
  for FILE in CLAUDE.md AGENTS.md; do
    [ -f "$REPO_PATH/$FILE" ] && echo "  instructions: $FILE"
  done
  echo ""
done
```

---

## 11. Cross-Repo Search (`find-in-repos.sh`)

Search content or filenames across all submodules in one command. Uses ripgrep for speed.

```bash
#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"

MODE="content"
[ "${1:-}" = "--files" ] && MODE="files" && shift

PATTERN="$1"; shift
TARGETS=("${@}")

# Default: all repos
if [ ${#TARGETS[@]} -eq 0 ]; then
  while IFS='|' read -r _ PATH _; do
    [ -d "$PATH" ] && TARGETS+=("$PATH")
  done <<< "$(repo_specs)"
fi

if [ "$MODE" = "content" ]; then
  rg -n "$PATTERN" "${TARGETS[@]}" || true
else
  rg --files "${TARGETS[@]}" | rg "$PATTERN" || true
fi
```

---

## 12. Pointer Readiness Check (`prepare-pointer-updates.sh`)

Pre-flight check before running `update-submodule-pointer.sh`. Reports which repos are ready, which can be auto-switched, and which are blocked.

### Statuses

| Status | Meaning | Action |
|--------|---------|--------|
| `ready` | Already on base branch, worktree clean | Safe to update pointer |
| `switchable` | On a branch fully merged into base, worktree clean | Can auto-switch with `--apply` |
| `blocked` | On an unmerged branch, or dirty | Needs manual merge/cleanup first |

```bash
#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"

APPLY=false
[ "${1:-}" = "--apply" ] && APPLY=true && shift

for REPO in "$@"; do
  REPO_PATH="$(resolve_repo "$REPO")"
  cd "$REPO_PATH"

  BASE="main"
  CURRENT="$(git_current_branch)"

  if [ "$(git_is_dirty)" = "dirty" ]; then
    echo "[$REPO] status=blocked reason=dirty"
    continue
  fi

  if [ "$CURRENT" = "$BASE" ]; then
    echo "[$REPO] status=ready branch=$BASE"
    continue
  fi

  # Check if current branch is fully merged into base
  git fetch origin "$BASE" --quiet
  UNMERGED="$(git rev-list --count "origin/$BASE..$CURRENT" 2>/dev/null || echo 999)"

  if [ "$UNMERGED" -eq 0 ]; then
    if [ "$APPLY" = true ]; then
      git checkout "$BASE"
      git pull --rebase origin "$BASE"
      echo "[$REPO] status=ready branch=$BASE (switched from $CURRENT)"
    else
      echo "[$REPO] status=switchable branch=$CURRENT (fully merged into $BASE)"
    fi
  else
    echo "[$REPO] status=blocked branch=$CURRENT ($UNMERGED unmerged commits)"
  fi
done
```

---

## 13. Kill Port (`kill-port.sh`)

Prevents port collisions when dev servers restart. Called automatically by `yarn dev` scripts.

```bash
#!/usr/bin/env bash
PORT="$1"
PIDS="$(lsof -ti :"$PORT" 2>/dev/null || true)"
if [ -n "$PIDS" ]; then
  echo "Killing process(es) on port $PORT: $PIDS"
  echo "$PIDS" | xargs kill -9
  sleep 0.5
fi
```

---

## Package.json Aliases

Wrap every helper in a yarn/npm alias so users don't need to remember script paths or nvm setup.

### Pattern

```jsonc
{
  "scripts": {
    // Sync
    "pull": "git pull --rebase && git submodule update --init --recursive",
    "setup": "git submodule update --init --recursive",

    // Status & Context
    "status:all": "bash bash/status-all.sh",
    "repo:context": "bash bash/repo-context.sh",
    "task:context": "bash bash/task-context.sh",
    "worktree:safety": "bash bash/check-worktree-safety.sh",
    "clean:worktrees": "bash bash/clean-worktrees.sh",

    // Git Workflow
    "branch:personal": "bash bash/personal-branch.sh",
    "pending:prs": "bash bash/pending-prs.sh",
    "update:pointer": "bash bash/update-submodule-pointer.sh",
    "prepare:pointers": "bash bash/prepare-pointer-updates.sh",

    // Search
    "find:repos": "bash bash/find-in-repos.sh",

    // Per-submodule dev servers (each calls kill-port internally)
    "dev:frontend": "cd my-frontend && yarn dev",
    "dev:backend": "cd my-backend && yarn dev",

    // Per-submodule tests
    "test:frontend": "cd my-frontend && yarn test",
    "test:backend": "cd my-backend && yarn test",

    // Per-submodule push (for repos with specific push aliases)
    "push:docs": "bash bash/push-submodule.sh my-docs"
  }
}
```

---

## Script Dependency Graph

```
task-context.sh
  ├── check-worktree-safety.sh
  └── repo-context.sh

push-submodule.sh
  └── update-submodule-pointer.sh

prepare-pointer-updates.sh
  └── check-worktree-safety.sh

clean-worktrees.sh
  └── lib.sh (repo_specs)

All scripts
  └── lib.sh
```

---

## Design Principles

When building helpers for a new hub, follow these principles:

1. **Always log the resolved target** — print repo name, path, branch, and worktree state before any mutation. Prevents wrong-repo mistakes in multi-repo work.

2. **Refuse dirty state** — helpers that push or update pointers must call `ensure_clean_repo` first. Don't bypass with manual git; stash first.

3. **Validate before committing** — pointer updates must verify the submodule is on its base branch and nested pointers are valid.

4. **One commit, one push** — batch multiple pointer updates into a single hub commit. Don't create N commits for N submodules.

5. **Print compare links** — after every push to a non-base branch, print a GitHub/GitLab compare link so the user can create a PR.

6. **Never force push** — helpers must never use `--force`. If push is rejected, fetch/rebase and retry.

7. **Never skip hooks** — helpers must never use `--no-verify`.

8. **Strict mode** — all scripts use `set -euo pipefail` (fail on first error, undefined vars, pipe failures).

9. **Graceful degradation for read-only scripts** — skip missing repos instead of failing the entire scan. Log a warning.

10. **Separate report from fix** — destructive operations (worktree cleanup, branch switching) require an explicit `--apply` or `--fix --yes` flag. Default mode is always read-only.

11. **Source a shared library** — don't duplicate utility functions across scripts. Put them in `lib.sh` and source it.

12. **Use aliases for ergonomics** — wrap every helper in a `package.json` script alias so users type `yarn status:all` instead of `bash bash/status-all.sh`.

13. **Dependency order in push** — when changes span repos with dependencies, push lower-level repos first. Document the dependency graph.

14. **Pointer ≠ push** — pushing a submodule branch and updating the hub pointer are two separate steps. The pointer only moves after the PR is merged to the base branch. Helpers must enforce this sequence.
