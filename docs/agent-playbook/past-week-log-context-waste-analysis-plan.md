# Past-Week Log Context-Waste Analysis Plan

## Table Of Contents

- [Goal](#goal)
- [Source Of Truth](#source-of-truth)
- [Outputs](#outputs)
- [Metrics](#metrics)
- [Sub-Agent Workstreams](#sub-agent-workstreams)
- [Execution Sequence](#execution-sequence)
- [Ranking Method](#ranking-method)
- [Final Report Shape](#final-report-shape)
- [Verification](#verification)
- [Open Assumptions](#open-assumptions)

## Goal

Identify which agent logs from the past week caused the largest avoidable context-token waste, then explain the reusable workflow fixes that would prevent similar waste.

This is an analysis-only workflow. Sub-agents may read logs, exports, scripts, and repo documentation, but should not edit product code, move branches, update submodules, clean worktrees, or mutate source logs.

## Source Of Truth

Before dispatching sub-agents, the coordinator freezes the request:

- User ask: analyze logs from the past week and find which logs created the largest waste of context tokens.
- Default time window: the rolling seven-day period ending on July 10, 2026. Freeze exact start and end timestamps in the run manifest before analysis begins.
- Primary target: agent logs, rollout JSONL files, agent-viewer exports, and workflow transcripts.
- Required result: ranked log/session findings, with token-waste evidence and reusable prevention recommendations.
- Non-goal: summarizing every session equally. The work should prioritize the biggest context-token waste and the causes behind it.

If multiple log stores exist, prefer maintained analyzer output or cleaned exports before raw logs.

## Outputs

Create these artifacts under a dated analysis folder, for example `docs/handoff/context-waste-2026-07-10/`:

- `run-manifest.md`: exact date window, source locations inspected, excluded sources, assumptions, and sub-agent assignments.
- `candidate-index.json`: one record per candidate log/session with path, timestamp, repo/workflow if known, total token indicators, tool-call counts, and first-pass waste score.
- `top-context-waste.md`: ranked findings for the highest-waste logs.
- `subagent-notes/`: one Markdown note per sub-agent containing evidence, line references, and confidence.
- `fix-backlog.md`: smallest reusable fixes, grouped by instruction change, helper/script, validator, or repo-structure change.

## Metrics

Measure both absolute cost and avoidability:

- Total context volume: prompt/input tokens if available, transcript byte size as fallback, and repeated system/developer/instruction payload size when visible.
- Avoidable context volume: large reads that did not materially help, repeated instruction reads, repeated raw-log dumps, full-file reads where targeted windows would work, repeated command output pasted into context, and duplicate metadata blocks.
- Tool waste: read-only commands that could have been batched, serial repo probing, repeated failed commands, and unnecessary broad searches.
- Recovery loops: validation failures, wrong-directory work, branch confusion, dirty-worktree blockers, or retries that added context without progressing.
- Delay to useful action: number of turns/tool calls before the agent used the right helper, route, analyzer, or target repo.

Use token counts where logs expose them. Otherwise estimate with a consistent method and mark estimates clearly.

## Sub-Agent Workstreams

### Coordinator

Inputs: user request, this plan, log-analysis rules, available analyzer commands, and all sub-agent outputs.

Outputs: `run-manifest.md`, final ranked report, and final recommendations.

Write scope: analysis folder only.

Completion criteria: every top finding has evidence, a waste category, estimated or actual context cost, root cause, and a reusable fix.

### Inventory Agent

Inputs: log roots, agent-viewer exports, rollout JSONL files, filesystem metadata, and analyzer availability.

Outputs: `candidate-index.json` with all logs in the frozen time window.

Write scope: `candidate-index.json` and inventory notes only.

Completion criteria: all included and excluded sources are listed with reason, and each candidate has enough metadata for scoring.

### Analyzer Agent

Inputs: `candidate-index.json`, reusable analyzer output, and cleaned exports.

Outputs: first-pass metrics for every candidate log/session.

Write scope: analyzer notes only.

Completion criteria: candidates are ranked by likely context waste using uniform metrics, with the top cohort selected for deep review.

### Deep-Dive Agents

Inputs: assigned top candidate logs, analyzer citations, and narrow surrounding context.

Outputs: one evidence note per assigned log.

Write scope: assigned note files only.

Completion criteria: each note freezes the original user request, gives a compact timeline, identifies concrete context-waste moments, and cites log lines or stable excerpts.

Parallelism: run multiple deep-dive agents in parallel after the first-pass ranking is complete. Assign non-overlapping log sets to avoid duplicate reading.

### Pattern-Synthesis Agent

Inputs: all deep-dive notes and candidate metrics.

Outputs: clustered waste patterns and reusable fixes.

Write scope: synthesis note and `fix-backlog.md`.

Completion criteria: findings are grouped by leverage, not by chronology, and each proposed fix names the likely owner: instruction, helper, validator, analyzer, or repo structure.

### QA Agent

Inputs: final draft report, all cited notes, and source references.

Outputs: QA checklist appended to the final report.

Write scope: QA note only, unless the coordinator asks for report corrections.

Completion criteria: every ranked claim is traceable to evidence, estimates are labeled, and no raw source log has been modified.

## Execution Sequence

1. Coordinator freezes the exact seven-day date window and creates `run-manifest.md`.
2. Inventory Agent discovers logs and cleaned exports, without broad raw-log scraping when a maintained analyzer exists.
3. Analyzer Agent runs reusable analyzers first, then scores every candidate.
4. Coordinator selects the top cohort for deep review. Suggested default: top 10 by estimated avoidable context tokens, plus any outlier with unusually high tool-call count or recovery-loop count.
5. Deep-Dive Agents inspect only cited lines first, widening context only when needed to understand cause.
6. Pattern-Synthesis Agent clusters the causes across logs and drafts reusable fixes.
7. QA Agent verifies evidence, rankings, and scope control.
8. Coordinator publishes `top-context-waste.md` and `fix-backlog.md`.

## Ranking Method

Rank each log with a weighted score:

```text
context_waste_score =
  avoidable_context_tokens_or_estimate
  + repeated_instruction_tokens_or_estimate
  + 500 * avoidable_tool_calls
  + 1000 * failed_recovery_loops
  + 750 * missed_helper_events
```

Then report both:

- `absolute waste`: the logs that likely burned the most context overall.
- `fix leverage`: the logs whose causes are most reusable across future workflows.

Do not let a very large but necessary transcript outrank a smaller session with clearly preventable repeated context loading unless the absolute waste difference is material.

## Final Report Shape

The final report should follow the log-analysis playbook:

- Request coverage assessment.
- Compact timeline of the analysis workflow.
- Ranked top context-waste logs.
- Waste pattern clusters.
- Missed-helper or missing-helper findings.
- Validation and final-handoff assessment for the reviewed sessions.
- Smallest reusable fixes.
- Residual risks and open assumptions.
- Workspace or repo state, if it affected analysis.

Each top-log finding should include:

- log/session identifier and timestamp
- estimated or actual wasted context tokens
- confidence level
- why it was waste, not merely large context
- the first moment where the workflow should have narrowed, batched, or used a helper
- recommended reusable fix

## Verification

- Re-run or review analyzer output after the final top cohort is selected.
- Spot-check at least two low-ranked logs to make sure the scorer is not missing a different waste shape.
- Confirm all date-window inclusions and exclusions from filesystem metadata or log timestamps.
- Confirm no sub-agent modified source logs, branches, submodule pointers, or product files.
- Confirm final claims cite stable paths, log line numbers, analyzer output IDs, or exact session identifiers.

## Open Assumptions

- The phrase "past week" means the rolling seven-day period ending July 10, 2026 unless the user specifies a different window.
- Token counts may not be present in every log; transcript byte size and repeated-block size are acceptable fallback estimates if labeled.
- The coordinator remains responsible for integration and final judgment; sub-agents provide evidence and draft findings, not final ranking authority.
