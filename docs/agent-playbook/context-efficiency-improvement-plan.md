# Agent Flow And Context-Efficiency Improvement Plan

## Goal

Reduce avoidable context loading, discovery loops, retries, and supervision in future agent tasks without weakening correctness, validation, or final handoff quality.

This plan turns the July 2026 context-waste analysis into implementation work. It prioritizes repeated, QA-supported causes and keeps speculative changes behind measured experiments.

## Evidence Baseline

The seven-day analysis covered 278 sessions and 21 task trees. The strongest reusable causes were:

1. Exact workflow prompts sometimes missed their required first action.
2. `task:context` was followed by redundant instruction reads because it did not declare what it loaded or whether output was complete.
3. Generated queue assignments omitted canonical batch selectors, absolute result paths, and narrow validators.
4. Status, search, schema, and raw-log commands returned much more data than the task needed.
5. Repeat detection did not always distinguish required state progression from retries.
6. Validation could pass file shape while missing request semantics or worker lifecycle state.

The analysis did not prove that fresh sub-agents are always cheaper than reused agents or that resumable orchestration always saves context. Those remain experiments.

## Success Measures

Measure behavior by task tree and active user task, not only by physical session.

Primary metrics:

- time to first correct route/helper
- tool calls before first correct action
- input and uncached-input tokens per completed task
- tool-output bytes returned to the model, including p50, p95, and maximum
- redundant instruction reads after a successful context load
- failed selector, wrong-path, and broad-schema discovery attempts
- validation-recovery loops
- incomplete child sessions without an explicit lifecycle outcome
- final responses linked to a governing request and passing validator

Correctness guardrails:

- completion rate must not fall
- required validation and final-gate pass rates must not fall
- partial results must remain explicitly labeled
- unique required media inspections must not be suppressed
- changing-state waits, validations, and wave commands must not be classified as retries

Initial targets for the first two weekly comparisons:

- 100% correct first action for exact production queue prompts
- zero full instruction rereads after a complete, untruncated `task:context` result
- zero failed batch-field guesses in generated queue workers
- zero worker result writes outside the assigned repo root
- p95 output below 20 KB for new summary/status modes
- 100% packet compliance with the 48 KB review budget
- 100% child sessions assigned a completed, failed, cancelled, superseded, or retryable outcome

Do not set an aggregate token-savings target until two comparable post-change weeks exist. Nearby token deltas are upper bounds, not causal savings.

## Dependency Order

Implement in this order:

```text
agent-viewer measurement contracts
  -> hub routing and context contracts
  -> artist-helper assignment and validation contracts
  -> bounded domain outputs
  -> orchestration experiments
  -> weekly regression gate
```

Measurement lands first so later changes can be evaluated against the same task-aware definitions. Hub routing lands before queue changes because every queue worker inherits that startup flow. Assignment contracts land before orchestration experiments so schema-discovery waste does not contaminate reuse measurements.

## Phase 0: Freeze Regression Cases

### 0.1 Create a compact regression corpus

Owner: `agent-viewer`

Convert representative packet shapes into synthetic, secret-free fixtures:

- exact route missed before `task:context`
- raw JSONL read before maintained analyzer
- unbounded status JSON followed by a targeted count
- successful `task:context` followed by duplicate instruction reads
- batch lookup using nonexistent `id`, `agentId`, or `batchId`
- wrong-root result write and correction
- changing-target waits that are necessary progress
- unique image inspections that are necessary input
- schema-valid image description without inspection provenance
- setup-only child with no result artifact

Acceptance:

- fixtures contain no copied private prompts, secrets, or raw production logs
- every detector rule has a positive and negative fixture
- expected task boundaries, route, lifecycle, and verdict candidates are explicit

### 0.2 Add a baseline comparison command

Owner: `agent-viewer`

Add a deterministic command that compares two scanner manifests and reports metric deltas by workflow and task tree. It should report measured changes without labeling all reductions as waste savings.

Suggested interface:

```bash
yarn agent:compare-context-runs <before-dir> <after-dir> --summary
```

Acceptance:

- output is bounded and stable
- changed scanner versions or incompatible windows are reported
- task completion and validation rates appear beside token and output reductions

## Phase 1: Deterministic Routing

### 1.1 Make exact routes executable

Owner: hub routing helpers and tests

Move exact production image-description and Threads prompt matching into a small deterministic route resolver. The resolver should return:

- target repo
- required first command
- allowed next workflow source
- prohibited pre-route probes

Suggested interface:

```bash
npm run route:task -- --json "<user request>"
```

The helper must not include the full user request in verbose output. It should return only the matched route ID and execution contract.

Acceptance:

- exact queue fixtures resolve to `artist-helper`
- first command is `npm run task:context -- artist-helper`
- portable instructions, `SUBMODULES.md`, README, package metadata, and repo discovery are rejected before the route
- unknown or approximate prompts fall back to normal routing rather than forcing a wrong match

