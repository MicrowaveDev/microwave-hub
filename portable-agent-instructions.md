# Portable Agent Instructions

Reusable agent rules extracted from the CryptoLegacy hub. Copy and adapt for any new project.

---

## Debugging & Bug Fixes

- When fixing a bug observed in the user's browser or server, always add diagnostic `console.log` / `console.warn` traces in every affected code path and in every newly added branch. Log which branch is taken, key input values, and async results that drive UI state. Without these, each iteration requires a full refresh-paste-wait cycle just to discover the fix targeted the wrong path. These are debugging aids — remove them once the fix is confirmed working.
- After a bug fix is confirmed working and production-ready, scan the codebase for the same failure pattern before pushing. Check whether other call sites, stores, components, or data paths share the same vulnerability (e.g., silent error filtering, stale cache without re-fetch, missing timeouts, swallowed null returns). Fix related instances in the same push when the fix is small; flag them to the user when the scope is larger.

## Planning & Source of Truth

- Start each non-trivial task with a preflight: identify the target repo, read the closest local instruction file, and use any existing repo-provided context/helper command before rebuilding the workflow manually.
- Parent or hub instructions set defaults; once inside a repo or subproject, the nearest local instructions and workflow docs take precedence for that scope.
- For non-trivial multi-stage work, freeze the source of truth before implementation: original request, acceptance criteria, constraints, non-goals, and any open assumptions.
- Every plan must keep user requirements, agent assumptions, and implementation choices visibly separate. Agent assumptions and implementation choices must never silently override user requirements.
- The user's original request is the primary architectural specification. If a request describes how results should be produced — not just what files should exist — that process description is part of the architecture.
- If the implementation substitutes a simpler mechanism for the requested mechanism, call out the substitution as a deviation and get explicit approval before proceeding. Never treat "produces the same output shape" as equivalent to "implements the requested architecture".
- When a request contains sequencing words (`first`, `after`, `from`, `by`, `using`, `based on`, `result of`, `through`, `instead of`), assume these may express architectural constraints and validate them explicitly during planning.

## Verification & Completion

- Before summarizing implementation behavior, inspect the current code or docs in the affected areas. Do not infer final behavior from issue titles, commit subjects, filenames, or diff size alone when current file contents are available.
- When a structural rule matters, add or run a cheap validation step after editing instead of relying only on advisory wording.
- When adding a new workflow rule, ask whether it should be backed by a script, test, lint rule, or validator so the rule is enforced by execution, not memory.
- For multi-stage authored/generated workflows, validate after each meaningful stage rather than only at the end. Do not start translation, publication, or sign-off from an unvalidated intermediate artifact when a cheap validation step exists.
- If validation or review finds a concrete gap, prefer the smallest fix that addresses the reported problem and rerun validation instead of rewriting unrelated content.
- Do not report a workflow complete unless the required authored artifacts exist, the required validation has passed, and the claimed completion state matches the actual files on disk.
- Before handoff, do a final alignment pass against the original user request and call out any remaining drift, open assumptions, or partial completion.

## Code Quality

- Never add AI attribution to commit messages.
- Commit messages must describe the problem being addressed or the task completed, and make clear whether the work is partial or complete.
- UI test selectors must use `data-testid`.
- For new UI workflows or meaningful UI-state changes, define the key screens/states, add screenshot capture for them in E2E coverage where practical, and run an agent review on those screenshots to identify UI/UX fixes or polish gaps before calling the work complete.

## Authored vs Generated Content

- When a folder mixes generated evidence with human-authored outputs:
  - generated evidence may be refreshed
  - authored outputs must be preserved unless the user asked to rewrite them
  - if an authored file still contains stale generated scaffolding, replace that scaffolding instead of editing around it
- For authored reviews, reports, plans, and decision docs, describe capabilities, workflows, modules, routes, commands, pages, tests, and architecture decisions before listing files. Do not lead with diff volume, "top changed files", or generated result files unless they are the real implementation surface.

## Delegated Agents & Multi-Stage Work

- When a workflow has distinct authorship, translation, evidence, review, or sign-off stages, prefer separate agents or passes with a narrow write scope per stage instead of one agent editing every artifact opportunistically.
- For delegated agents, state boundaries explicitly: allowed inputs, allowed outputs, forbidden edits, and the completion condition for that stage.
- For multi-stage work, keep durable artifacts separate when practical: frozen spec/task snapshot, generated evidence, authored outputs, and validation/verdict results should not blur together.

