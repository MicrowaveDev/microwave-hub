# Counterexample Audit

## Source Request

- **Original request:** audit `calibration-a.md`, `calibration-b.md`, and `review-01.md` through `review-07.md` for false positives, counterexamples, contradictory verdicts, double counting, and fixes that merely move cost; identify robust versus qualified proposed top findings.
- **Scope analyzed:** only those nine notes and `AGENT_LOG_ANALYSIS_RULES.md`.
- **Non-goals:** no raw logs, packets, source windows, or independent reconstruction of packet events.
- **Evidence limit:** this is a consistency audit of derived notes. It can establish agreement, contradiction, duplicated evidence, and unsupported extrapolation, but cannot upgrade a packet-bounded “likely” verdict to ground truth.

## Request Coverage

- All nine requested notes were reviewed.
- The audit checks verdict consistency, independence of cited incidents, token-attribution methods, counterexamples contained in the notes, and whether proposed fixes remove or relocate cost.
- No raw-log or packet escalation was used. Missing task boundaries, omitted finals, truncated helper output, and incomplete worker lifecycles therefore remain unresolved.

## Robust Top Findings

### 1. Repeat detection must be task- and semantic-instance-aware

- **Status:** robust; highest-confidence detector finding.
- **Evidence:** both calibrations reject session-wide counts attached to one bounded occurrence. Reviews repeatedly show distinct waves, batches, shrinking wait sets, validation phases, file windows, and user requests being normalized into apparent repeats.
- **Counterexamples to the original detector:** one `task:context` per later task, revisiting an active roadmap after it changes, unique image inspections, per-wave print/validate calls, and waits on changing active sets are necessary repetition.
- **Smallest durable fix:** attach active request/task index, cwd, result summary, and nearest prior equivalent event; preserve wave, batch, target set, range, and phase identifiers. Flag unchanged semantic instances, not command-family frequency.
- **Fix type:** detector, packet schema, and regression tests.
- **Residual risk:** task segmentation inferred from physical sessions or completion counts can still merge or split tasks incorrectly.

### 2. Unique required visual inspections are necessary input, not large-output waste

- **Status:** robust.
- **Evidence:** calibration A and reviews 01, 02, 05, 06, and 07 independently reject byte-size findings for distinct assigned images or video frames. The notes also supply a useful counterexample: a worker that produced a description without any recorded image inspection failed request coverage even though schema validation passed.
- **Smallest durable fix:** key visual-cost findings by media item/path and inspection purpose; flag duplicate inspection of the same item without a new need, not large payloads alone.
- **Fix type:** detector and test.
- **Residual risk:** repeated frames of one video may be necessary; path equality alone is insufficient without frame/seek and purpose metadata.

### 3. Generated queue assignments need a canonical bounded batch selector

- **Status:** robust, with implementation choice still open.
- **Evidence:** multiple distinct worker packets across reviews 01, 02, 05, 06, and 07 guess nonexistent `id`, `agentId`, or `batchId` fields, dump batch summaries, then discover `label`. This is not merely repeated review of one packet; the notes identify several packet IDs with the same sequence.
- **User impact:** failed lookups and all-batch dumps delay the first image inspection and enlarge context.
- **Smallest durable fix:** generated prompts should include the canonical selector and resolved result path. A small `print-image-description-batch --label ...` helper is justified only if it replaces the same schema logic in multiple generators/workflows.
- **Fix type:** prompt/generator first; helper and generator test if shared.
- **Residual risk:** adding a helper can duplicate a simple stable `jq` expression and create version drift. The generator must test that prompt, queue schema, and helper agree.

### 4. Exact production queue routes should bypass generic hub discovery

- **Status:** robust for the exact phrases covered by hub instructions.
- **Evidence:** reviews 01, 04, and 07 cite separate production queue coordinators reading portable instructions, routing docs, package metadata, or running `find:repos` before the explicitly required `task:context -- artist-helper` fast path.
- **Smallest durable fix:** a machine-checkable first-action rule for the exact image-description and Threads queue prompts, followed by only the workflow source permitted by the hub rule.
- **Fix type:** routing instruction and regression test.
- **Residual risk:** do not generalize this prohibition to approximate or novel queue requests that genuinely require routing.

