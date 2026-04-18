# Microwave Hub Agent Guide

## Scope

These instructions apply at the hub level in `/Users/microwavedev/workspace/microwave-hub`.

This repository is a coordination repo. Most implementation work happens inside the submodules.

## Startup Workflow

- Start each non-trivial task by reading [portable-agent-instructions.md](/Users/microwavedev/workspace/microwave-hub/portable-agent-instructions.md).
- Then read [SUBMODULES.md](/Users/microwavedev/workspace/microwave-hub/SUBMODULES.md) to map the user's request to the right repo.
- Once you enter a submodule, treat the nearest repo-local instruction file as the source of truth for that repo:
  - `AGENTS.md` if present
  - otherwise `CLAUDE.md` or other repo-local workflow docs
- Hub rules set defaults. Repo-local instructions override them inside that repo's scope.

## Hub Operating Rules

- Do not make product changes in the hub root when the real implementation belongs in a submodule.
- Keep hub changes focused on:
  - submodule pointers
  - hub-level documentation
  - coordination scripts or metadata that truly belong to the parent repo
- When a user names a product vaguely, use [SUBMODULES.md](/Users/microwavedev/workspace/microwave-hub/SUBMODULES.md) to disambiguate before editing.
- Before committing or pushing, verify you are in the intended repo. In this workspace that often means confirming whether the target is the hub or a submodule.
- When submodule work is required, commit inside the submodule first. Update the hub pointer only after the desired submodule commit exists.

## Repo Discovery

Use this routing order:

1. Match the user request to a submodule in [SUBMODULES.md](/Users/microwavedev/workspace/microwave-hub/SUBMODULES.md).
2. Open that submodule's local instructions before making changes.
3. If more than one repo is involved, call out the dependency order explicitly and update dependencies first.

## Current Submodules

- `psycho-game`
- `geesome-node`
- `geesome-locals`
- `geesome-libs`
- `geesome-artist`
- `geesome-ui`
- `blog-master`
- `mushroom-master`