## Writing Rules

When the user asks to add or apply a new rule:

1. Review ALL existing rule files to understand current structure and avoid duplication
2. Find the most relevant existing file and section — don't create a new file if the rule fits an existing one
3. Write the rule in clear, imperative language that an AI agent will follow precisely — use NEVER/ALWAYS for hard constraints, specific examples for ambiguous cases
4. If the rule affects multiple repos or files, update all relevant locations to keep them consistent
5. If the rule contradicts an existing rule, replace the old one rather than adding a conflicting entry

## Post-Implementation Review (Mandatory)

After completing any planned implementation, ALWAYS perform a self-review before reporting completion:

1. **Cross-boundary impact** — Check whether the change requires corresponding changes in related parts of the application. Frontend changes may need backend fixes and vice versa.
2. **Security** — Scan for injection vulnerabilities, exposed secrets, missing auth/authz checks, unsanitized user input at system boundaries.
3. **Correctness** — Verify edge cases: null/undefined inputs, empty arrays/objects, concurrent access, off-by-one errors, missing error handling on async operations.
4. **Performance** — Look for N+1 queries, missing DB indexes, unbounded data fetches, unnecessary re-renders, missing pagination.
5. **UX impact** — Consider slow connections, empty states, first-time use, error messages, loading indicators, mobile viewports.
6. **Code quality** — Check for dead code introduced, duplicated logic, inconsistency with existing patterns.
7. **Dead code cleanup** — When removing or replacing a feature, scan for all remnants: unused CSS, orphaned locale keys, dead refs/variables/functions, stale test selectors.

## Prose Quality

- Avoid self-referential filler in authored prose. If a heading already names the subject, do not open with `this group`, `this section`, `this file`, or `here` — start with the concrete capability, risk, or behavior instead.

## Efficiency — Reducing Wasted Cycles

- Batch read-only operations. Never run multiple serial one-by-one exploratory commands when one aggregated search, one helper, or one parallel batch answers the question.
- Before reconstructing a workflow manually (Git sync, status checks, multi-repo coordination), check if a helper script or one-command solution already exists. Rebuilding the flow loses safety checks baked into the helper.
- Prefer repository-provided helper commands for recurring workflows such as context setup, sync, publish, review generation, or validation instead of rebuilding them with ad hoc shell glue.
- Do not pipe `head`, `tail`, or any line-limiting filter into a command run in the background. This truncates output via SIGPIPE and can kill the process. Run with full output, then read the file afterward.
- Do not chain multiple read-only shell commands with `&&` when one higher-signal command already provides the needed context.
- Prefer dedicated tools over bash for file operations: use the built-in file search (not `find`), content search (not `grep`/`rg`), and file read (not `cat`/`head`/`tail`).
- Before sync-heavy, push-heavy, or broad-edit work, establish whether the workspace is already dirty or another agent may be active, then keep the write scope narrow enough to avoid collisions.

## Git & Branch Safety

- Respect the repository's documented branch model. Do not invent a default `codex/*`, `claude/*`, or similar feature branch when the repo already defines a different long-lived working branch pattern.
- If a pull, rebase, or push fails, do not stop at the first error by default. Protect local work, fetch, rebase or otherwise apply the documented sync flow, resolve conflicts, and retry the blocked step.
- Never use destructive cleanup commands (`git reset --hard`, `git checkout --`, `git restore`, `git clean`, or equivalent discard flows) unless the user explicitly asks for that cleanup.
- Before committing, verify which repo and branch you are on. In multi-repo or nested-repo work, do not assume the last directory change still points at the intended Git target.

## Error Handling Patterns

- Fail fast, no silent fallbacks. Tests and diagnostic code must throw errors on unexpected state, never fall back silently or log and continue.
- Use guard clauses (error-first if-else). Place error conditions before main logic. Use early exit instead of nested if blocks. Always use braces, never inline if statements.
- When reviewing a fix, look for swallowed errors, missing timeouts on async operations, stale cache without re-fetch, and silent null returns that should throw or surface a warning.

## Testing Discipline

