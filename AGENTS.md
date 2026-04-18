# Microwave Hub Agent Guide

## Scope

These instructions apply at the hub level in `/Users/microwavedev/workspace/microwave-hub`.

This repository is a coordination repo. Most implementation work happens inside the submodules.

## Startup Workflow

- Start each non-trivial task by reading [portable-agent-instructions.md](/Users/microwavedev/workspace/microwave-hub/portable-agent-instructions.md).
- Use [submodules.manifest.json](/Users/microwavedev/workspace/microwave-hub/submodules.manifest.json) for machine-readable repo metadata such as base branch, package manager, install command, and quick verification command.
- Then read [SUBMODULES.md](/Users/microwavedev/workspace/microwave-hub/SUBMODULES.md) to map the user's request to the right repo.
- Once you enter a submodule, treat the nearest repo-local instruction file as the source of truth for that repo:
  - `AGENTS.md` if present
  - otherwise `CLAUDE.md` or other repo-local workflow docs
- Hub rules set defaults. Repo-local instructions override them inside that repo's scope.
- Before broad edits, sync-heavy work, or multi-repo work, run [bash/status-all.sh](/Users/microwavedev/workspace/microwave-hub/bash/status-all.sh) or [bash/worktree-safety.sh](/Users/microwavedev/workspace/microwave-hub/bash/worktree-safety.sh).
- Prefer the helper aliases in [package.json](/Users/microwavedev/workspace/microwave-hub/package.json) when they fit the task, for example `npm run status:all`, `npm run repo:context -- geesome-node`, or `npm run find:repos -- OAuth`.
- For Git coordination, prefer `npm run pending:prs` and `npm run prepare:pointers -- <repo>` before deciding whether a hub pointer update is actually safe.

## Hub Operating Rules

- Do not make product changes in the hub root when the real implementation belongs in a submodule.
- Keep hub changes focused on:
  - submodule pointers
  - hub-level documentation
  - coordination scripts or metadata that truly belong to the parent repo
- When a user names a product vaguely, use [SUBMODULES.md](/Users/microwavedev/workspace/microwave-hub/SUBMODULES.md) to disambiguate before editing.
- Prefer [submodules.manifest.json](/Users/microwavedev/workspace/microwave-hub/submodules.manifest.json) over ad hoc discovery when you need branch policy, install commands, or quick verification commands.
- Before committing or pushing, verify you are in the intended repo. In this workspace that often means confirming whether the target is the hub or a submodule.
- When submodule work is required, commit inside the submodule first. Update the hub pointer only after the desired submodule commit exists.

## Repo Discovery

Use this routing order:

1. Match the user request to a submodule in [SUBMODULES.md](/Users/microwavedev/workspace/microwave-hub/SUBMODULES.md).
2. Read the matching entry in [submodules.manifest.json](/Users/microwavedev/workspace/microwave-hub/submodules.manifest.json) for base branch and validation commands.
3. Open that submodule's local instructions before making changes.
4. If more than one repo is involved, call out the dependency order explicitly and update dependencies first.

## Hub Helpers

- [bash/lib.sh](/Users/microwavedev/workspace/microwave-hub/bash/lib.sh): shared helper functions used by hub scripts.
- [bash/status-all.sh](/Users/microwavedev/workspace/microwave-hub/bash/status-all.sh): show branch, SHA, and dirty state for the hub and every submodule.
- [bash/check-worktree-safety.sh](/Users/microwavedev/workspace/microwave-hub/bash/check-worktree-safety.sh): fail fast when a repo is dirty or on detached HEAD before risky workflow steps.
- [bash/repo-context.sh](/Users/microwavedev/workspace/microwave-hub/bash/repo-context.sh): print branch, worktree, instructions, and manifest-defined commands for a repo.
- [bash/task-context.sh](/Users/microwavedev/workspace/microwave-hub/bash/task-context.sh): optional start-of-task sync plus safety scan and repo context.
- [bash/find-in-repos.sh](/Users/microwavedev/workspace/microwave-hub/bash/find-in-repos.sh): cross-repo content or filename search using `rg`.
- [bash/pending-prs.sh](/Users/microwavedev/workspace/microwave-hub/bash/pending-prs.sh): report submodules currently on non-base branches.
- [bash/prepare-pointer-updates.sh](/Users/microwavedev/workspace/microwave-hub/bash/prepare-pointer-updates.sh): read-only check for whether a repo is clean, on base, and synced to the currently known local `origin/<base>` ref for pointer updates.
- [bash/verify-helpers.sh](/Users/microwavedev/workspace/microwave-hub/bash/verify-helpers.sh): smoke-check the hub helper layer.
- [docs/agent-playbook/hub-git-workflow.md](/Users/microwavedev/workspace/microwave-hub/docs/agent-playbook/hub-git-workflow.md): detailed hub and submodule Git rules that do not belong in startup context.
- [docs/agent-playbook/hub-helper-usage.md](/Users/microwavedev/workspace/microwave-hub/docs/agent-playbook/hub-helper-usage.md): quick examples for the hub helper commands.
- [docs/agent-playbook/hub-helpers-reference.md](/Users/microwavedev/workspace/microwave-hub/docs/agent-playbook/hub-helpers-reference.md): blueprint/reference for future helper expansion. Treat it as design guidance, not as executable source of truth.

## Current Submodules

- `psycho-game`
- `geesome-node`
- `geesome-locals`
- `geesome-libs`
- `geesome-artist`
- `geesome-ui`
- `blog-master`
- `mushroom-master`
