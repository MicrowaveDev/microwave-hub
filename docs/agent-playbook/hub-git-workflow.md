# Hub Git Workflow

Use this file for hub-level Git and submodule operations that are too specific or verbose for startup instructions.

## Hub Architecture

A hub repo is a parent repository that tracks child repositories as Git submodules. The hub commit records which submodule commits are meant to work together.

Key concepts:

- **Hub pointer**: the submodule commit recorded by the hub
- **Base branch**: the branch the pointer should track after merge
- **Working branch**: the branch used for active development inside the submodule

Use [submodules.manifest.json](/Users/microwavedev/workspace/microwave-hub/submodules.manifest.json) as the canonical branch and command map.

## Safe Order Of Operations

When a change belongs in a submodule:

1. Commit inside the submodule.
2. Run the repo-appropriate validation.
3. Push the submodule branch.
4. Hand off the compare link for merge unless the user explicitly asked you to merge.
5. Update the hub pointer only after the desired submodule commit exists on the remote base branch.

When multiple repos are involved, push dependencies before dependents.

## Pointer Safety

- Never update a hub pointer while the submodule is still on an unmerged working branch.
- Never manually stage every file at the hub root with `git add .` or `git add -A`.
- Never manually push hub pointer changes if a repo helper exists for pointer updates.
- If the user says "update pointers", first confirm the relevant submodule work is already merged to the base branch.

## Recovery Rules

- Prefer rebase over merge for routine sync recovery.
- If local changes block sync, create a descriptive stash, sync, then re-apply immediately.
- If a non-fast-forward push is rejected, fetch, rebase, and retry.
- Only stop to ask the user if conflict resolution would require changing unrelated user work you cannot safely separate.

## Helper Scripts

Hub helpers should live in `bash/`.

Current helpers:

- [bash/status-all.sh](/Users/microwavedev/workspace/microwave-hub/bash/status-all.sh): print hub and submodule branch, SHA, and dirty state
- [bash/worktree-safety.sh](/Users/microwavedev/workspace/microwave-hub/bash/worktree-safety.sh): fail fast on detached HEADs or dirty working trees

Recommended future helpers:

- `bash/push-submodule.sh <repo> "<msg>"`
- `bash/update-submodule-pointer.sh <repo>`
- `bash/pending-prs.sh`

## Script Design Rules

- Log the resolved target path before acting.
- Refuse to proceed when the target repo has unrelated local changes.
- Print compare links after pushes when a human merge is expected.
- Never force push.
- Never hide the current branch or target repo from the output.
