# Context-Waste Fix Backlog

## P0: Deterministic Guards

### Exact production-route tests

- Owner: hub routing helpers/instructions
- Add fixtures asserting that exact image-description and Threads queue prompts use `npm run task:context -- artist-helper` as the first tool action.
- Reject portable-instruction, `SUBMODULES.md`, package, README, or repo-discovery probes before the route.
- Evidence: `019f2f37...`, `019f3e09...`, and three additional coordinator trees.

### Generated worker coordinates

- Owner: `artist-helper` queue generator and validators
- Emit the canonical `label`, a tested copyable selector, assigned item count, repo-absolute output path, and narrow result validator in every assignment.
- Assert that the resolved output path remains under `artist-helper`.
- Add schema-contract fixtures so prompt commands and queue JSON cannot drift.
- Evidence: at least 15 worker sessions; wrong-root repairs in two.

### Bounded status and analyzer output

- Owner: existing status/analyzer command owners
- Add field selection, `--summary`, and hard output caps to existing commands before creating new helpers.
- Make analyzer-first the default for rollout analysis while allowing cited bounded escalation.
- Evidence: `019f32d7...`, `019f393a...`, `019f4dbb...`.

## P1: Correctness And Attribution

### Task-linked packet and lifecycle schema

- Owner: `agent-viewer`
- Require governing request, task index, tool outcome, nearby usage, local final, validation verdict, and child termination/output-use state for each finding.
- Fail packet integrity when a final has no governing request.
- Split coverage-risk controls from low-waste controls.

### Semantic repeat detection

- Owner: `agent-viewer`
- Preserve wave, batch, target set, timeout, range, path, and phase.
- Flag only unchanged semantic instances without intervening state, writes, or successful completion.
- Exclude unique required media inspections and changed-target polling.

### Inspection provenance

- Owner: `artist-helper` validation
- Link actual media-inspection events and assigned paths before accepting `agentStatus: described`.
- Do not trust a worker-authored boolean as proof.
- Treat setup-only workers as retryable until the expected artifact exists and passes narrow validation.

## P2: Measured Experiments

### Context completeness marker

- Owner: hub `task:context`
- Emit machine-readable `instructionsLoaded`, `workflowLoaded`, and `truncated` fields.
- Pilot same-task reread suppression only for sections confirmed complete.
- Measure false suppression before enforcing globally.

### Worker reuse experiment

- Owner: queue orchestration/runtime
- Compare equivalent visual batches using reused, reset, and fresh workers.
- Measure billed input, latency, startup cost, completion quality, and supervision.
- Do not mandate fresh sessions from current evidence.

### Stateful wave resume

- Owner: `artist-helper` production orchestration
- Add phase/result telemetry and idempotent stage commands first.
- Implement resume only if telemetry shows unchanged successful phases are repeatedly rerun.
- Retain one final end-to-end gate.

## Acceptance Gates

- Exact-route fixtures fail when discovery occurs before the required helper.
- Worker prompt fixtures execute their own selector and validator successfully.
- Status/analyzer fixtures prove bounded output under large inputs.
- Packet fixtures cover task linkage, inherited fork history, malformed JSON, child lifecycle, and control classification.
- No detector converts event counts or bytes into token claims.
- New workflow guards reduce context without weakening completion, validation, or evidence quality.
