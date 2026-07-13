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

## External Plan Review

The CryptoLegacy output-reduction plan contributes several mechanisms that transfer cleanly to this workspace:

- capture potentially large command output to ignored project-local artifacts and return a compact receipt
- preserve child exit codes and signals instead of letting a capture wrapper hide failures
- sanitize failure previews and enforce restrictive permissions, retention, collision, and cleanup rules
- use files-first/count-first discovery before capture; capture is a fallback for necessary large output
- make repository-owned public commands quiet by default while acknowledging that arbitrary shell commands cannot be universally intercepted
- checkpoint long-running multi-agent work so compaction or continuation does not trigger full-plan, transcript, or sub-agent-output replay
- give every sub-agent a prompt/output budget and a structured handoff contract
- detect repeated task reminders, replayed sub-agent outputs, raw image/base64 reads, and repeated oversized patch payloads
- attribute batched tool output once when per-command attribution is impossible
- preserve routing behavior while moving procedural detail out of always-on instruction files

This plan does not import the other project's product-specific E2E/browser rules, its absolute instruction-size threshold, or its claimed percentage savings. Microwave Hub will establish its own baselines and command-family adapters.

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
- captured-output receipts, direct-output bypasses, and raw-artifact reopen events
- repeated sub-agent output, task-ledger, or custom-tool payload hashes
- checkpoint resume bytes and commands before the recorded next action
- output attribution confidence: exact producer, correlated session, or counted-once aggregate

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
- zero repository-owned public command results above 5,000 estimated tokens
- successful captured-command receipts below 20 lines, 4 KB, and 1,000 estimated tokens
- zero full plan, transcript, or completed sub-agent-output rereads during a valid checkpoint resume
- zero duplicated accounting for one batched or unattributable tool-output payload

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

### 0.3 Repair producer attribution before percentage claims

Owner: `agent-viewer`

When one tool result contains output from multiple nested commands, attribute each separable segment to its producer. If separation is not reliable, record one `unattributable-aggregate` payload instead of cloning the same bytes/tokens onto every nested command.

Correlate asynchronous poll output with the originating command/session ID where available. Otherwise use an explicit session bucket such as `tool:poll/session:<id>`.

Acceptance:

- a batched-output fixture is counted once
- poll output is linked to the originating session or marked uncorrelated
- confidence is recorded for every producer attribution
- before/after percentage claims use the corrected baseline

### 0.4 Measure prompt and custom-tool input replay

Owner: `agent-viewer`

Add metrics and findings for oversized or repeated-identical custom-tool inputs, especially large literal patches, inline workflow scripts, and unchanged payload retries.

Acceptance:

- report p50, p95, maximum, and repeated stable hashes by tool family
- distinguish a corrected hunk from resending an unchanged full patch
- recommend reusable templates plus compact lane data for large workflow prompts
- never expose full sensitive payload bodies in the report

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

### 2.3 Preserve always-on instruction headroom

Owner: hub instruction maintenance

Keep routing triggers and hard workspace invariants in root `AGENTS.md`; move procedural detail into linked playbooks or repo-local instructions. Before extraction, freeze a machine-readable inventory containing normalized trigger text, route target, invariant ID, target link, and byte offset.

Microwave Hub's current root file is about 11 KB. Use 16 KB as the initial local ceiling, not the external project's threshold. Adjust it only with measured startup-context evidence.

Acceptance:

- every pre-change trigger and hard invariant maps one-to-one after editing
- every linked playbook exists
- all unconditional routes remain early in the file
- root `AGENTS.md` stays at or below 16 KB
- adding procedural prose that belongs in a linked playbook fails instruction verification

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

### 3.2 Add selective project-local command capture

Owner: hub helper layer

Add one argv-safe capture supervisor for command families known to be noisy. This is not a universal shell interceptor and must not wrap small exact reads.

Suggested interface:

```bash
bash bash/capture-command-output.sh --cwd <repo> -- <command> <arg>...
```