- Always use `data-testid` selectors in E2E tests. Never rely on CSS classes, text content, or complex selectors. If no `data-testid` exists, add one to the component.
- Wait for state, not time. Use `waitForSelector()` or `locator.waitFor()` instead of `waitForTimeout()`. Only use timeout delays for non-element waits like animations.
- Use real data from config/receipts, mock external services with route interception.
- Never filter test output with `grep` — run with full logs so you see the complete context on failure.

## Multi-File / Multi-Repo Coordination

- Update ALL languages when changing i18n keys. Don't leave orphaned keys or partial translations.
- Keep shared config (formatter, linter) in sync across repos. When updating in one repo, apply the same change to all affected repos.
- When fixing a bug in one repo, check whether sibling repos have the same code pattern and fix them too in the same push.
- When changing shared UI, adapter contracts, prompt behavior, environment wiring, or common helper logic, check the downstream consumers or sibling repos that rely on the same surface before calling the task complete.
- Push dependencies before dependents. When changes span repos with dependency relationships, push lower-level repos first.

## Background Task Management

- Never interrupt background tasks with polling. The task will notify you when complete.
- Let background tasks write full output to a file. Read results afterward instead of tailing while the process runs.
- Don't stop waiting for a task just because early output looks promising. Wait for final validation artifacts before claiming success.

## Shell Script Conventions

- Put shell scripts in `bash/` not `scripts/`. Reserve `scripts/` for Node.js/Python files.
- Use `set -e` or explicit `|| exit` in helper scripts that enforce preconditions.
- Log resolved target paths so the user can verify which repo/directory is affected.

## Environment & Config Safety

- When introducing or changing an env var, inspect the runtime, Docker Compose, systemd/PM2 config, and deployment paths to ensure the variable is actually delivered to the running process.
- Never commit `.env` files, only `.env.example`.
- When reporting env-var work, tell the operator exactly where the variable must be set for the environments they use; do not assume file edits alone make the value live.

## Concurrency & Shared Workspaces

- Design for multi-agent parallel work as the default, not an edge case.
- Keep write scope explicit and narrow. Finish one folder or doc cluster before moving to another.
- Do not run blind mass refreshes (reformatting, fingerprint regeneration) when another agent may be active in the same areas.
- Only one agent owns the final push. When multiple agents work on the same batch, hand off explicitly.

## Research & Recommendations

- If the user asks whether an approach is best practice, recommended, standard, or current guidance, verify that claim with current research instead of relying on memory alone.

---

## Hub Architecture (Git Submodules)

A hub repo is a parent git repository that tracks multiple child repos as git submodules. The hub's `main` branch stores pointers to specific commits in each submodule. This gives you:

- One place to clone everything: `git clone --recurse-submodules`
- Coordinated versioning: the hub pointer says "these submodule versions work together"
- Independent history: each submodule has its own branches, PRs, and CI

### Key concepts

- **Hub pointer** — the commit SHA the hub records for each submodule. Lives in `.gitmodules` + the tree entry. Updated via helper scripts, never manually.
- **Base branch** — the branch the hub pointer tracks for each submodule (`main` or `dev`). The pointer must always point to the base branch HEAD, never to an unmerged working branch.
- **Personal branch** — a long-lived `<git-user>/dev` branch per developer, rebased onto `main`. Used instead of creating a new branch per task.
- **Feature branch** — a short-lived branch off `dev` (or `main`), used for repos that need PR review before merging.
- **Push helper** — a script that validates branch policy, pushes the submodule, and optionally updates the hub pointer.

### Push flow

```
1. Commit inside the submodule
2. Run tests
3. Push via helper: bash/push-submodule.sh <submodule> "<message>"
4. Helper pushes the branch and prints a compare link
5. User merges the PR
6. Only then: yarn update:pointer <submodule> (moves hub pointer to merged base branch HEAD)
7. Hub pointer commit is pushed automatically
```

### Multi-submodule push order

Push dependencies first. If repo B depends on repo A, push A first, then B.

When multiple submodules are merged and ready, batch them into one pointer update: `yarn update:pointer repoA repoB repoC` — one hub commit, one push.

---

## Git Workflow Rules (Portable)

### Before Starting Work