### 1.2 Add route conformance checks

Owner: hub verifier

Extend hub verification with fixtures for known exact prompts. Keep the test data short and literal so routing changes are reviewable.

Acceptance:

- CI fails when the expected first command changes
- CI fails when an exact prompt becomes ambiguous
- route changes require updating the fixture and documented workflow together

## Phase 2: Explicit Context Contracts

### 2.1 Make `task:context` machine-readable

Owner: hub `task-context` helper

Add an optional JSON mode while preserving the current human-readable output.

Required fields:

```json
{
  "repo": "artist-helper",
  "instructionsLoaded": ["hub", "portable", "repo-local"],
  "workflowLoaded": ["manual-publish-queue"],
  "truncated": false,
  "safeToSkipInstructionReread": true,
  "warnings": []
}
```

The helper must distinguish successfully loaded sections from paths it merely discovered.

Acceptance:

- JSON and human output represent the same state
- truncation and missing files force `safeToSkipInstructionReread: false`
- a successful complete response permits a deterministic same-task reread warning
- existing callers remain compatible

### 2.2 Add a narrow reread guard

Owner: agent-flow instructions and `agent-viewer` detector

Warn only when the same active task rereads an instruction section that `task:context` declared complete and untruncated. Permit:

- a named omitted section
- a continuation window not emitted by the helper
- a changed local instruction file
- explicit user direction to reread

Acceptance:

- no blanket ban on `AGENTS.md`
- disjoint file windows are not duplicates
- cross-task instruction reads are not grouped together
- warning includes the loaded section and prior helper result

## Phase 3: Bounded Output Utilities

### 3.1 Establish an output-budget convention

Owner: hub portable instructions and helper library

Commands expected to produce variable-size output should support:

- `--summary` or field selection
- maximum rows/matches
- maximum bytes or tokens where practical
- saved full output with a compact model-facing summary
- an explicit `truncated` flag and path for bounded escalation

Do not wrap every shell command in a generic truncator. Add bounded modes to maintained commands where the semantics are known.

Default budgets:

- routine status or routing output: 8 KB
- implementation search summary: 20 KB
- review evidence packet: 48 KB
- larger output requires a saved artifact plus a compact summary

### 3.2 Improve rollout analysis entry points

Owner: `agent-viewer`

- make `--workflow-waste` the documented first command for workflow analysis
- add a bounded preview mode to the analyzer
- warn when a raw JSONL read occurs before the analyzer in an active log-analysis task
- keep cited raw-window escalation available after analyzer output

Acceptance:

- the raw-pre-read regression fixture fails
- analyzer preview exposes source request, key event types, and cited lines without dumping raw records
- encrypted reasoning, image payloads, and repeated metadata remain redacted

### 3.3 Add bounded domain status modes

Owners: relevant command owners, beginning with `artist-helper`

Prioritize existing commands that produced confirmed large outputs:

- production queue status: counts, current phase, blockers, and artifact paths
- queue plan status: remaining checklist items, touched components, and validation commands
- schema queries: selected fields and occurrence counts
- static-site debugging: named module boundaries, recent diffs, and configured validation commands

Acceptance:

- large-input fixtures keep model-facing output below the declared budget
- full data remains available as an artifact when needed
- summary output answers the common question without a second broad query

## Phase 4: Generated Queue Assignment Contract

### 4.1 Generate executable worker coordinates

Owner: `artist-helper`

Every generated worker assignment must include:

- canonical batch `label`
- exact copyable selector command
- assigned item count
- repo-absolute or repo-resolved result path
- narrow result validator command
- allowed source paths
- explicit prohibition on full-queue validation in worker mode

Prefer a maintained helper when the selector logic appears in multiple queue generators:

```bash
npm run queue:batch -- --input <queue.json> --label <label> --json
```

Acceptance:

- generated commands execute against fixture queues
- no worker needs to probe `id`, `agentId`, `batchId`, or dump all batches
- prompt, queue schema, helper, and validator are tested as one contract

### 4.2 Guard result paths

Owner: `artist-helper` result writer/validator

Resolve the output path once and reject writes outside the assigned repo root. Avoid adding a separate `pwd` call to every worker; perform the check inside the existing helper or validator.

Acceptance:

- hub-relative and parent-directory paths fail before writing
- the error reports the expected resolved path compactly
- valid generated paths require no extra discovery call

## Phase 5: Completion And Lifecycle Validation

### 5.1 Link child state to expected artifacts

Owners: queue coordinator and `agent-viewer`

Track each child as:

- running
- completed and artifact accepted
- failed
- cancelled
- superseded
- retryable because artifact is missing or invalid

A successful agent message is not enough; the expected artifact must exist and pass its narrow validator.

Acceptance:

- setup-only children cannot be counted as completed
- reassignment and retry ownership are explicit
- coordinator summaries show one compact row per assignment

### 5.2 Validate inspection provenance