The shell entrypoint should be a thin launcher. A Node supervisor should:

- spawn without a shell or interpolated command string
- resolve the containing hub/submodule Git root
- write combined stdout/stderr to `<repo>/temp/agent-command-output/`
- use a sanitized command-family prefix and UTC timestamp with milliseconds
- reserve paired `.log` and `.meta.json` names atomically, adding collision suffixes
- record command family, redacted argv display, cwd, start/end, duration, exit code, signal, bytes, lines, estimated tokens, SHA-256, helper version, and cleanup expiry
- use `umask 077`, directory mode `0700`, and file mode `0600`
- finalize the log before atomically publishing metadata as the completion marker
- reject symlink/path escape, tracked or potentially trackable artifact paths, TTY/interactive commands, and out-of-workspace destinations

The helper must forward `INT`, `TERM`, and `HUP` to the child process group. Natural child exit/signal and wrapper-enforced states such as `output_limit_exceeded` must remain distinct. Do not implement capture through `tee` or another output pipeline.

Successful receipt contract:

- at most 20 lines, 4 KB, and 1,000 estimated tokens
- no raw output body
- command family, exit, duration, line/byte/token estimate, log path, metadata path, and suggested bounded next action

Failure previews are optional and only for sanitized text. Strip terminal controls, replace control bytes, redact learned secret values, cap lines at 512 bytes, and cap the complete preview at 4 KB/800 estimated tokens. Binary or undecodable output receives a path-only receipt. Capture success must never turn a failing child into exit `0`.

Supported explicit modes:

- `--summary-only`
- `--preview-lines <n>` within the receipt budget
- `--raw-output --reason <bounded reason>` for justified terminal replay
- bounded artifact reads that record the requested line/byte range

Acceptance:

- fixtures cover exits `1`, `126`, `127`, and `143` separately from termination signals
- giant lines, ANSI/OSC, NUL/binary, mixed stdout/stderr, learned secrets, collisions, interruption, disk-full, and child-process descendants are covered
- ordinary owned entrypoints never print their full captured report
- arbitrary shell commands remain a documented routing/detection boundary

### 3.3 Add capture adapters and retention

Owner: hub helper layer plus command owners

Add thin adapters only where semantic summaries are reliable:

- broad search: match/file counts and capped paths
- diff: stat, changed paths, whitespace status, raw diff path
- analyzer: event counts, finding titles, top offenders, full report path
- JSON/YAML: size, top-level schema, selected-field hint
- test suites: exit, pass/fail/skip counts, failing names, bounded errors
- broad inventory: count and capped paths grouped by root/type
- dirty workspace status: repo counts and capped changed paths

Use files-first/count-first discovery before capture. Capture is not permission to run an unnecessarily broad command.

Retention contract:

- ignore the complete artifact directory in every participating repo
- default retention seven days and default project cap 200 MB
- default per-capture ceiling 50 MB; exceeding it stops the child group and records a wrapper failure
- `.keep` sidecars or a machine-readable retention manifest protect durable evidence
- cleanup has report-only and explicit apply modes, uses a lock, excludes active reservations, never follows symlinks, and evicts oldest unpinned completed pairs first
- cleanup failure is reported separately and never replaces the child's exit status

### 3.4 Improve rollout analysis entry points

Owner: `agent-viewer`

- make `--workflow-waste` the documented first command for workflow analysis
- add a bounded preview mode to the analyzer
- warn when a raw JSONL read occurs before the analyzer in an active log-analysis task
- keep cited raw-window escalation available after analyzer output

Acceptance:

- the raw-pre-read regression fixture fails
- analyzer preview exposes source request, key event types, and cited lines without dumping raw records
- encrypted reasoning, image payloads, and repeated metadata remain redacted

### 3.5 Add bounded domain status modes

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

### 6.3 Add compaction-resilient orchestration checkpoints

