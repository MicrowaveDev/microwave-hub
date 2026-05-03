# Microwave Hub Agent Guide

## Scope

These instructions apply at the hub level in `/Users/microwavedev/workspace/microwave-hub`.

This repository is a coordination repo. Most implementation work belongs in submodules, not in the hub root.

Keep this file hub-specific and reasonably short. Put general agent behavior in [portable-agent-instructions.md](/Users/microwavedev/workspace/microwave-hub/portable-agent-instructions.md), and put product-specific workflow details in the nearest submodule-local `AGENTS.md` or `CLAUDE.md`.

## Instruction Order

Use this precedence when working from the hub:

1. Follow the active user request first.
2. Read [portable-agent-instructions.md](/Users/microwavedev/workspace/microwave-hub/portable-agent-instructions.md) for cross-repo defaults.
3. Use this file for hub routing, safety, and pointer-update rules.
4. After entering a submodule, the nearest repo-local instructions become the source of truth for that repo:
   - `AGENTS.md` if present
   - otherwise `CLAUDE.md` or other repo-local workflow docs

If instructions conflict, prefer the nearest in-scope repo-local file rather than trying to blend incompatible workflows.

## Fast Start

For non-trivial work, use this sequence:

1. Route the request with [SUBMODULES.md](/Users/microwavedev/workspace/microwave-hub/SUBMODULES.md).
2. Read the matching entry in [submodules.manifest.json](/Users/microwavedev/workspace/microwave-hub/submodules.manifest.json) for base branch, install command, and verification commands.
3. Open the target repo's local instructions before editing.
4. Prefer hub helper aliases from [package.json](/Users/microwavedev/workspace/microwave-hub/package.json) instead of rebuilding workflows manually.

Preferred commands:

- `npm run task:context -- <repo>` for a start-of-task sync, safety scan, and repo context
- `npm run repo:context -- <repo>` for read-only repo context
- `npm run status:all` before broad edits, multi-repo work, or sync-heavy work
- `npm run worktree:safety` before risky Git operations
- `npm run pending:prs` and `npm run prepare:pointers -- <repo>` before deciding whether a hub pointer update is safe

Do not read every submodule doc up front. Route first, then load only the repo instructions that are actually in scope.

## Hub Boundaries

- Do not make product changes in the hub root when the real implementation belongs in a submodule.
- Keep hub changes focused on:
  - submodule pointers
  - hub-level documentation
  - coordination scripts
  - shared metadata that truly belongs to the parent repo
- Before committing or pushing, verify whether the intended Git target is the hub or a submodule.
- When submodule work is required, commit inside the submodule first. Update the hub pointer only after the desired submodule commit exists.

## Multi-Repo Rules

- If the request is ambiguous, use [SUBMODULES.md](/Users/microwavedev/workspace/microwave-hub/SUBMODULES.md) to disambiguate before editing.
- Prefer [submodules.manifest.json](/Users/microwavedev/workspace/microwave-hub/submodules.manifest.json) over ad hoc discovery for branch policy, install commands, and validation commands.
- If more than one repo is involved, state the intended dependency order before editing and update dependency repos first.
- Respect manifest dependencies when sequencing work. In particular:
  - `geesome-libs` before `geesome-ui` or `geesome-node`
  - `geesome-ui` before `geesome-node` when both are involved

## Verification And Handoff

- Use manifest-defined verification commands when they fit the task.
- For doc-only or hub-only metadata changes, prefer the cheapest relevant validation and say what was not run.
- Before handoff, confirm that the files changed in the repo you intended to modify.
- Before pointer updates, verify the submodule is on the expected branch and commit, not just that the hub diff looks small.

## Instruction Maintenance

- Keep hub and repo-local instruction files aligned with real commands and workflows.
- When helper aliases, base branches, install commands, or verification commands change, update the relevant instruction files in the same task or commit when practical.
- Prefer short updates to stale detail. If a rule becomes repo-local or product-specific, move it closer to the affected submodule instead of growing the hub file.

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
- [docs/agent-playbook/hub-helpers-reference.md](/Users/microwavedev/workspace/microwave-hub/docs/agent-playbook/hub-helpers-reference.md): design guidance for future helper expansion, not executable source of truth.

## Current Submodules

- `psycho-game`
- `geesome-node`
- `geesome-locals`
- `geesome-libs`
- `geesome-artist`
- `geesome-ui`
- `blog-master`
- `mushroom-master`
- `microwave-girls`
- `agent-viewer`
