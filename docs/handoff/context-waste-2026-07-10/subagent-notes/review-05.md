# Context-Waste Review 05

Scope: only the six assigned calibrated packets. Detector signals are treated as candidates. No raw-log windows were requested.

## Packet `019f2d92-a705-7a10-90db-d9dbc5ea35b5`

- **Request coverage:** handled correctly. The read-only review covered all seven requested modules, returned per-module status and corrections, and reported a clean worktree.
- **Verdict:** confirmed waste, although most source inspection was necessary cost.
- **Cited waste events and first avoidable decision:** the first avoidable decision was rereading `portable-agent-instructions.md` and `AGENTS.md` after `npm run task:context -- geesome-node` had already supplied context (lines 21-22). The failed `rg` quoting at line 29 was minor. The serial-read signals at lines 30 and 83 are not proof: inventory and module reads were required. Repeated reads at lines 61/74, 62/75, 85/93/102/103, and 86/94 partly reflect non-overlapping windows needed for a seven-module source audit, so they are not independently counted as waste.
- **Avoidable-token range:** low **482**, likely **482**, high **482** input tokens. Method: the immediate measured input delta from the pre-reread turn at line 16 (`18,552`) to the next turn at line 25 (`19,034`). This is deliberately narrower than the tools' reported output size and does not monetize the other detector signals.
- **Root cause:** missed helper / instruction drift. The startup rule already says not to reread instructions emitted by `task:context`.
- **Smallest reusable fix:** make `task:context` end with a one-line machine-readable list of instruction files already emitted, and have the routing instruction explicitly treat that list as a stop condition for further instruction reads.
- **Confidence:** high for the reread; medium that no further meaningful waste should be charged.
- **Escalations:** none.

## Packet `019f31a7-42c1-7271-9a68-2dfee9598590`

- **Request coverage:** handled correctly. The worker wrote five assigned descriptions and performed the requested narrow validation. It did not run the full queue validator.
- **Verdict:** likely waste, with large-image detector signals rejected as false positives.
- **Cited waste events and first avoidable decision:** the first avoidable decision was rereading `AGENTS.md` after `task:context` (line 17). Batch lookup then failed because it guessed unsupported identity fields (line 23) and dumped all batch summaries (line 29) before selecting the documented `label` field (line 35). The five contact-sheet `view_image` calls at lines 130-154 were necessary visual evidence, not context waste. The late reread of `portable-agent-instructions.md` at line 187 was also avoidable. Git status and ignored-path checks were reasonable handoff checks.
- **Avoidable-token range:** low **901**, likely **901**, high **10,335** input tokens. Method: `901` is the immediate line 13 to line 19 delta (`18,383` to `19,284`) around the first reread. The high bound adds the measured line 156 to line 189 delta (`9,434`) around the late portable-instructions reread; that interval also contains uncited work, so it is only an upper bound. No image bytes are converted to tokens.
- **Root cause:** missed helper plus routing/schema ambiguity.
- **Smallest reusable fix:** put the queue batch key (`label`) and a ready-to-run exact-batch extraction command in the worker prompt or production wrapper; suppress instruction rereads after `task:context`.
- **Confidence:** high that the image reads were necessary; medium on the high token bound.
- **Escalations:** none.

## Packet `019f31ed-8d42-7090-abda-9a8107d2de6a`

- **Request coverage:** handled correctly. Five results were written, the queue was not edited, and only parse/count/required-field validation was run.
- **Verdict:** confirmed waste, limited to startup and batch discovery; multi-frame video inspection was necessary cost.
- **Cited waste events and first avoidable decision:** the first avoidable decision was rereading `AGENTS.md` after `task:context` (line 17). After a guessed-field lookup failed (line 23), line 29 printed a 40,214-byte/12,351-token summary of every batch before line 35 used `label`. The multiple early/mid/late video frames at lines 144-204 were appropriate evidence for factual video descriptions and are not waste.
- **Avoidable-token range:** low **718**, likely **1,281**, high **1,281** input tokens. Method: line 13 to line 19 contributes `718`; line 25 to line 31 contributes another `563` around the all-batch dump. These are nearby measured input deltas, not the detector's output-byte quantities.
- **Root cause:** routing/schema ambiguity and missed helper.
- **Smallest reusable fix:** provide an exact `label`-based batch extractor in the generated worker assignment and have it fail with the available labels only, capped to a small count, rather than dumping batch objects.
- **Confidence:** high.
- **Escalations:** none.

## Packet `019f3308-9f8c-7172-817a-4ca944e09d41`

