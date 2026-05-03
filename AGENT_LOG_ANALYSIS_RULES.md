# Agent Log Analysis Rules

Use these rules when analyzing agent chat logs, rollout JSONL files, agent-viewer exports, CI-agent traces, or workflow transcripts to improve agent instructions, helper scripts, validators, or repo structure.

## Goal

Find reusable workflow waste that should be fixed at the instruction, helper, validator, or repo-structure level. Do not produce only a one-off session summary.

Prioritize issues that repeatedly cost:

- extra tool calls
- extra context tokens
- extra latency
- extra human supervision
- fragile recovery steps
- failed or partial handoffs
- avoidable validation repair loops

## Source Of Truth

Before judging the log, freeze the original user request.

Record:

- the exact user ask
- explicit deliverables
- constraints and preferences
- non-goals
- target repos/files/workflows
- expected completion state
- any ambiguity or assumption

Treat each meaningful part of the user's wording as potentially binding. Check whether every requested action, constraint, preference, and success condition was noticed, interpreted correctly, and handled.

## First-Pass Workflow

1. Run the project's reusable log analyzer first if one exists.

   Example:

   ```bash
   yarn agent:analyze-log <rollout.jsonl> --all
   ```

2. If the user mainly asks what to improve in the agent flow, use the focused workflow-waste mode first.

   Example:

   ```bash
   yarn agent:analyze-log <rollout.jsonl> --workflow-waste
   ```

3. Inspect only the cited log lines first, then widen context where needed.

4. If repo context is needed, use a read-only safety/context command that does not move branches, update submodules, or mutate worktrees.

5. Avoid ad hoc raw-log scraping when a maintained analyzer or cleaned export exists.

6. Ignore log noise first: token counts, encrypted reasoning payloads, bulky session metadata, and repeated system/developer blocks unless they directly explain the failure.

7. Track both total command count and time-to-first-correct-action. Many workflow regressions show up as delayed use of the right helper before they show up as total command volume.

## Required Analysis Shape

For every log review, produce:

- request coverage assessment
- compact timeline
- waste pattern clusters
- missed-helper or missing-helper findings
- validation/final-handoff assessment
- smallest reusable fixes
- residual risks or open assumptions

Do not lead with changed files or command volume unless those are the actual problem.

Rank findings by leverage. Put high-frequency, high-latency, high-risk, and high-supervision problems first.

End the result with workspace or repo state when it matters to the analysis. If a recommended fix requires cleaning, checking out, or moving a dirty repo, ask before doing that cleanup and name the exact repo/path.

## Request Coverage Checklist

For each user-request item, mark it as:

- handled correctly
- handled late
- handled incorrectly
- not handled

Call out:

- exact wording that was missed or under-weighted
- whether the agent ignored it, reinterpreted it, or forgot it later
- whether better instructions, a helper, or a validator would have prevented the miss

If the agent emitted a completion signal after a failed validator, blocked state, or explicitly partial result, treat that as a coverage gap unless the user clearly requested a partial handoff.

## Workflow Waste To Look For

### Repeated Ad Hoc Command Sequences

Flag manual command clusters that should become a helper, script, or documented one-liner.

Examples:

- repeated multi-repo status checks
- repeated branch or remote probing before push
- repeated `git -C` loops
- repeated search/read sequences for one stable question
- repeated cleanup or recovery flows after common failures

For each candidate, decide whether the fix belongs in:

- a repo script
- a root workspace helper
- a validator
- a workflow instruction

### Simple Task Became Many Attempts

Flag when a small request caused excessive exploration, retries, or planning.

Examples:

- user asked to push, but the agent ran many git probes instead of the push helper
- user asked for status, but the agent read unrelated files
- user asked for one command output, but the agent planned instead of executing

### Context Waste

Flag large reads that did not materially help.

Examples:

