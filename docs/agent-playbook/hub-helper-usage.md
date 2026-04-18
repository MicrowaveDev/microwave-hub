# Hub Helper Usage

Use these commands when working from the hub root.

## Common Commands

- `npm run status:all`
  - Show branch, base branch, dirty state, and HEAD SHA for the hub and every submodule.
- `npm run repo:context -- geesome-node`
  - Show one repo's path, branch, worktree state, instruction file, install command, and verification commands.
- `npm run task:context -- geesome-ui`
  - Run a read-only safety scan and print quick context for the target repo.
- `npm run find:repos -- OAuth`
  - Search across the hub and submodules.
- `npm run find:repos -- --files 'AGENTS\.md$'`
  - Search filenames instead of content.

## Git Coordination

- `npm run pending:prs`
  - Report submodules that are currently on a non-base branch and may still need PR or merge follow-up.
- `npm run prepare:pointers -- geesome-node geesome-ui`
  - Report whether selected repos are clean, on base, and synced to the currently known local `origin/<base>` ref before a pointer update.
- `npm run verify:helpers`
  - Run a lightweight smoke test for the helper layer.

## Notes

- These helpers are intentionally read-only except for the optional sync step inside `task-context.sh`.
- Use the helper output to decide what to do next; do not treat helper success as permission to skip review.