Owner: `artist-helper` validation

For image-description work, link actual media-inspection tool events to assigned paths. Do not accept a worker-authored boolean as proof.

Acceptance:

- a described item without a matching inspection event fails the final gate
- unique required media reads remain valid and are not context-waste findings
- repeated inspection is flagged only when path, frame/purpose, and task state are equivalent

### 5.3 Link final responses to active requests

Owner: `agent-viewer` packet schema

Every final or completion in an analysis packet should include:

- active task index
- governing user request
- validation outcome
- child lifecycle summary when applicable
- whether the result supersedes an earlier request

Acceptance:

- packet validation fails when a final has no governing request
- long-lived sessions can be reviewed task by task
- coverage findings remain separate from runtime-waste findings

## Phase 6: Stateful Orchestration Utilities

### 6.1 Add a wave barrier

Owner: `artist-helper` production orchestration

Replace repeated manual polling with one helper that waits for a declared wave and returns a compact completion/failure table.

Suggested interface:

```bash
npm run queue:wait-wave -- --queue <queue.json> --wave <n>
```

The helper must treat changing target state as progress and must not hide timeouts or failed workers.

Acceptance:

- one invocation replaces repeated shrinking-target waits
- output stays under 8 KB
- failed, missing-artifact, and retryable states are distinct

### 6.2 Add phase telemetry before resume

Owner: production queue wrappers

Record stage start/end, input fingerprint, output artifact, validation result, and whether a rerun changed state. Do not implement automatic stage skipping until telemetry demonstrates repeated no-op work.

Acceptance:

- two weekly runs provide stage-level no-op rates
- idempotent stages have explicit invalidation rules
- one final end-to-end validation always runs

## Phase 7: Controlled Experiments

### 7.1 Compare worker context strategies

Owner: queue orchestration/runtime

Run equivalent batches using:

- reused worker context
- reset/compacted worker context
- fresh worker context

Measure billed input, uncached input, latency, output correctness, startup calls, and human intervention. Pass only exact batch coordinates so schema discovery does not bias the experiment.

Decision rule:

- adopt fresh or reset workers only when total cost and latency improve without reducing completion quality
- retain reuse when startup and handoff cost outweigh replay

### 7.2 Evaluate conditional instruction suppression

Owner: hub task-context flow

Compare tasks with and without the reread warning after complete helper output. Track false warnings and missed changed instructions.

Decision rule:

- enforce only after two weekly samples show no correctness regression

## Phase 8: Weekly Regression Gate

Owner: `agent-viewer` plus hub verification

Run the deterministic weekly scanner and compare against the preceding compatible run. The gate should report:

- exact-route conformance
- redundant instruction rereads
- output-budget violations
- selector/path failures
- child lifecycle gaps
- validation-recovery loops
- completion and validation rates
- input-token and latency changes by workflow

Gate only deterministic regressions initially. Keep token deltas informational until enough post-change data exists.

Acceptance:

- known regression fixtures block merges
- weekly production data produces a bounded report
- coverage or validation degradation blocks a claimed context-efficiency win
- every new high-leverage pattern is preserved as a synthetic fixture

## Implementation Slices

Recommended pull-request sequence:

1. `agent-viewer`: regression fixtures and before/after comparison command.
2. Hub: exact route resolver and conformance tests.
3. Hub: `task:context --json` completeness contract.
4. `agent-viewer`: context-contract-aware reread detection and task/final linkage.
5. `artist-helper`: canonical batch selector, resolved result path, and narrow validator contract.
6. `artist-helper`: artifact-backed child lifecycle and inspection provenance.
7. `artist-helper`: bounded status output and wave barrier.
8. Relevant domain repos: bounded debug/status modes only for demonstrated broad-output cases.
9. `agent-viewer`: weekly comparison report and deterministic regression gate.
10. Queue runtime: worker reuse and resume experiments after clean baseline data exists.

Each submodule change lands and passes local validation before the hub pointer is updated on `main`.

## Definition Of Done

The improvement program is complete when:

- all P0/P1 regression fixtures pass
- exact routes produce the correct first action
- context helper completeness is machine-readable
- generated queue workers need no schema or output-path discovery
- common status/analyzer outputs are bounded
- child completion requires accepted artifacts and relevant provenance
- task-linked finals make coverage review deterministic
- two post-change weekly reports show lower avoidable calls/output without weaker completion or validation
- experimental worker/resume decisions are documented from measurements rather than assumptions

## Residual Risks

- Adding many narrow helpers can create discovery and maintenance cost; prefer bounded modes on existing commands.
- Output caps can hide required evidence; every cap needs an explicit saved-artifact escalation path.
- Context suppression can become stale after instruction changes; completeness metadata must include changed-file detection.
- More lifecycle metadata can become performative unless derived from actual artifacts and tool events.
- Token reduction can optimize the wrong outcome; completion, validation, latency, and supervision remain co-equal measures.
