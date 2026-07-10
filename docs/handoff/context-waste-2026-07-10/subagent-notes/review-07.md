# Calibrated Context-Waste Review 07

## Scope and method

- Reviewed exactly the five assigned packet JSON files, `AGENT_LOG_ANALYSIS_RULES.md`, and the calibrated review methodology/schema.
- Treated detector signals as candidates. Unique image inspections, distinct wave assignments, validation, and state-sensitive status checks were not labeled waste merely because they repeated or produced large outputs.
- Used packet-bounded evidence only. No raw rollout windows were opened.
- Avoidable-token ranges are included only where cited actions align with nearby `turnUsage` input deltas; they are conservative bounds, not causal accounting.

## Packet reviews

### `019f2f37-09f1-70d1-b86b-c83d602519c1`

- **Request coverage:** **handled correctly with a qualified residual state.** The coordinator ran the June production queue, processed 108 items in 23 subagent batches, imported the descriptions, and correctly explained that three remaining queue rows were media-quality `needs_review` cases rather than missing descriptions.
- **Verdict:** confirmed startup context waste within an otherwise necessary, successful queue run. The later queue waves, result checks, review sampling, import, and diagnosis of the three residual rows are not packet-proven waste.
- **Cited waste events:** the exact request had a hub-level direct route to `artist-helper`, but lines 11-13 first read `portable-agent-instructions.md`, read hub `package.json`, and ran `find:repos -- image-description`; the search alone returned 38,427 bytes. Only at line 23 did the agent run `task:context -- artist-helper`, followed by another instruction read at line 29 and package/script discovery at lines 30-31. Line 78 then printed all batch payloads in one 40,214-byte truncated output; dispatch needs batch data, but a truncated all-batch dump is a poor transport compared with bounded per-batch extraction. The six `git status --short` calls span meaningful wave/import/review boundaries and are not proven redundant.
- **Avoidable tokens:** **low 12,000 / likely 15,000 / high 16,509** for the pre-route discovery cluster, bounded by input growth from line 19 (18,420) to line 25 (34,929). The line-78 dump is excluded because the packet does not isolate its delta from necessary queue preparation and dispatch.
- **Root cause:** the exact production queue route was treated as generic discovery work rather than an exclusive fast path; generated batch data lacked a bounded coordinator-to-worker handoff mechanism.
- **Smallest reusable fix:** instruction/route guard: for the exact production image-description queue wording, make the first command `npm run task:context -- artist-helper`, prohibit portable/package/find-repos probes, and proceed directly to the wrapper named by `artist-helper/AGENTS.md`. Add a helper that emits one batch prompt/result path at a time instead of dumping every batch payload.
- **Confidence:** high on request coverage and startup waste; medium on the all-batch dump's avoidability; medium on the token range.
- **Escalations:** none. Wrapper telemetry should expose whether the local instruction section was bundled or truncated so post-context rereads can be classified mechanically.

### `019f31bc-1ec9-7e51-a05b-1a8165fb23dc`

- **Request coverage:** **handled correctly on the visible requirements.** The worker wrote five descriptions for wave 3, preserved the queue JSON, and reported passing validation. The packet truncates the tail of the original request, so it cannot prove whether wave-wide validation was specifically requested.
- **Verdict:** likely waste, narrowly limited to context/instruction rereading and validation-interface friction. The five image reads are required visual inputs, not waste.
- **Cited waste events:** line 20 reads 5,328 bytes of `AGENTS.md` immediately after successful `task:context -- artist-helper` at line 14. A validator invocation fails at line 107, after which the worker reads the validator source at line 112 and discovers that filtering is only supported by wave; line 118 then validates the whole wave. This recovery is reasonable once the interface failure occurs, but the failed attempt and source read expose a missing per-result validation interface.
- **Avoidable tokens:** **low 3,800 / likely 4,300 / high 4,649** for the instruction reread, bounded by input growth from line 16 (18,787) to line 22 (19,124) only weakly in this packet and calibrated against the read's 5,328-byte payload; confidence is low enough that the upper bound is capped to the established nearby context window rather than session totals. No validator-recovery tokens are estimated because the packet lacks a clean adjacent pre-failure usage point.
- **Root cause:** workers do not trust the context helper's bundled instructions, and the validator exposes wave-level rather than canonical single-result validation.
- **Smallest reusable fix:** suppress repo-instruction rereads after a successful, non-truncated `task:context`; add `validate-image-description-result --input <queue> --result <path>` for parse/count/required-field/path membership checks.
- **Confidence:** high that image output is necessary; medium on instruction waste and request coverage; low-to-medium on the token range because the closest delta is not cleanly isolating.
- **Escalations:** packet collector should retain the complete user request rather than truncating the validation clause. No raw-log escalation is needed for the reusable finding.

### `019f32eb-663e-7aa0-9428-4625e4162671`