- repeatedly reading huge instruction files
- opening full source files when targeted search plus a narrow window would work
- using raw logs when a cleaned export exists
- pasting full command output where a summary helper exists

Prefer fixes such as:

- split large docs
- add routing rules
- add a summary command
- recommend cleaned exports first

### Avoidable Serial Exploration

Flag serial read-only probing that should have been aggregated or parallelized.

Examples:

- many per-repo status calls instead of one workspace status helper
- repo-by-repo search instead of one cross-repo search
- repeated file existence checks instead of `rg --files`

### Failure-Recovery Friction

Look for improvised recovery around common blockers.

Examples:

- dirty worktree blocked pull
- detached HEAD confusion
- wrong working directory
- stale worktree checkout conflict
- branch mismatch before pointer update
- validator failure treated as handoff instead of repair input

Decide whether:

- an existing helper was missed
- a helper is missing
- an instruction needs a stop condition and recovery sequence
- a validator should make the bad state impossible to publish

### Instruction Drift Or Overload

Flag cases where instructions caused waste.

Examples:

- important rules buried in long files
- overlapping or conflicting instruction sources
- rule says "use helper X", but helper X is absent or unclear
- agent repeatedly rereads large instruction blocks

Prefer:

- short top-level routing rules
- focused workflow docs
- executable helpers over long prose
- concise, testable rules

### Symptom-Adjacent Waste

When the user reports one visible symptom, inspect nearby tool calls, writes, validation output, and retries for independent flow waste.

Examples:

- temporary executable scripts for one-off writing
- create-run-debug-delete loops
- manual Markdown/JSON repairs that need structured helpers
- generated evidence hand-edited instead of regenerated
- screenshots or provenance files invented to satisfy validation
- final handoff after failed validation

If the user later says "fix all of it," preserve these adjacent findings as implementation requirements.

## Regression Analysis Rules

When the user asks what recent agent-flow change caused a regression:

1. Extract commits, compare links, branch pushes, and `git diff` output from the rollout.
2. Inspect the relevant diffs or blame.
3. Identify the behavior boundary that changed.
4. Check validators, final gates, staged-authoring helpers, screenshot helpers, evidence collectors, and instructions.
5. Do not guess from memory or commit titles alone.

When a user reports a regression in generated or authored artifacts:

- compare against the previous known-good commit
- check whether validation passed because the artifact was correct or because the validator allowed a weaker shape
- separate generated evidence, authored prose, copied artifacts, runtime files, and validation metadata
- prefer adding a regression test for the exact failure mode before fixing the helper
- rerun the failing real packet or rollout after the fix

Preserve concrete regression cases as examples, not broad advice. When a new rollout repeats a known pattern, treat it as a tooling, validator, or instruction regression candidate and check whether a helper or guardrail should make the bad state impossible.

Examples of concrete regression patterns to preserve:

- a root summary drops an expected impact section while group files still include it
- screenshots or visual evidence are removed while prose still claims visual review
- generated packet examples are mistaken for real authored evidence
- broad authored prose is rewritten through temporary scripts instead of a staged authoring flow
- translation or sign-off stages overwrite already-finalized source-language content
- validation failures are pushed as a known-invalid partial handoff
- runtime environment from one repo leaks into another repo's helper commands

## Generated Vs Authored Ownership

Keep ownership boundaries explicit.

- Generated evidence may be refreshed by collectors.
- Authored outputs must be preserved unless the user asked to rewrite them.
- Do not hand-edit generated packet/evidence data to satisfy validators.
- If authored files contain stale generated scaffolding, replace the scaffolding cleanly.
- Broad authored rewrites should use a staged authoring workflow if one exists.
- Small authored repairs should use exact-context patches.

## Validation And Handoff Rules

Do not report work complete when required validation failed.

A final handoff is complete only when:

- required artifacts exist
- required validators pass
- required proof-loop or final-gate verdict is PASS
- reported completion state matches files on disk
- no known-invalid partial state was pushed as final

If validation fails:

