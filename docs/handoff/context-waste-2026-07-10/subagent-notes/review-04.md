# Calibrated Context-Waste Review 04

## Scope and method

- Reviewed exactly the six assigned packet JSON files and `AGENT_LOG_ANALYSIS_RULES.md`.
- Treated detector signals as candidates. Required queue stages, polling, visual inspection, and distinct task instances were not labeled waste merely because commands or tool types repeated.
- Used packet-bounded events only. No raw rollout windows were opened.
- Avoidable-token ranges appear only when a cited action can be tied to nearby `turnUsage` input deltas. They are bounded approximations, not causal accounting.

## Packet reviews

### `019f1fd4-7f09-7512-8ee6-7a4839fa19aa`

- **Request coverage:** indeterminate from the packet. The session source request asks to inspect a named rollout, but the only captured final says, "I'll ignore that rollout message and won't inspect it." The superseding user instruction that apparently caused this response is absent. Against the source request alone this is **not handled**; against the likely active request it may be handled correctly.
- **Verdict:** insufficient evidence; no packet-proven context waste.
- **Cited waste events:** none. The packet contains no tool events or detector signals.
- **Avoidable tokens:** not estimated. The drop from line 4763 to 4774 is a context/reset effect, not evidence of an avoidable action.
- **Root cause:** packet construction omitted the active/superseding user turn while retaining an older `session.sourceRequest`.
- **Smallest reusable fix:** packet schema/collector change: include every user turn between the source request and captured final, mark the active request for each final, and identify superseded requests.
- **Confidence:** high that the packet cannot support a waste verdict; low on request completion.
- **Escalations:** collector/schema escalation only. A bounded raw window around lines 4763-4774 would be necessary only if the missing superseding request must be classified.

### `019f31a6-2d62-7790-b510-b06f7a5f7c68`

- **Request coverage:** **handled correctly.** The packet shows the March production queue merge, import, status check, 105/105 described, 0 remaining, clean repo state, and a final reporting 22 subagent batches across five validated waves.
- **Verdict:** mixed. Queue execution and final checks are necessary; startup instruction/package rereads are avoidable. The serial-read detector is not independently probative.
- **Cited waste events:** after successful `task:context -- artist-helper` at line 11, line 12 rereads `portable-agent-instructions.md` (13,681 bytes), line 19 rereads `AGENTS.md` (5,328 bytes), and line 20 reads all of `package.json` (3,244 bytes). The direct queue route already identifies the repo and prescribed workflow. Line 21's status check and lines 363-382 are relevant execution/handoff checks.
- **Avoidable tokens:** **low 2,800 / likely 3,300 / high 3,684**, bounded by input growth from line 15 (18,503) to line 25 (22,187) around the three unnecessary reads. No queue-processing tokens are counted.
- **Root cause:** direct-route instructions were not treated as a stop rule after `task:context`; the agent reconstructed command discovery from bundled docs and package metadata.
- **Smallest reusable fix:** instruction change: for the exact production image-description queue route, run `task:context`, then execute the wrapper named by the generated/local queue instructions; do not reread portable instructions or `package.json`, and read local `AGENTS.md` only when the workflow text is absent or helper output is truncated.
- **Confidence:** high on the reread waste and request coverage; medium on the token range.
- **Escalations:** none.

### `019f31eb-9280-7c10-a5f3-4b074c2a5b9a`

- **Request coverage:** **handled correctly with an explicit partial queue outcome.** The February queue was prepared, processed, validated, merged, and imported; the final accurately reports 131/132 described and identifies the one `needs_human_review` item rather than claiming a clean completion.
- **Verdict:** mixed. The `AGENTS.md` reread is avoidable; the generated-queue inspection, status rerun with `--list-remaining=1`, and final repo status are necessary. Detector frequency does not make them waste.
- **Cited waste events:** line 19 reads 5,588 bytes of `AGENTS.md` immediately after successful `task:context` at line 11. Lines 31 and 35 inspect different queue schema/details after preparation and are not packet-proven redundant.
- **Avoidable tokens:** **low 3,800 / likely 4,300 / high 4,649**, bounded by input growth from line 15 (18,556) to line 21 (23,205) around the instruction reread.
- **Root cause:** failure to trust the instruction bundle from the required context helper.
- **Smallest reusable fix:** the same post-`task:context` instruction-read guard as above, conditioned on helper success and non-truncated workflow output.
- **Confidence:** high on verdict and coverage; medium on token attribution.
- **Escalations:** none.

### `019f3308-9f26-7f61-96ff-33db3cdc227e`

- **Request coverage:** **handled correctly for the captured sequence of worker assignments.** Although `session.sourceRequest` names wave 1, the packet contains later user requests for waves 2-7 and eleven task completions; the final shown for wave 11 reports writing five items and running only the limited parse/count/required-field check. The packet does not show evidence that the queue JSON was edited or the full validator run.
- **Verdict:** mixed. Image reads are necessary and their byte size is not context waste by itself. One instruction reread and a small batch-schema discovery loop are avoidable.
- **Cited waste events:** line 17 rereads `AGENTS.md` after `task:context`. For wave 1, line 23 probes guessed keys, line 29 searches the queue text after the lookup misses, and line 35 succeeds using `batch.label`/`resultPath`; this is a reusable schema-discovery retry. The eleven `view_image` large-output signals cite required inspection of assigned images and are false positives absent duplicate inspection of the same item.
- **Avoidable tokens:** **low 1,700 / likely 2,400 / high 3,815**, bounded by input growth from line 19 (19,456) to line 37 (23,271) around the failed lookup/search/successful lookup sequence. The instruction reread is not separately estimated because no clean adjacent delta isolates it.
- **Root cause:** no stable helper/API for selecting one generated batch by label, plus unnecessary post-context instruction reading.
- **Smallest reusable fix:** helper: `print-image-description-batch --input <queue> --label <label> --json`, returning only canonical result path, item count, and assigned items; document it in the generated worker prompt. Also suppress large-output findings for unique required image inspections.
- **Confidence:** high that image signals are false positives; medium on the discovery-loop waste and range; medium on full multi-wave coverage because packet finals are sampled.
- **Escalations:** packet schema should associate each completion and event range with its user request/task index; no raw-log escalation needed.

