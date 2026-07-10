# Context-Waste Review 02

Scope: the six calibrated packets named in the assignment. Detector signals are treated as leads, not findings. No raw logs were opened and no bounded-window escalation was needed.

## 019e50c0-0c62-7db3-9c82-694b7b07cad5

- **Request coverage:** The packet spans many requests. The initial plan, subagent-oriented revision, repeated implementation continuations, implementation-informed plan updates, modular brief-builder adjustment, review, commits, pushes, and hub pointer handoff appear handled. The final handoff reports the requested postmortem and explicitly says the current queue is reviewable but not post-ready. Coverage is therefore broadly correct, though the packet does not expose enough authored content to independently judge product quality.
- **Verdict:** Confirmed context waste, material but secondary to a very large implementation session.
- **Cited waste events:** `AGENTS.md` was reread after `task:context` at lines 9030, 9792, and 10377. Broad searches/reads emitted 36,219 bytes at 9705, 27,377 + 19,248 bytes at 9801-9802, 21,481 bytes at 9811, 20,528 bytes at 10273, 21,205 bytes at 10349, 36,957 bytes at 10611, and full-script reads of about 25 KB at 10792 and 10842. Several of these repeat already-read files or search broad directories when the active request named a specific plan or script.
- **Avoidable tokens:** **low 45k / likely 90k / high 170k.** Anchors: the T6 exploration grows from 106,773 input tokens at line 9797 to 124,056 at 9817 (17,283); later broad reads grow 206,951 at 10277 to 232,988 at 10355 (26,037); the brief-builder sequence grows 132,096 at 10616 to 211,076 at 10891 (78,980). Only portions of those deltas are attributed because implementation edits and reasoning also occurred between samples.
- **Root cause:** Long-lived session context plus repeated reorientation on each continuation; no compact implementation-state/remaining-work command; broad `rg` and whole-file reads used as substitutes for targeted plan sections and symbols.
- **Smallest reusable fix:** Add a compact `queue-plan-status` helper that prints current phase, remaining checklist items, touched symbols, and validation commands; add a continuation rule to use that summary and in-context instructions before rereading docs or scanning directories.
- **Confidence:** High for instruction rereads and oversized repeated reads; medium for the token range because turn deltas include productive work.
- **Escalations:** None. A quality verdict on the authored postmortem would require its contents, but that is outside this context-waste packet review.

## 019f2f7a-1739-75e0-ba3b-4eb3e69590a8

- **Request coverage:** Handled correctly. The worker selected the named batch, inspected exactly four images, wrote four structured descriptions to the requested result path, parsed the JSON, checked the count, and reported completion. No evidence shows queue JSON modification or unrelated edits.
- **Verdict:** Minor confirmed waste; detector image-size signals are false positives for this task.
- **Cited waste events:** The only supported waste is rereading `AGENTS.md` at line 17 immediately after `task:context` at line 11. The four `view_image` outputs at lines 29-32 are necessary primary evidence for factual image descriptions, regardless of byte size. The existence check and timestamp command at lines 41 and 47 are small and reasonable.
- **Avoidable tokens:** **low 0.4k / likely 0.8k / high 1.2k.** The adjacent input-token delta is 19,197 - 18,314 = 883 between lines 13 and 19, which contains the redundant instruction read.
- **Root cause:** Queue-worker startup instructions did not fully suppress the default post-`task:context` instruction reread.
- **Smallest reusable fix:** In the generated worker prompt, state: “`task:context` already prints repo instructions; do not reopen `AGENTS.md`.”
- **Confidence:** High.
- **Escalations:** None.

## 019f31c0-2d63-7523-97cf-545fe86f09ea

- **Request coverage:** Handled correctly with a transparent partial-validator caveat. Five objects were written; JSON and required-field checks passed. The full queue validator failed only because a different wave result was absent, and the final message did not claim that validator passed.
- **Verdict:** Confirmed moderate context waste. Large image payload signals are not proof of waste and are rejected here because five assigned images had to be inspected.
- **Cited waste events:** `AGENTS.md` was reread after `task:context` at line 17. The first batch selector used nonexistent/incorrect `batchId` at line 18, then a broad `rg` dumped 8,493 bytes at line 25 before `jq 'keys'` at line 26; a direct label-aware selector would have avoided both. After the result-path confusion and failed file check at line 68, the worker reread 13,681 bytes of `portable-agent-instructions.md` at line 70, which did not establish the file and was unrelated to the batch schema. The later targeted schema check was appropriate.
- **Avoidable tokens:** **low 6k / likely 12k / high 20k.** Anchors: startup/query correction grows 18,383 at line 13 to 20,681 at line 29 (2,298); the post-image/result-path recovery grows 26,256 at line 49 to 45,618 at line 74 (19,362), dominated in the packet by the 13.7 KB instruction reread and avoidable recovery probes.
- **Root cause:** Generated prompt and queue schema disagree on the batch key (`label` versus attempted `batchId`), and the worker lacked a single-batch extraction/validation command.
- **Smallest reusable fix:** Print an exact, copyable command in each worker prompt, such as `jq '.agentBatches[] | select(.label == $label)' --arg label ...`, plus a validator mode that accepts `--batch-label` and validates only that result file.
- **Confidence:** High for the events and root cause; medium-high for the token range.
- **Escalations:** Escalate the queue-wide validator’s inability to validate one completed batch independently; this creates needless false blockage for parallel workers.

## 019f3307-38bf-7cc0-80a1-3292d3ac054a