- **Request coverage:** insufficient packet evidence. Six explicit requests (waves 1-6) appear, while the preserved final message reports wave 11; the packet does not retain a per-wave final for every observed request. The visible wave-11 handoff is correct and narrowly validated.
- **Verdict:** confirmed waste from task design/session reuse; image-output signals are necessary cost.
- **Cited waste events and first avoidable decision:** line 17 unnecessarily reread `AGENTS.md`; lines 23-29 guessed batch fields and printed broad sample objects before line 35 selected by `label`. More importantly, new one-batch requests were appended to the same physical session at lines 141, 220, 289, 356, and 403. That carried prior image context and authored results into independent batches. The `view_image` calls are the core requested work and are not waste.
- **Avoidable-token range:** low **41,700**, likely **260,096**, high **288,797** input tokens. Method: low is the sum of measured input growth across the five visible request-boundary intervals (`11,898 + 7,020 + 9,697 + 7,738 + 5,347`). Likely is the sum of cached-input excess at the first measured post-request turns versus the initial `15,232` cached-token baseline (`30,208 + 39,424 + 56,832 + 56,320 + 77,312`). High is the analogous total-input excess versus the initial `18,548`-token turn. The latter bounds may include batch work, so they are not point estimates.
- **Root cause:** task design, with secondary routing/schema ambiguity.
- **Smallest reusable fix:** dispatch each generated image-description batch in a fresh worker session and pass the exact batch object or exact `label` extractor. Do not resume one visual worker across waves.
- **Confidence:** high on session-reuse waste; medium on likely/high attribution; low on complete request coverage because packet finals are incomplete.
- **Escalations:** none; packet-quality escalation for the coordinator: retain one completion/validation summary per `taskIndex` in multi-request packets.

## Packet `019f3e97-4ad0-7ab0-9c6c-5f6e62e6252f`

- **Request coverage:** handled correctly but completed partial/blocked. The production flow ran, the local review page opened and loaded 27 rows, and the final handoff gave QA counts and clearly reported the partial verdict rather than claiming success.
- **Verdict:** likely waste. Some repetition was legitimate run-to-pass recovery, but repeated whole-cycle validate/merge/sync/build invocations indicate missing incremental orchestration.
- **Cited waste events and first avoidable decision:** after the initial `queue-weekly-run-to-pass:prod` at line 29, the workflow repeatedly printed and validated both image waves, then reran validate/merge/sync/build cycles at lines 214-234, 416-431, and 557-572. The first avoidable decision was restarting the broad wrapper at line 234 rather than resuming only unresolved stages. The nine `write_stdin` polls at lines 578-620 are not counted as waste because the process was still running and emitted progress.
- **Avoidable-token range:** low **3,389**, likely **5,803**, high **42,064** input tokens. Method: low sums immediate measured deltas around duplicate post-processing commands in the later cycles (`867 + 373 + 1,074 + 698 + 377`). Likely adds the two repeated wrapper deltas (`1,297 + 1,117`). High is the measured growth across the two broad retry windows (line 236 to 433: `25,655`; line 439 to 574: `16,409`), which includes necessary worker progress and is therefore only an upper bound.
- **Root cause:** missing helper / task design.
- **Smallest reusable fix:** add a stateful `queue-weekly-resume:prod` path that reads the prior run-to-pass problems/state artifact and executes only unresolved waves and downstream stages once, then performs one final QA pass.
- **Confidence:** medium; the packet proves repetition but not which reruns changed production state.
- **Escalations:** none.

## Packet `019f4dbb-2d72-7602-8709-dffaf45323af`

- **Request coverage:** handled correctly. The response identified exact ancestry fields, distinguished `id` from optional `session_id`, described spawn evidence as corroborating, and included caveats without exposing message contents.
- **Verdict:** confirmed waste amid otherwise necessary schema investigation.
- **Cited waste events and first avoidable decision:** the first avoidable decision was a corpus-wide scalar-path/key aggregation whose result returned 56,941 bytes at line 48. It was broader than needed and the subsequent targeted `session_meta`/spawn checks supplied the useful facts. The initial rules read and bounded file sample were reasonable for the assigned analysis.
- **Avoidable-token range:** low **2,462**, likely **2,462**, high **2,462** input tokens. Method: immediate measured input delta from line 32 (`23,175`) to line 50 (`25,637`) around the large result. The later jump to line 76 is excluded because it spans uncited analysis and another command.
- **Root cause:** routing/query design.
- **Smallest reusable fix:** add a maintained schema-probe command that selects only `session_meta` ancestry fields and `spawn_agent` call/output keys, emitting counts plus one redacted example per record type.
- **Confidence:** high.
- **Escalations:** none.

## Cross-Packet Reusable Priorities

1. Fresh sessions per image-description batch; visual evidence is expensive and should not replay into the next independent batch.
2. Generated worker prompts should carry an exact `label`-based extractor, assigned count, and result path.
3. `task:context` output should create an explicit no-reread stop condition.
4. Production queue recovery needs an incremental resume helper rather than repeated full validate/merge/sync/build cycles.

No workspace-state cleanup or unrelated file changes were required for this review.