### `019f3e09-4b06-7522-9808-b0670c6d410c`

- **Request coverage:** **handled correctly, with an accurately qualified QA result.** The local review page was opened and the final provides queue/status/quality counts while labeling QA `partial`, not clean-pass.
- **Verdict:** mixed. Initial routing/doc exploration violates the exact direct-route playbook and is avoidable. Repeated wrapper runs, polling, queue refreshes, validation/merge commands, and worker dispatches show changing workflow state and are not proven waste by repetition alone.
- **Cited waste events:** before `task:context -- artist-helper` at line 21, lines 11-13 read portable instructions and `SUBMODULES.md` and run `find:repos`, despite the exact request having a direct artist-helper route. Lines 27-28 then reread `AGENTS.md` and all of `README.md`; the playbook permits local `AGENTS.md` only if needed, but explicitly excludes README routing probes. Polls at lines 59-95 and 283-309 are ordinary waits on running sessions. Repeated print/SCP/validate operations occur after refreshed queue state and are not shown to be no-op retries.
- **Avoidable tokens:** **low 5,500 / likely 6,500 / high 7,055**, bounded by input growth from line 17 (18,662) through line 33 (25,717) around the routing and broad-doc reads. No repair/queue-loop tokens are counted.
- **Root cause:** exact workflow routing was treated as a hint rather than an exclusive fast path; the agent performed generic repo discovery and broad documentation reads.
- **Smallest reusable fix:** instruction/route validator: when the exact Threads queue request matches, require first tool `npm run task:context -- artist-helper` and flag reads of portable instructions, `SUBMODULES.md`, README, `package.json`, or `find:repos` before the production wrapper.
- **Confidence:** high on startup waste and request coverage; medium on the token range; high that repetition signals alone do not prove later waste.
- **Escalations:** helper telemetry should label wrapper phase/state transitions so reruns can be distinguished from unchanged retries. No raw window needed.

### `019f43cd-8326-79b1-9985-db1678d8ff59`

- **Request coverage:** **mixed across evolving requests.** The packet shows implementation for stale static-site ordering, a successful frontend build, investigation of the later 423 Locked report, and later finals verifying `X-Robots-Tag` behavior. It does not include a final tied to the original stale-hash request or enough commit/validation evidence to prove that fix was fully handed off; therefore the original request is **indeterminate**, while the final noindex verification request is handled correctly.
- **Verdict:** substantial bounded context waste amid legitimate cross-repo debugging.
- **Cited waste events:** lines 29-32 reread portable instructions and three repo-local instruction paths after three `task:context` calls. Line 43 runs a repo-wide broad `rg` whose captured output is 40,216 bytes and reports 56,789 original tokens; targeted static-site paths were already implied by the symptom. Lines 64-66 then read essentially all 820 lines of `staticSiteGenerator/index.ts` (35,986 output bytes) before later targeted windows. Line 216 repeats a broad `rg` for `ipfs` over `app index.ts`, yielding 20,624 bytes/5,130 tokens, while line 217 runs the same query in another context and returns no matches. The test at line 185 produced 28,909 bytes of database-auth failure output; running the repo's environment-aware test helper first would likely have avoided this, though the packet does not prove the correct helper would pass.
- **Avoidable tokens:** **low 9,000 / likely 11,000 / high 12,879** for the later broad Locked/IPFS search cluster, bounded by input growth from line 189 (94,069) to line 222 (106,948). This range excludes earlier broad reads because intervening implementation work prevents clean attribution. It also does not count the failed test output.
- **Root cause:** broad symptom keywords were searched across large trees before narrowing to the known module/API boundary; context-helper output was reread; validation command discovery happened after a direct test invocation.
- **Smallest reusable fix:** instruction plus helper: after routing cross-repo static-site issues, search API names and recent diffs in `app/modules/staticSiteGenerator`, the consumer call site, and gateway hook paths first; cap broad searches with file globs/match counts. Use manifest/local validation commands before constructing Mocha invocations. Add a post-`task:context` bundled-instruction reread guard.
- **Confidence:** high on broad-read waste, medium on request coverage and test-command avoidability, medium on the token range.
- **Escalations:** request-to-task/final mapping is needed for multi-request sessions. A bounded raw window would only be warranted to decide whether the original stale-hash fix was committed/handed off; it is unnecessary for the waste verdict.

## Cross-packet reusable fixes

1. Make exact queue routes exclusive: the first action and allowed startup reads should be machine-checkable.
2. Record helper success, truncation, and bundled instruction sections so post-context rereads can be judged reliably.
3. Preserve semantic identifiers for repeated operations: wave, batch, wrapper phase, refreshed queue generation, session state, and cwd.
4. Add canonical generated-queue batch printers instead of requiring workers to rediscover JSON keys.
5. Treat unique visual inspections as required media input, not `large-tool-output` waste; flag duplicate image/item inspections instead.
6. Add active-request/task-index linkage to finals and packet events, especially when one session receives multiple follow-up requests.

## Residual risks

- Adjacent input deltas include surrounding prompt/tool material and caching effects; all ranges are intentionally bounded and conservative.
- Packets with sampled events can establish cited local waste but cannot always prove complete end-to-end handoff.
- No raw logs were read, so missing request transitions and commit outcomes remain unresolved rather than inferred.