- Before reconstructing a Git/sync workflow manually, check whether a hub helper script already exists.
- After switching to the working branch, sync the latest base branch into it so the branch starts from current state (prefer rebase over merge).
- If pull/sync fails because of divergent branches or non-fast-forward history:
  1. Protect local work with a commit or a descriptive stash
  2. `git fetch`
  3. `git pull --rebase` or `git rebase origin/<branch>`
  4. Resolve conflicts
  5. Retry the blocked push
- Do not treat sync errors as terminal by default.
- Never force push a shared branch.

### Branch Policy Patterns

Define per-repo branch policies. Common patterns:

- **Personal branch repos**: use `<git-user>/dev` off `main`, never commit directly to `main`. Reuse the same branch for all work unless isolation is explicitly needed.
- **Feature branch repos**: work on a feature branch off `dev` (or `main`), never commit directly to `dev` or `main`.
- **Direct-commit repos**: commit directly to `main` (small repos, single maintainer).
- **Repos with local workflow docs**: read the repo-local `GIT_WORKFLOW.md` and follow it as source of truth.

### Push Rules

- NEVER manually run `git add <submodule> && git commit && git push` for hub pointer updates. Always use helper scripts — they enforce branch policy, validate pointers, and sync before pushing.
- Never push the hub before the submodule commit exists on the remote.
- Never merge the working branch into `main` or `dev` yourself unless the user explicitly asks.
- After pushing a working branch, hand off a compare link and let the user merge.
- When changes span multiple submodules, push them one at a time, dependencies first.

### Pointer Update Precondition

Never update the hub pointer while the submodule is on a working branch. The correct sequence:
1. Push the working branch
2. Merge it to the base branch via PR
3. Only then run the pointer update

If the user says "update pointers" after pushing working branches, check which branches still need merging first. Only update pointers for already-merged submodules.

### Safe Sync Rules

- Prefer rebase over merge for routine sync recovery.
- If unstaged changes block a pull or rebase, stash them with a descriptive message and re-apply immediately after syncing.
- If local commits are behind remote, rebase them onto the remote branch rather than creating a merge commit.
- If a non-fast-forward push is rejected, fetch/rebase and retry the push.
- Only stop and ask the user if conflict resolution would require changing unrelated user work you cannot safely separate.

### Staging Rules

- Never use `git add .` or `git add -A` at the hub root — it can accidentally stage submodule pointer changes.
- Never manually commit submodule pointer changes — use helper scripts that validate the pointer.
- Never commit `.env` files, only `.env.example`.
- Never add `Co-Authored-By` or other AI attribution.
- Never use destructive history-editing commands unless the user explicitly asks.
- Never run `git reset HEAD`, `git checkout -- .`, `git clean -fd`, `git restore --staged .`, or other commands that discard uncommitted changes. If the working tree is dirty from a bad merge or conflict, explain the situation and ask the user to execute the cleanup. Stashing is acceptable; discarding is not.
- Always verify the current branch before committing. Committing on a detached HEAD leads to recovery chains that invite destructive cleanup.

### Compare Link Handoff

After pushing a branch that should be reviewed or merged:
- Provide the branch name
- Provide a compare link against the correct base branch
- Do not open or complete the merge on the user's behalf

### Hub Pull Rule

```bash
git pull --rebase && git submodule update --init --recursive
```

---

## Recommended Hub Helper Scripts

Build these as `bash/` scripts in your hub:

| Script | Purpose |
|--------|---------|
| `push-submodule.sh <repo> "<msg>"` | Validate branch policy, push submodule, optionally update hub pointer |
| `update-submodule-pointer.sh <repo>` | Validate submodule is on base branch, update hub pointer, push hub |
| `status-all.sh` | Print branch + dirty state for hub and all submodules |
| `branch-personal.sh <repo>` | Create or reuse `<git-user>/dev`, rebase onto base branch |
| `pending-prs.sh` | List submodules with working branches that need merging |
| `worktree-safety.sh` | Detect dirty repos, detached HEADs, stale worktrees |
| `kill-port.sh <port>` | Kill stale dev server processes on a port |

### Script design principles

- Log the resolved target path so the user can verify which repo is affected.
- Refuse to proceed when the submodule has unrelated local changes (`ensure_clean_repo` check). Don't bypass — stash first.
- Print compare links after every push.
- Batch pointer updates when multiple submodules are ready together.
- Never force push. Never skip hooks.
