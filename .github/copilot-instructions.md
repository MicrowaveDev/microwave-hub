# Microwave Hub Repository Instructions

- This repo is a coordination hub. Most product changes belong in a submodule, not in the hub root.
- For non-trivial tasks, read `portable-agent-instructions.md`, then use `SUBMODULES.md` to route the request and `submodules.manifest.json` for branch and verification metadata.
- After entering a submodule, follow the nearest repo-local `AGENTS.md` or `CLAUDE.md`; treat it as the source of truth for that repo.
- Do not make hub-root edits for submodule product work. Keep hub changes focused on pointers, hub docs, helper scripts, and parent-level metadata.
- Prefer provided helper commands over rebuilding workflows manually: `npm run task:context -- <repo>`, `npm run repo:context -- <repo>`, `npm run status:all`, `npm run worktree:safety`, `npm run pending:prs`, and `npm run prepare:pointers -- <repo>`.
- When multiple repos are involved, state the dependency order before editing and update dependency repos first.
- Commit inside a submodule before updating its hub pointer.
- Before handoff, report what verification you ran and what you did not run.