1. Treat the validator output as the next repair input.
2. Make the smallest targeted fix.
3. Rerun validation.
4. Continue until PASS or until a real blocker exists.

A generic "push changes" request is not permission to push a known-invalid artifact unless the user explicitly requested a partial handoff.

If a proof-loop, final-gate, or run-to-pass helper exists, use it before handoff. If it writes a problems file, continue repairs from that file until the verdict is PASS or a real blocker remains.

## Screenshot / Evidence Guardrails

If a workflow uses screenshots or visual evidence:

- do not create placeholder screenshots, copied PNGs, local-only provenance, fake source specs, or hand-edited packet evidence to satisfy validation
- use tracked real E2E artifacts, tracked review artifacts, or remove the unsupported screenshot claim
- if an attach helper refuses a screenshot, run the diagnostic helper if available
- screenshot refresh unresolved lines are handoff blockers
- prose-only screenshot mentions must not replace required embedded evidence
- generated packet examples must not be counted as real screenshot embeds

## Temporary Script Guardrails

Flag as workflow waste:

- creating temporary generator scripts in `/tmp`, `/private/tmp`, or authored output folders
- patching temporary executable scripts repeatedly
- using shell regex one-liners for fragile Markdown/JSON prose repairs
- create-run-delete loops for one-off transformations

Prefer structured helpers, staged authoring, or exact-context patches.

## Evidence Rules

- Quote only the minimum log snippets needed to prove the pattern.
- Do not dump full logs into the report.
- Prefer counts and concise examples, such as "7 git probes before the first push attempt" or "3 large file reads where one targeted search would have answered the question."
- Separate observed evidence from inference.
- Use cleaned exports when they preserve the evidence needed.
- If raw logs are required, inspect narrowly and summarize.

## Output Format For Findings

For each finding, include:

- title
- severity or priority
- evidence from specific log lines or events
- user-request impact
- root cause
- reusable fix
- whether the fix should be instruction, helper, validator, or test
- residual risk

Order findings by impact, not chronology.

## Recommended Report Template

Use this report shape unless the user asks for something narrower:

```md
## Source Request

- Original user request:
- Scope analyzed:
- Assumptions:

## Request Coverage

- User wording:
- Coverage status:
- Evidence:
- Proposed fix if not handled correctly:

## High-Leverage Findings

### Finding Title

- Why it is wasteful:
- Evidence:
- Root cause:
- Recommended fix type:
- Concrete proposed change:

## Proposed Instruction Changes

- Exact instruction addition/removal/rewrite:
- Where it should live:

## Proposed Repo Helpers

- Helper name:
- What it should do:
- Repeated pattern it replaces:

## Context Hygiene Fixes

- Reads that should become narrower:
- Docs that should be split or summarized:
- When cleaned exports should be preferred:

## Residual Risks

- One-off ambiguity or remaining uncertainty:

## Workspace State

- Dirty or blocked repos relevant to the analysis:
```

## Decision Rules

- Recommend an instruction change when the agent failed to honor meaningful user wording and the miss could be prevented by a durable parsing or alignment rule.
- Recommend an instruction change when the right helper already exists but the agent did not use it.
- Recommend a helper when the agent had to reconstruct the same command family manually.
- Recommend a validator or final gate when a bad artifact shape passed existing checks.
- Recommend doc splitting when large stable files are repeatedly opened only for a small subsection.
- Recommend no change when the extra work was caused by genuinely ambiguous requirements or necessary investigation.

## Quality Bar

A good agent-log analysis should answer:

- Did the agent satisfy the actual user request?
- Where did it waste time, tokens, or tool calls?
- Which existing helper or rule did it miss?
- Which missing helper, validator, or instruction would prevent recurrence?
- Did validation prove correctness, or only allow a weak artifact shape?
- Did the agent stop too early?
- Did it create new risk while repairing the visible problem?
- What is the smallest durable fix?