### 5. Packet request/final/lifecycle linkage is insufficient for long-lived sessions

- **Status:** robust.
- **Evidence:** both calibrations and several reviews cannot assess request coverage because `sourceRequest` belongs to the physical session, later task requests/finals are sampled, or child termination/reassignment is absent. The same defect also creates contradictory coverage verdicts for the same session.
- **Smallest durable fix:** include the governing user request, task index, local completion, validation outcome, and child termination/output-use state for every cited event.
- **Fix type:** packet generator and validator.
- **Residual risk:** better packets improve adjudication but do not themselves reduce runtime context waste.

### 6. Wrong-root result writes are confirmed but narrow

- **Status:** robust incident finding, not yet a universal top cause.
- **Evidence:** review 01 identifies two distinct workers that first wrote under the hub-relative path and then corrected to `artist-helper/`.
- **Smallest durable fix:** emit a repo-absolute result path and assert before writing that the resolved path is beneath the assigned repo root.
- **Fix type:** generated prompt/validator test.
- **Residual risk:** mandatory `pwd` probes on every write merely move a small cost; prefer resolving and validating the path inside the existing write/helper flow.

## Findings That Must Remain Qualified

### Immediate instruction rereads after `task:context`

- **Verdict:** likely recurring waste, not uniformly confirmed.
- The pattern appears in many distinct packets, but calibration B explicitly withholds “confirmed” status, and calibration A notes that omitted events, continuation windows, helper truncation, or incomplete bundled output can make a follow-up read necessary.
- The notes sometimes overstate token cost: review 07 attributes 3.8k-4.6k tokens to a 5,328-byte read despite a nearby measured input rise of only about 337 tokens; similar estimates mix byte size, later replay, and adjacent deltas. These values cannot be aggregated.
- **Qualified fix:** have `task:context` report success, truncation, and exactly which instruction sections were emitted. Suppress only an immediate same-task reread of a fully emitted section. A blanket “never reread AGENTS” rule would break the hub queue exception that permits reading local instructions when the workflow is not already in context.

### Fresh worker session for every image batch

- **Verdict:** plausible high-leverage hypothesis, not robustly quantified.
- Review 05 reports very large reuse costs, but its likely/high estimates use cached-input excess versus an initial baseline and include productive batch work. Other reviews of reused workers call the same pattern only small or likely waste and emphasize incomplete task/final sampling.
- Fresh sessions remove prior visual context but add repeated system/instruction startup, schema discovery, model warm-up, and orchestration. Passing full batch objects may also enlarge every fresh prompt.
- **Qualified fix:** measure marginal billed/latency cost for reused versus fresh workers on equivalent batches. Prefer fresh sessions only if the measured visual-context replay exceeds startup and handoff cost; otherwise compact/reset worker context between batches.

### Stateful incremental resume instead of rerunning production wrappers

- **Verdict:** useful candidate, not proven top finding.
- Reviews 04 and 05 see repeated validate/merge/sync/build cycles, but also concede that packet evidence does not show which reruns changed state. Review 07 supplies the counterexample that repeated operations after refreshed queue state can be necessary run-to-pass progress.
- A resume helper moves cost into persisted phase state, invalidation rules, idempotency, and stale-state recovery. Incorrect skipping is higher risk than some repeated validation.
- **Qualified fix:** first add phase/result telemetry and idempotent stage commands. Add resume only after evidence shows unchanged successful stages are rerun often; always retain one final end-to-end gate.

### Validation must require recorded visual-inspection evidence

- **Verdict:** robust request-coverage failure in the cited no-inspection packet; proposed validator fix remains qualified.
- Absence of `view_image` in a packet described as a complete 11-call timeline is strong evidence that schema/count validation was insufficient there. Across sampled packets, however, absence may reflect packet omission.
- Requiring a self-reported “inspected” field can create compliance metadata without proving inspection and adds write/validation cost.
- **Qualified fix:** collectors should link actual media-inspection tool events to assigned paths, and the final gate should reject described items lacking that provenance. Do not accept an agent-authored boolean as proof.

