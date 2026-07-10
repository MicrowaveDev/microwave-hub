# Past-Week Log Context-Waste Analysis Plan

## Goal

Build a repeatable pipeline that scans every agent log in a frozen seven-day window, ranks the sessions and task trees most likely to contain avoidable context use, and sends only compact evidence packets to parallel sub-agents for causal review.

The pipeline must distinguish three different questions:

1. Which sessions consumed the most input tokens?
2. Which sessions contain the strongest deterministic signals of avoidable work?
3. Which recurring causes offer the highest-value reusable fixes?

These rankings must remain separate. A large successful task is not automatically wasteful, and a heuristic event count is not a token estimate.

This is an analysis-only workflow. The scanner and sub-agents may write only to the dated analysis folder. They must not edit source logs, product code, branches, worktrees, or submodule pointers.

## Frozen Inputs

Before implementation or dispatch, create `run-manifest.json` containing:

- exact inclusive start and exclusive end timestamps, with timezone
- discovered log roots and accepted formats
- paths included and excluded, with reasons
- analyzer version and Git commit
- scoring configuration and packet limits
- requested outputs and non-goals

Default window for this run: the rolling seven-day period ending July 10, 2026. The coordinator must replace this prose default with exact timestamps in the manifest.

The current Codex source is `~/.codex/sessions/**/rollout-*.jsonl`. The initial inventory found hundreds of candidate files, so no language-model agent should inventory or read the full corpus directly.

## Architecture

```text
raw logs (read-only)
  -> deterministic scanner
  -> session index + task-tree index + evidence packets
  -> calibration sample
  -> parallel deep-dive sub-agents
  -> independent QA sample
  -> deterministic aggregation
  -> coordinator synthesis
```

The deterministic scanner owns exhaustive work. Sub-agents receive normalized packets and use judgment only where causality, necessity, or the best reusable fix cannot be decided from counts alone.

## Implementation Phase

Add a streaming scanner in `agent-viewer`, for example:

```bash
yarn agent:rank-context-waste \
  --since 2026-07-03T00:00:00+01:00 \
  --until 2026-07-11T00:00:00+01:00 \
  --output <analysis-folder>
```

Prefer extending shared parsing functions from `scripts/analyze-log.mjs` over creating a second incompatible parser. The new command must process files sequentially or with bounded concurrency and must never concatenate raw logs into one prompt or output.

The scanner should produce:

- `run-manifest.json`: reproducible inputs and configuration
- `sessions.jsonl`: one normalized record per physical log
- `task-trees.jsonl`: parent/cohort grouping for coordinators and sub-agents
- `rankings.json`: deterministic rankings and selected review cohorts
- `packets/<session-id>.json`: bounded evidence for sub-agent review
- `scanner-warnings.json`: malformed records, uncertain grouping, and unsupported formats

Add fixture-based tests for token accounting, duplicate token events, large-output detection, command-family normalization, date boundaries, malformed JSONL, and task-tree grouping.

## Deterministic Measurements

For each session, record actual values when present:

- final cumulative `input_tokens`, `cached_input_tokens`, `output_tokens`, and `reasoning_output_tokens`
- per-turn `last_token_usage`, deduplicated when identical `token_count` events repeat
- session duration, turn count, tool-call count, failure count, and completion count
- bytes by record class and tool-output bytes returned to the model
- first user request, working directory, model, session ID, and timestamps

Do not sum cumulative `total_token_usage` snapshots. Use the final valid cumulative snapshot, and use deduplicated `last_token_usage` only for turn-level attribution.

Calculate token-facing measures without claiming they are all avoidable:

```text
uncached_input_tokens = max(0, input_tokens - cached_input_tokens)
context_replay_tokens = sum(deduplicated per-turn input_tokens after the first model turn)
large_output_bytes = sum(tool outputs above the configured threshold)
```

The scanner should detect deterministic waste signals with line references:

- repeated identical or near-identical tool calls
- repeated reads of the same file or instruction source
- broad reads followed by narrower reads of the same material
- tool outputs above size thresholds
- serial read-only calls that match a known batch/helper opportunity
- failed command followed by equivalent retries
- repeated validation failures or recovery loops
- delayed use of a helper explicitly named in in-scope instructions
- completion emitted after a failed required validator
- duplicate user/system/developer payloads when they explain context growth

Each signal must include a rule ID, log line numbers, raw measurable quantity, and confidence. Keep heuristic detection versioned and auditable.

## Task-Tree Grouping

Rank both physical sessions and logical task trees. Sub-agent runs can create many files with similar timestamps; treating each file as an independent user task can double-count one workflow and distort the leaderboard.

Use explicit parent/thread metadata when available. Otherwise create a conservative cohort key from time overlap, originator, working directory, source request fingerprint, and any sub-agent tool-call identifiers. Mark inferred relationships with confidence and never merge uncertain sessions silently.

The task-tree record should report:

- coordinator session and child sessions
- total measured tokens across the tree
- wall-clock span and peak parallelism
- duplicated context across children, when measurable
- child outputs that were never used by the coordinator
- grouping evidence and confidence

## Evidence Packets

Sub-agents should not receive complete raw logs by default. Each packet should fit a fixed budget and contain:

- frozen user request and session metadata
- measured token totals and per-turn deltas
- compact chronological tool-call table
- deterministic signal list with line references
- normalized command families and file-read targets
- bounded excerpts around each cited event
- completion and validation state
- related task-tree summary

Default packet cap: 12,000 tokens or 50 cited events, whichever comes first. Redact base64, encrypted reasoning, secrets, bulky metadata, and unrelated repeated instruction blocks. Preserve stable source paths and line numbers.

A reviewer may request one bounded raw-log window only when the packet cannot establish whether an operation was necessary. Record every escalation in the review note so packet quality can be improved later.

## Calibration Before Fan-Out

Before launching the full review cohort, have two sub-agents independently review the same stratified sample:

- two high-token sessions
- two high-signal sessions
- one low-ranked control
- one inferred multi-session task tree

Compare their labels for necessity, waste category, and confidence. The coordinator resolves disagreements, updates detector thresholds or packet fields, freezes scoring version `v1`, and regenerates all packets. Do not tune rules after seeing only the desired top results.

This calibration prevents a flawed heuristic from being multiplied across many parallel reviewers.

## Parallel Sub-Agent Plan

### Coordinator

Owns the manifest, cohort selection, conflict resolution, and final synthesis. It does not manually scan the corpus.

### Deep-Dive Reviewers

Dispatch reviewers only after calibration. Give each reviewer non-overlapping packets, a fixed rubric, and no more than three ordinary sessions or one large task tree per assignment. Run assignments in parallel up to the environment's safe concurrency limit.

Each review note must use this schema:

- request coverage: handled correctly, late, incorrectly, or not handled
- verdict: necessary cost, likely waste, confirmed waste, or insufficient evidence
- avoidable-token range: low, likely, and high estimate, with method
- cited waste events and first avoidable decision
- root cause: instruction, missing helper, missed helper, validator, routing, or task design
- smallest reusable fix
- confidence and raw-window escalations

Reviewers estimate avoidable tokens only from attributable turn deltas. They must not convert tool calls or failures into invented token amounts.

### Pattern Synthesizers

After deep dives finish, dispatch two synthesis agents over the review notes, not raw logs. One clusters recurring causes and owners; the other looks for counterexamples, false positives, and fixes that would merely move cost elsewhere.

### QA Reviewer

Independently verify all top-five findings, a random 10% of other reviewed findings, and at least five low-ranked controls. QA checks citations, token arithmetic, task-tree grouping, request coverage, and whether the proposed fix is reusable.

### Coordinator Finalization

The coordinator resolves disagreements using source windows, then runs a deterministic aggregator to produce tables. Narrative synthesis comes after the numbers are frozen.

## Cohort Selection

Do not use a single weighted score with arbitrary token equivalents. Select overlapping cohorts so different waste shapes survive triage:

- top 15 sessions by actual input tokens
- top 15 by uncached input tokens
- top 15 by large tool-output bytes
- top 15 by repeated-read/retry signal count
- top 10 by failure and recovery-loop count
- top 10 task trees by duplicated child context or unused child work
- five random low-signal controls

Deduplicate the union by task tree. If the union is too large, cap it with stratified sampling while retaining every extreme outlier. Publish the selection rule and excluded count.

After human review, publish separate leaderboards:

- absolute context cost
- estimated avoidable context tokens, with ranges
- waste rate: avoidable input divided by total input
- recurrence leverage: similar confirmed events across distinct task trees
- latency/supervision impact

## Final Outputs

Write these artifacts under `docs/handoff/context-waste-2026-07-10/`:

- `methodology.md`: data window, parser version, grouping, calibration, thresholds, and limitations
- `top-context-waste.md`: ranked session and task-tree findings
- `pattern-clusters.md`: recurring causes, counterexamples, and prevalence
- `fix-backlog.md`: smallest fixes grouped by instruction, helper, validator, analyzer, or repo structure
- `subagent-notes/`: schema-valid review and synthesis notes
- the deterministic scanner outputs listed above

The final report must follow `AGENT_LOG_ANALYSIS_RULES.md`: request coverage, compact timeline, waste clusters, helper findings, validation/handoff assessment, reusable fixes, residual risks, and relevant workspace state.

For every top finding report the session/task-tree ID, actual token cost, avoidable-token range, confidence, cited evidence, why the work was avoidable, the first better action, and the reusable fix.

## Acceptance Criteria

- Re-running the scanner with the same manifest produces byte-stable normalized records and rankings.
- Every source file in the date window is included once or excluded with a reason.
- Duplicate `token_count` events and cumulative snapshots do not inflate totals.
- Physical sessions and logical task trees are both visible, with uncertain grouping labeled.
- No sub-agent receives the entire weekly corpus or an unbounded raw log.
- At least two reviewers calibrate on the same sample before fan-out.
- Top-five findings and low-ranked controls receive independent QA.
- Every avoidable-token estimate is a range tied to measured per-turn deltas.
- Heuristic event weights are never presented as tokens.
- Source logs and unrelated workspace state remain unchanged.

## Residual Risks

- Logs may not expose enough parent-child metadata for definitive task-tree grouping.
- Cached-input accounting indicates billing/cache behavior, not whether context was useful.
- A tool output can be large but necessary; deterministic rules identify candidates, not guilt.
- Some wasted reasoning is not observable from tool calls or token counters.
- Cross-provider logs may require format-specific adapters before their metrics are comparable.