Owner: hub orchestration utilities and `agent-viewer`

Every non-trivial multi-agent workflow should maintain one ignored, atomic, bounded checkpoint under a project-local temporary directory, for example:

```text
<repo>/temp/agent-flow-checkpoints/<root-task-id>/active.json
```

Cap `active.json` at 16 KB and pair it with a SHA-256 sidecar. Keep historical detail in a separate append-only bounded event ledger rather than repeatedly enlarging the active checkpoint or canonical plan.

Checkpoint fields:

- objective, frozen acceptance criteria, constraints, and canonical plan paths
- current phase/workstream and behavior/scoring versions
- root, coordinator, child, and nested IDs with parent/task mappings
- frozen prompt/helper/repo hashes where relevant
- completed run IDs and dispositions
- blocker, external/concurrency state, and retry budget
- owned changed files, completed validations, and retained evidence paths
- next one to three exact actions
- schema version, writer, update timestamp, and content hash

Update atomically:

1. after source-of-truth freeze and before the first spawn
2. before each spawn with expected scope and ownership
3. after each final, stop, validation, or artifact disposition
4. after an accepted finding or helper/scoring version change
5. before a long wait, handoff, compaction boundary, or final response
6. after commit, push, merge, or pointer changes

Resume protocol:

- read the checkpoint and only the named plan/status section
- validate schema/hash, repo commits, referenced artifacts, containment, and active-agent state
- mark external drift explicitly
- execute the recorded next action
- open ledger rows, raw logs, or full plan sections only for a named mismatch

Acceptance:

- a fresh continuation resumes after reading no more than the 16 KB checkpoint plus targeted status
- normal resume rereads zero full transcripts, plans, or completed child outputs
- stale/corrupt checkpoints fail closed and name the frozen recovery manifest
- analyzer flags full-plan/output replay when a valid checkpoint existed

### 6.4 Bound sub-agent prompts and handoffs

Owner: orchestration prompt templates

Every delegated lane receives a compact contract:

- final response at most 100 lines and 3,000 tokens unless a larger artifact is explicitly requested
- raw command output goes to an artifact; the final returns a summary and path
- broad searches use files-first/count-first modes
- images are inspected with image-aware tools; never read bitmap files as text/base64
- quiet test/E2E helpers are not wrapped with `cat`, `tail`, or broad `grep`
- reusable workflows use a template plus compact lane data instead of embedding a large inline script

Every handoff returns:

- base revision and scoped dirty-state summary
- scope completed
- changed files and diffstat
- behavior-level result/verdict
- validation and explicitly skipped tests
- assumptions or decisions required from the coordinator
- artifact/raw-log paths
- blocker/disposition and assigned next action

The parent synthesizes structured receipts instead of copying worker prose or rereading `.output` files.

Acceptance:

- oversized `TaskOutput` and saved-output replays are detector findings
- acknowledgement-only finals cannot replace substantive evidence without a durable artifact reference
- one worker's raw logs never appear in another worker prompt
- prompts above 2,000 tokens are either reusable templates or explicitly justified

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
- owned-command capture bypasses, raw artifact reopens, and receipt-size violations
- repeated or oversized sub-agent, prompt, patch, and custom-tool payloads by stable hash
- checkpoint replay violations and checkpoint resume byte counts
- producer-attribution confidence, including unattributable aggregate output
- instruction byte headroom, trigger inventory parity, and broken route links
- selector/path failures
- child lifecycle gaps
- validation-recovery loops
- completion and validation rates
- input-token and latency changes by workflow

Gate only deterministic regressions initially. Keep token deltas informational until enough post-change data exists.

Acceptance:

- known regression fixtures block merges
- weekly production data produces a bounded report
- no repo-owned public command emits more than 5,000 estimated tokens without an explicit raw-output mode and reason
- a valid checkpoint resume does not replay full plans, transcripts, or completed child output
- one batched or unattributable payload is never charged independently to every nested producer
- instruction trigger inventory and executable route tests agree, and hub `AGENTS.md` remains below 16 KB
- coverage or validation degradation blocks a claimed context-efficiency win
- every new high-leverage pattern is preserved as a synthetic fixture