### Concise production status mode and schema-probe/audit helpers

- **Verdict:** good local fixes, insufficient frequency for top ranking.
- The 224k-token status JSON and 56,941-byte scalar-path aggregation are convincing isolated broad-output incidents. The notes do not establish repeated demand for every proposed specialized helper.
- **Qualified fix:** add bounded flags to existing commands (`--summary`, field selection, output cap) before creating separate helpers. A new helper that is rarely used relocates cost into maintenance and discovery.

### Broad searches and whole-file reads

- **Verdict:** case-by-case only.
- Some packets show truncated inventories followed by narrow searches, supporting likely waste. Counterexamples throughout the notes show that inventories, non-overlapping file windows, and broad audits can be necessary.
- **Qualified fix:** enforce output caps and targeted-first guidance, then use overlap hashes/ranges to prove duplication. Output size alone must not decide the verdict.

## Contradictions And Double Counting

1. **Calibration verdict mismatch:** calibration A calls two instruction reads “likely avoidable” and gives bounded ranges; calibration B classifies the same pattern as likely waste but says no confirmed waste. The synthesis must retain “likely,” not promote agreement into confirmation.
2. **Coverage mismatch on shared packets:** the same long-lived sessions are variously “handled correctly,” “not handled,” or “insufficient evidence” because reviews freeze different embedded requests or rely on sampled finals. This supports the packet-linkage finding, not any one coverage verdict.
3. **Queue orchestration mismatch:** review 02 labels repeated waits/orchestration waste, while both calibrations and later reviews treat shrinking waits and per-wave commands as necessary progress. Without unchanged target/state and no-op results, the latter is the calibrated verdict.
4. **Worker reuse mismatch:** review 05 calls reuse confirmed waste with 41.7k-288.8k avoidable tokens; reviews 04, 06, and 07 describe comparable reused sessions as small/likely startup-schema waste and decline to charge image work. Reuse remains a measurement hypothesis.
5. **Instruction-read counts are not independent incidents:** the same packet IDs recur across calibration and review notes. Count unique packet/task events, not mentions or reviewer agreement. Likewise, multiple rereads inside one long-lived session may belong to separate tasks.
6. **Overlapping token windows:** instruction reread, failed selector, metadata dump, wrong-path repair, and reused-session estimates often share adjacent turn intervals. Summing finding ranges would double count the same input growth.
7. **Input growth is not causal savings:** adjacent `turnUsage` deltas contain user prompts, tool results, reasoning, cache effects, and productive work. Byte counts, cached-input excess, and later replay are different measures and must not be combined into one avoidable-token total.
8. **Detector and workflow fixes are separate benefits:** better packet/task attribution reduces false positives and review cost but does not reduce agent runtime. Do not count packet improvements as recovered runtime tokens.

## Ranked Synthesis

1. **Ship:** task-local, semantic-instance-aware repetition detection and packet task/final linkage.
2. **Ship:** exclude unique required media inspections from large-output findings; detect purposeless duplicates instead.
3. **Ship:** canonical queue batch coordinates in generated prompts, with schema-contract tests.
4. **Ship:** exact production-route first-action guards.
5. **Ship narrowly:** absolute/resolved result-path protection for queue workers.
6. **Pilot with telemetry:** post-`task:context` reread suppression conditioned on complete helper output.
7. **Measure before mandating:** fresh sessions per batch and incremental production resume.
8. **Keep local/qualified:** specialized summary/schema helpers, broad-read findings, and inspection-provenance gates.

## Residual Risks

- The audit cannot determine whether omitted tool events or finals would resolve contradictions.
- Review overlap means no reliable prevalence rate can be calculated from note counts.
- No aggregate avoidable-token total is defensible from the notes. The ranges use inconsistent units and attribution methods and frequently overlap.
- Proposed fixes should be evaluated by end-to-end latency, billed input, correctness, and supervision, not token reduction alone.

## Workspace State

- Only this audit file is in scope. No cleanup, branch movement, raw-log access, packet access, or changes to other files are required.
