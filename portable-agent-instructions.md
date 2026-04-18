# Portable Agent Instructions

Keep this file short enough to stay reliable as startup context. Put repo-specific details in repo-local `AGENTS.md` / `CLAUDE.md`, and put hub workflow details in supplemental docs.

Supplemental docs:

- [docs/agent-playbook/hub-git-workflow.md](/Users/microwavedev/workspace/microwave-hub/docs/agent-playbook/hub-git-workflow.md)
- [submodules.manifest.json](/Users/microwavedev/workspace/microwave-hub/submodules.manifest.json)

## Startup

- Start each non-trivial task with a preflight:
  - identify the target repo
  - read the nearest local instruction file in scope
  - check whether the repo already has helper scripts or documented commands for the workflow you need
- In the hub, use [SUBMODULES.md](/Users/microwavedev/workspace/microwave-hub/SUBMODULES.md) for routing and [submodules.manifest.json](/Users/microwavedev/workspace/microwave-hub/submodules.manifest.json) for machine-readable branch, install, and verification metadata.
- Parent or hub instructions set defaults. Once inside a repo, the nearest repo-local instructions override the hub for that scope.
- Before broad edits, multi-repo work, or sync-heavy work, check whether the workspace is already dirty.

## Planning

- Freeze the source of truth before implementation: user requirements, acceptance criteria, constraints, non-goals, and open assumptions.
- Keep user requirements, agent assumptions, and implementation choices visibly separate. Do not let assumptions silently replace the requested architecture.
- If the user specified how the result should be produced, treat that process description as part of the spec, not as optional flavor.
- If you want to substitute a simpler mechanism for the requested one, call out the deviation and get explicit approval first.
- If a request contains sequencing words such as `first`, `after`, `from`, `using`, `based on`, `through`, or `instead of`, treat them as potential architectural constraints and validate them during planning.

## Verification

- Before summarizing behavior, inspect the affected code or docs directly. Do not infer final behavior from filenames, issue titles, or diff size.
- Prefer cheap executable validation over advisory wording. If a rule matters, back it with a script, test, lint rule, or validator when practical.
- For multi-stage workflows, validate after each meaningful stage instead of only at the end.
- Do not report work complete unless the required artifacts exist, the relevant validation has run, and the claimed status matches the files on disk.
- Before handoff, do a final alignment pass against the original request and call out any remaining drift, open assumptions, or partial completion.

## Code Quality

- Commit messages must describe the problem being addressed or the completed task. Do not add AI attribution.
- Use `data-testid` for E2E selectors.
- For meaningful UI-state changes, capture or review the key screens and states before calling the work complete.
- When removing or replacing a feature, scan for dead code and stale references in tests, CSS, locale keys, and helper functions.

## Authored Vs Generated

- When a folder mixes generated evidence with human-authored outputs:
  - generated evidence may be refreshed
  - authored outputs must be preserved unless the user asked to rewrite them
  - stale scaffolding in authored files should be replaced, not edited around
- In authored reports or plans, describe workflows, modules, routes, tests, and decisions before listing files or diff volume.

## Multi-Agent Work

- Prefer separate passes or agents for distinct stages such as implementation, evidence generation, review, and sign-off.
- For delegated work, define allowed inputs, allowed outputs, forbidden edits, and completion conditions explicitly.
- Keep write scope narrow and durable artifacts separate when multiple agents or long workflows are involved.
- Only one agent should own the final push or merge handoff.

## Efficiency

- Batch read-only exploration. Prefer one aggregated search or one helper command over many serial one-off reads.
- Before rebuilding a Git, status, validation, or release workflow manually, check whether the repo already provides a helper command or script.
- Prefer repository-provided helper commands for recurring workflows.
- Avoid blind mass refreshes such as broad reformatting or regeneration when another agent may be active in the same area.

## Git Safety

- Respect the repo's documented branch model. Do not invent a default branch naming scheme when the repo already defines one.
- If pull, rebase, or push fails, do not stop at the first error by default. Protect local work, fetch, apply the documented sync flow, resolve conflicts, and retry.
- Never use destructive cleanup commands such as `git reset --hard`, `git checkout --`, `git restore`, or `git clean` unless the user explicitly asked for them.
- Before committing or pushing, verify which repo and branch you are in. In nested repos, do not assume the last directory change still points at the intended Git target.

## Reviews

- After implementation, self-review for:
  - cross-boundary impact
  - security
  - correctness and edge cases
  - performance
  - UX impact
  - code quality and duplication
  - dead code cleanup
- If the user asks whether an approach is best practice, recommended, standard, or current guidance, verify it with current research rather than relying on memory alone.
