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

- [bash/status-all.sh](/Users/microwavedev/workspace/microwave-hub/bash/status-all.sh): show branch, SHA, and dirty state for the hub and every submodule.
- [bash/worktree-safety.sh](/Users/microwavedev/workspace/microwave-hub/bash/worktree-safety.sh): fail fast when a repo is dirty or on detached HEAD before risky workflow steps.
- [docs/agent-playbook/hub-git-workflow.md](/Users/microwavedev/workspace/microwave-hub/docs/agent-playbook/hub-git-workflow.md): detailed hub and submodule Git rules that do not belong in startup context.

## Current Submodules

- `psycho-game`
- `geesome-node`
- `geesome-locals`
- `geesome-libs`
- `geesome-artist`
- `geesome-ui`
- `blog-master`
- `mushroom-master`
