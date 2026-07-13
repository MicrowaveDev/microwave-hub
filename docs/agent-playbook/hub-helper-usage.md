# Hub Helper Usage

Use these commands when working from the hub root.

## Common Commands

- `npm run status:all`
  - Show branch, base branch, dirty state, and HEAD SHA for the hub and every submodule.
- `npm run repo:context -- geesome-node`
  - Show one repo's path, branch, worktree state, instruction file, install command, and verification commands.
- `npm run task:context -- geesome-ui`
  - Run a read-only safety scan, print quick context, and load the complete repo-local instruction file once.
- `npm run task:context -- --json geesome-ui`
  - Emit a machine-readable context contract with repo state, manifest commands, loaded instruction content and hash, plus `complete` and `truncated` fields. JSON mode never syncs.
- `npm run route:agent -- --prompt "Run the production image-description queue for July"`
  - Resolve an exact workflow phrase to its mandatory first command. Add `--json` for route ID, matched trigger, repo, and forbidden pre-route probes.
- `npm run validate:agent-route -- --input <trace.json>`
  - Validate that an exact-route trace used the mandatory command first and performed no forbidden routing probes beforehand.
- `npm run capture:command -- --cwd <repo> -- <command> <args...>`
  - Capture a demonstrated noisy command to secure ignored artifacts and return a bounded receipt. Use `--raw-output --reason <text>` only for an explicit justified replay.
- `npm run cleanup:command-output -- --cwd <repo> --report-only`
  - Report retention cleanup for captured output. Add `--apply` to remove unpinned expired or over-budget pairs.
- `npm run read:command-output -- --cwd <repo> --log <path> --lines 1:20 --reason <text>`
  - Read an audited bounded range from a completed capture. Byte ranges are also supported; binary output is rejected in favor of a binary-aware tool.
- `npm run flow:checkpoint -- <init|update|validate|resume> --id <task-id> ...`
  - Maintain and validate a bounded atomic checkpoint, sidecar hash, and event ledger for a long multi-agent task.
- `npm run flow:packet -- <generate|validate|validate-handoff> ...`
  - Generate compact ownership-scoped assignments, reject dependency/interface drift, and validate bounded structured handoffs.
- `npm run compare:agent-context-strategies -- --input <runs.json> [--output <report.json>]`
  - Compare reused, reset, and fresh workers only across identical batches. It recommends a change only when total input and latency improve without weaker correctness or more intervention.
- `npm run find:repos -- OAuth`
  - Search across the hub and submodules with a bounded 40-line, 400-character-per-line preview and total counts.
- `npm run find:repos -- --files 'AGENTS\.md$'`
  - Search filenames instead of content.
- `npm run find:repos -- --limit 20 OAuth geesome-node`
  - Narrow the preview and repository scope. Direct full output requires `--full --reason <text>`.

## Git Coordination

- `npm run pending:prs`
  - Report submodules that are currently on a non-base branch and may still need PR or merge follow-up.
- `npm run prepare:pointers -- geesome-node geesome-ui`
  - Report whether selected repos are clean, on base, and synced to the currently known local `origin/<base>` ref before a pointer update.
- `npm run verify:helpers`
  - Run a lightweight smoke test for the helper layer.
- `npm run verify:instructions`
  - Verify exact-route trigger parity, local instruction links, and the root `AGENTS.md` byte ceiling.

## Notes

- These helpers are intentionally read-only except for the optional sync step inside human-mode `task-context.sh`.
- A successful `task:context` contract names exactly which repo-local instructions were loaded. Do not reread those files in the same task unless the contract reports truncation, a hash change, or a named omitted section.
- Use the helper output to decide what to do next; do not treat helper success as permission to skip review.
