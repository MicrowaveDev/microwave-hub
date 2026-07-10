# Context-Waste Analysis Methodology

## Frozen Scope

- Inclusive start: `2026-07-03T20:41:34.000Z`
- Exclusive end: `2026-07-10T20:41:34.000Z`
- Local interpretation: rolling seven days ending July 10, 2026 at 21:41:34 Europe/Lisbon time
- Source: `~/.codex/sessions/**/rollout-*.jsonl`
- Included: 278 physical sessions
- Excluded: 198 files outside the window or without an in-window event
- Logical task trees: 21, using explicit `session_meta.parent_thread_id` ancestry only

The source logs were read-only. Scanner outputs and reviewer notes are the only generated artifacts.

## Deterministic Pass

The `agent-viewer` command `yarn agent:rank-context-waste` streams each JSONL file and emits normalized session records, explicit task trees, independent metric rankings, warnings, and bounded evidence packets.

Token accounting uses the sum of deduplicated `last_token_usage` records inside the frozen window. Cumulative `total_token_usage` snapshots are retained only as source metadata and are never summed. For forked sub-agents, the scanner preserves the first physical-session metadata record and excludes the initial inherited-history burst before measuring child activity.

Measured corpus totals:

- input tokens: 2,217,230,414
- uncached input tokens: 118,085,326
- tool calls: 28,941
- tool failures: 34
- large tool-output bytes: 489,352,990

These are cost totals, not estimates of avoidable cost.

## Candidate Selection

The 41-packet review union includes independent cohorts for:

- highest input-token use
- highest uncached-input use
- largest tool outputs
- most task-local deterministic signals
- most failures/recovery signals
- top explicit task trees
- five deterministic low-signal controls

The detector does not assign arbitrary token values to tool calls or failures. Signals nominate review candidates; they do not prove waste.

## Calibration

Two reviewers independently assessed the same six-packet stratified sample. Both found that the pre-calibration detector counted repetition across unrelated tasks in long-running threads and erased meaningful queue parameters. One reviewer also found that unbounded turn-usage arrays violated the packet budget.

The frozen `v1-calibrated` detector therefore:

- resets repetition groups at user-request boundaries
- preserves wave, batch, worker, timeout, and path parameters
- separates searches from full-file reads
- records tool outcomes, output sizes, active requests, and final assistant context
- detects instruction rereads immediately after `task:context`
- includes only signal-linked events and nearby token deltas
- caps every packet below 48 KB

The original calibration notes are retained as evidence of the changes made before fan-out.

## Human Review

Reviewers use four verdicts: necessary cost, likely waste, confirmed waste, or insufficient evidence. Every avoidable-token estimate must be a low/likely/high range bounded by measured nearby turn deltas. Reviewers must identify the first avoidable decision, cite packet evidence, name the reusable root cause, and record any bounded raw-log escalation.

Review assignments are non-overlapping after calibration. Synthesis operates on review notes rather than raw logs. QA independently checks the top five findings, a 10% sample of other findings, and low-ranked controls.

## Limitations

- Cached-input accounting describes cache behavior, not usefulness.
- Large output and repeated operations may be required by a workflow.
- The 250 ms inherited-history cutoff for forked sub-agents is schema-informed but heuristic.
- Some reasoning waste is not observable from tool calls or token counters.
- Avoidable-token ranges cover attributable nearby turns and intentionally omit speculative downstream replay.
- Findings generalize only when the same cause recurs across distinct task trees.