- **Request coverage:** **handled correctly.** The worker processed only `image-description-agent-4-wave-5`, wrote five items, ran only the requested narrow validation, and did not run the full queue validator. The clean Git status is plausibly explained by ignored generated results and was followed by an existence check.
- **Verdict:** confirmed batch-discovery waste. Unique image reads totaling large byte counts are necessary and are false-positive detector signals.
- **Cited waste events:** line 17 rereads `AGENTS.md` after `task:context`. Line 23 attempts one batch lookup, line 29 responds by dumping the complete `agentBatches` mapping in a 40,214-byte truncated output, and line 35 finally selects the requested batch by `label`. The full mapping was unnecessary for one named batch and materially enlarged the next turn.
- **Avoidable tokens:** **low 10,500 / likely 13,000 / high 14,767**, bounded by input growth from line 19 (19,162) through line 37 (33,929) around the reread and three-step schema-discovery loop.
- **Root cause:** generated worker prompts name a batch but do not provide a stable extraction command or canonical selector key.
- **Smallest reusable fix:** add and embed a helper such as `print-image-description-batch --input <queue> --label <label> --json`; it should return only the batch's result path, item count, instructions, and items, and fail with a short schema-aware error.
- **Confidence:** high on the waste verdict and request coverage; medium-high on the token range.
- **Escalations:** none.

### `019f3308-a078-7f50-a0a7-cb22060fe24b`

- **Request coverage:** **handled correctly for the seven captured requests, but packet coverage is incomplete.** Requests for waves 1-6 and 11 are present, and the final for wave 11 reports the requested four-item narrow sanity check. Task indices 7-10 and their request/final records are absent even though the session metrics and final sequence imply eleven assignments, so end-to-end coverage of those waves is indeterminate from this packet.
- **Verdict:** likely small startup/schema waste; otherwise necessary cost. Each wave is a distinct user request, and each unique `view_image` call is required work, so the 51 large-output signals do not establish duplication.
- **Cited waste events:** line 17 rereads `AGENTS.md` after `task:context`. In wave 1, line 23 guesses `agentId` and returns no useful batch, line 29 searches the entire queue text for the label, and line 35 succeeds with the canonical `label` selector. Later wave image reads belong to separate assignments and must not be aggregated as repeated waste.
- **Avoidable tokens:** **low 1,700 / likely 2,500 / high 3,378**, bounded by input growth from line 19 (19,267) to line 37 (22,645) around the failed lookup/search/successful lookup sequence. No tokens from later waves or image payloads are counted.
- **Root cause:** the queue schema's batch identity is not exposed through a stable helper, while packet construction samples multi-request sessions incompletely.
- **Smallest reusable fix:** use the same canonical per-label batch printer in every generated worker prompt; update packet generation to preserve every user request and associate each event/final with its task index.
- **Confidence:** high that image/repetition signals are false positives; medium on the schema-loop range; medium on request coverage because four request records are missing.
- **Escalations:** collector/schema escalation for missing task indices 7-10. No bounded raw-log read is necessary to establish the reusable waste finding.

### `019f3eb5-d27f-78c0-9453-7ac7d01c9d6e`

- **Request coverage:** **handled correctly.** The worker overwrote the reused result path with exactly five current batch items, validated count/required fields/path membership, and reported the requested result. No queue edit or unrelated modification is shown.
- **Verdict:** confirmed bounded schema-discovery waste. The five distinct image inspections are necessary despite their 5.25 MB aggregate output.
- **Cited waste events:** line 17 rereads a large 14,339-byte `AGENTS.md` after `task:context`. Lines 23, 29, and 35 make three successive queue-inspection attempts: an initial extraction, a 5,567-byte top-level/schema dump, then a successful lookup by `resultPath`. The request already supplied both label and result path, so one canonical extraction should suffice. The line-59 existence check is justified because the request explicitly says the path is reused and must be overwritten.
- **Avoidable tokens:** **low 3,500 / likely 5,500 / high 6,556**, bounded by input growth from line 13 (18,803) through line 37 (25,359) around the instruction reread and schema-discovery sequence.
- **Root cause:** no documented stable selector for fresh queues that reuse an old result path, plus unnecessary post-context instruction loading.
- **Smallest reusable fix:** extend the per-batch printer to accept either `--label` or `--result-path`, verify they identify the same batch when both are supplied, and emit only assigned items. Trust successful `task:context` unless it explicitly reports truncated instructions.
- **Confidence:** high on request coverage and required image inspection; medium-high on the waste verdict and token range.
- **Escalations:** none.

## Cross-packet reusable fixes

1. Make exact production queue routing exclusive and machine-checkable: `task:context -- artist-helper` first, with no generic routing/package probes.
2. Add one canonical batch extraction helper keyed by label and/or result path; generated worker prompts should include its exact invocation.
3. Add a single-result validator so workers do not inspect validator source or validate sibling batches.
4. Record whether `task:context` bundled complete local instructions; suppress immediate instruction rereads when it did.
5. Change the detector from “large image output” to duplicate inspection of the same item/path. Required unique visual inputs are cost, not waste.
6. Preserve all user-request boundaries and task-index-to-final mappings in long-lived worker sessions.

## Residual risks

- Nearby input deltas include prompt, tool, and cache effects; ranges intentionally exclude downstream replay and any cluster without a defensible local bound.
- Packet sampling can establish local waste but cannot prove completion for omitted requests or finals.
- No raw logs were read, so truncated request clauses and missing task indices remain unresolved rather than inferred.