- **Request coverage:** Handled correctly. The coordinator prepared the requested 2018-2021 site queue, processed waves with subagents, validated/merged/imported results, repaired an invalid printed status command, directly verified all 206 queue media, and reported a clean worktree. The final status explicitly distinguishes the generated-command defect from the successful equivalent check.
- **Verdict:** Confirmed orchestration waste, despite correct completion.
- **Cited waste events:** Repeated `wait_agent` calls poll shrinking target sets throughout lines 169-625; detector clusters explicitly identify repeated commands at lines 174/370/419/517, 179/228/522, and 238/287/336/532. Some waiting is necessary, but the coordinator repeatedly reissued waits for the same slow agents and accumulated 156 tool calls. The printed `--month=2018-01-01_2021-12-31` status command was invalid and forced a manual `--from/--to` repair plus direct DB verification.
- **Avoidable tokens:** **low 10k / likely 24k / high 40k.** Anchors: polling-era input rises 45,777 at line 171 to 76,369 at line 426 (30,592), then to 100,042 at line 633 (23,673). Wave transitions and useful validation consume part of those deltas, so less than half is assigned at likely. The high estimate remains below the full 54,265-token growth.
- **Root cause:** Coordinator must manually poll individual agents and lacks a wave barrier that returns once all targets finish; queue generation emits a status command incompatible with date-range queues.
- **Smallest reusable fix:** Add one `wait-wave` orchestration helper that blocks on all batch IDs and returns one compact completion/failure table. Fix queue generation to print `--from/--to` for ranges and cover the exact command with a fixture test.
- **Confidence:** High for repeated polling and invalid command; medium for token attribution because waiting turns also carry normal replay.
- **Escalations:** Escalate the invalid generated status command as a concrete tooling defect. No source window is needed; the final packet evidence names both invalid and working forms.

## 019f393a-b348-7da2-9b68-c6d00d1a2d08

- **Request coverage:** The visible requests are handled: a plan was authored for more natural/viral Threads posts, implementation was performed, a short run prompt/instruction flow was added, and a later rollout was analyzed. The final handoff reports plan updates, commits, pushes, pointer update, and residual unrelated hub dirt. Product-quality adequacy cannot be independently verified from packet excerpts alone.
- **Verdict:** Confirmed high context waste.
- **Cited waste events:** After `task:context` at line 11, both `portable-agent-instructions.md` and `AGENTS.md` were reread at lines 17-18 (23,550 bytes). A repo-wide `rg -S .` at line 25 produced 40,214 bytes and was truncated; another broad immigration search at line 122 produced 40,215 bytes from an original 57,160-token result. Multiple large whole-file reads followed, including 23,937 bytes of the plan at line 167 and 27,673 bytes of diff at line 557. At line 717, `head -n 5` on a raw JSONL emitted 37,485 bytes before the maintained analyzer was correctly run at line 725, directly violating the cleaned/analyzer-first workflow.
- **Avoidable tokens:** **low 35k / likely 65k / high 100k.** Anchors: startup exploration grows 18,757 at line 13 to 37,444 at line 43 (18,687); broad content searches grow 74,552 at line 89 to 109,806 at line 128 (35,254); raw-log pre-read and subsequent analysis grow 22,504 at line 649 to 48,201 at line 729 (25,697), with the raw `head` alone introducing a 14,887 input-token rise to line 721. Productive analysis is discounted from likely/high.
- **Root cause:** Analyzer-first and task-context rules were not treated as hard routing gates; broad discovery occurred before narrowing to the named postmortem, queue implementation, and analyzer output.
- **Smallest reusable fix:** Make `agent:analyze-log --workflow-waste` the mandatory first command for rollout-analysis prompts and add a guard/warning when shell commands read `.jsonl` directly. Add a compact artist-helper queue architecture index so plan work starts from named modules instead of `rg -S .`.
- **Confidence:** High.
- **Escalations:** None for context waste. Independent assessment of whether the resulting prose is genuinely natural or viral would require authored artifacts and is outside packet scope.

## 019f3ed8-272d-7443-9065-d98314f53e56

- **Request coverage:** Not handled. The worker only ran `task:context` and emitted a scope update; it did not read the named batch, inspect its item, overwrite the result JSON, validate it, or report completion.
- **Verdict:** No proven context waste; confirmed incomplete execution/coverage failure. The sole 953-byte context command is the exact required fast-start route for this production queue workflow.
- **Cited waste events:** None. There are no detector signals and no unnecessary read shown.
- **Avoidable tokens:** Not estimated. The single turn has no nearby before/after delta that isolates avoidable work, and the command itself was required.
- **Root cause:** Session terminated or was interrupted immediately after setup; the packet does not establish why.
- **Smallest reusable fix:** Queue coordinators should treat a worker as successful only after the expected result file exists and passes single-batch validation; automatically retry setup-only workers.
- **Confidence:** High for non-coverage; low for causal diagnosis.
- **Escalations:** Escalate to the coordinator as a missing batch result/retry condition. A bounded raw window would only be justified if the interruption mechanism itself must be diagnosed.

## Cross-Packet Findings

1. **Highest leverage:** add exact single-batch extract/validate commands to generated prompts. This removes schema guessing, broad searches, and queue-wide validator blockage.
2. **Orchestration:** replace repeated shrinking-target polling with one wave barrier and retry setup-only workers based on artifact validation.
3. **Instruction routing:** trust `task:context` output and explicitly prohibit immediate instruction rereads in generated workers.
4. **Analyzer routing:** enforce maintained analyzer first and discourage direct JSONL reads.
5. **Detector calibration:** do not classify `view_image` byte volume as waste when visual inspection is the assigned work; require redundant resolution, out-of-scope images, or repeated inspection evidence.

Workspace state: only this review note was authored; no cleanup, branch movement, raw-log access, or other file changes were performed.