## Implementation Slices

Recommended pull-request sequence:

1. `agent-viewer`: synthetic regression fixtures and producer-attribution repair.
2. `agent-viewer`: before/after comparison command plus prompt, sub-agent, patch, and custom-tool payload metrics.
3. Hub: exact route resolver and conformance tests.
4. Hub: `task:context --json`, instruction trigger inventory, and 16 KB headroom check.
5. Hub: capture supervisor, receipt schema, security checks, retention, and cleanup.
6. Hub and demonstrated command owners: files/count-first adapters and quiet public defaults.
7. `agent-viewer`: context-contract reread, capture-bypass, artifact-replay, checkpoint-replay, and task/final detectors.
8. `artist-helper`: canonical batch selector, resolved result path, and narrow validator contract.
9. `artist-helper`: artifact-backed child lifecycle and inspection provenance.
10. `artist-helper`: bounded status output and wave barrier.
11. Hub: checkpoint utility, event ledger, resume validator, and compact sub-agent templates.
12. Relevant domain repos: bounded debug/status modes only for demonstrated broad-output cases.
13. `agent-viewer`: weekly comparison report and deterministic regression gate.
14. Queue runtime: worker reuse, reset, and resume experiments after clean baseline data exists.

Each submodule change lands and passes local validation before the hub pointer is updated on `main`.

## Definition Of Done

The improvement program is complete when:

- all P0/P1 regression fixtures pass
- nested, batched, and unattributable output is counted once with explicit attribution confidence
- exact routes produce the correct first action
- context helper completeness and instruction trigger coverage are machine-readable, and hub `AGENTS.md` stays below 16 KB
- selective capture preserves child exit status and signals, secures artifacts, enforces retention, and emits bounded receipts
- repo-owned public commands remain below the output threshold unless raw mode is explicitly requested and justified
- generated queue workers need no schema or output-path discovery
- common status/analyzer outputs are bounded
- child completion requires accepted artifacts and relevant provenance
- task-linked finals make coverage review deterministic
- a fresh coordinator can resume a representative multi-agent workflow from a valid checkpoint without rereading full plans, transcripts, or completed worker outputs
- delegated prompts and handoffs meet their budgets or carry an explicit artifact-backed exception
- two post-change weekly reports show lower avoidable calls/output without weaker completion or validation
- experimental worker/resume decisions are documented from measurements rather than assumptions

## Residual Risks

- Adding many narrow helpers can create discovery and maintenance cost; prefer bounded modes on existing commands.
- Output caps can hide required evidence; every cap needs an explicit saved-artifact escalation path.
- Raw capture artifacts can contain secrets. Redact recognized learned values from receipts and metadata, retain restrictive permissions, and continue to prohibit commands that dump known secret files because arbitrary stdout cannot be guaranteed redactable.
- Capture changes TTY, color, buffering, and progress behavior; reject interactive commands and test adapters against representative tools.
- Cleanup can race with readers or create storage pressure; use atomic manifests, locking, age and size caps, and separate report/apply modes.
- A receipt path can become an invitation to reopen the whole raw log; analyzer rules should flag unbounded artifact replay and require bounded reads with a reason.
- Context suppression can become stale after instruction changes; completeness metadata must include changed-file detection.
- Checkpoints can become stale or performative; validate hashes, repo state, referenced artifacts, and active-agent state before trusting the recorded next action.
- Prompt and handoff budgets can omit decisive evidence; exceptions must name a durable artifact and the narrow question that requires opening it.
- More lifecycle metadata can become performative unless derived from actual artifacts and tool events.
- Token reduction can optimize the wrong outcome; completion, validation, latency, and supervision remain co-equal measures.
