# Context-Waste Review 03

## Scope And Method

- Reviewed only the six assigned calibrated packets and the governing plan/rules. No raw-log windows were opened.
- Detector signals are treated as candidates. Large image payloads, distinct source windows, validation reruns after changes, and progress-aware queue operations are not labeled waste without causal evidence.
- Avoidable-token ranges appear only where adjacent `turnUsage` records bound the cited events. They do not include speculative downstream replay savings.

## Packet Reviews

### `019ef16b-fd26-7ab0-af1a-25519d06d100`

- **Request coverage:** **Insufficient evidence.** The frozen request is only "continue implementing the plan"; the packet does not identify the plan's remaining acceptance criteria or include a final response for the cited task. Startup, implementation discovery, tests, and visual checks are visible, but end-to-end completion cannot be assessed.
- **Verdict:** **Likely waste**, limited to repeated instruction loading and possibly redundant screenshot reinspection; the broader implementation cost is not adjudicable.
- **Cited waste events / first avoidable decision:** After `task:context -- mushroom-master` at line 16800, full `AGENTS.md` reads at lines 17145 (40,212 bytes) and 17181 (38,563 bytes) duplicate instructions already bundled by the helper. Line 17145 is the first established avoidable decision. The same desktop screenshot is opened at lines 17479, 17514, 18040, and 18123, and the same mobile screenshot at 17520, 18045, and 18129; these are only a candidate because intervening UI changes may make reinspection necessary.
- **Detector assessment:** The instruction-reread signal is valid. Large test output and image payloads are measurements, not proof of waste. Repeated tests and screenshots may correspond to implementation iterations, which the packet does not pair with intervening writes.
- **Avoidable-token range:** **Not estimated.** Nearby usage records do not isolate either instruction read or distinguish necessary post-change visual checks from duplicate inspections.
- **Root cause:** Missed instruction; packet schema omits change-to-validation linkage.
- **Smallest reusable fix:** Have successful `task:context` emit a machine-readable `instructionsLoaded` marker and suppress same-task full rereads. In packets, pair repeated validation/image events with intervening writes and result summaries.
- **Confidence:** High on duplicate instruction loading; low on screenshot redundancy and request completion.
- **Escalations:** None.

### `019f3172-63e0-7f22-924a-2547743ff60c`

- **Request coverage:** **Handled correctly.** The production April queue was prepared, processed through subagents, checked, and handed off as 129/129 described with import and remaining-status counts. The packet does not expose all worker events, but the final response directly covers the requested queue outcome.
- **Verdict:** **Likely waste.** The queue work is necessary; the immediate instruction rereads are not.
- **Cited waste events / first avoidable decision:** Required `task:context -- artist-helper` runs at line 11. The first avoidable decision is rereading `portable-agent-instructions.md` at line 17 (13,681 bytes), followed by `AGENTS.md` at line 18 (5,106 bytes). Both were already in startup/task context. Queue preparation at line 25, bounded queue-field extraction at line 31, and status reconciliation at lines 411-431 materially support the request.
- **Avoidable-token range:** **Low 0 / likely 500 / high 650 input tokens.** Method: input rises from 18,503 at line 13 to 19,153 at line 21 after both rereads. Zero preserves attribution uncertainty; 650 is the full adjacent delta; 500 is a conservative likely share based on the two sizable read outputs.
- **Root cause:** Missed instruction.
- **Smallest reusable fix:** Suppress manual portable/local instruction reads after successful `task:context`, with a clear helper completion marker.
- **Confidence:** High on coverage and necessity of queue work; medium-high on the token attribution.
- **Escalations:** None.

### `019f31c0-83b3-7dd0-b6b1-d3452deabc40`

- **Request coverage:** **Handled incorrectly, then recovered.** The worker produced exactly five assigned results and targeted validation passed, but it violated the explicit "Do not run the full queue validator" constraint at line 103. The final answer correctly disclosed that unrelated full-queue validation failed and did not claim a global pass.
- **Verdict:** **Confirmed waste.** The forbidden validator call is direct request noncompliance; the instruction reread and broad schema dump are likely additional waste.
- **Cited waste events / first avoidable decision:** The first avoidable decision is the `AGENTS.md` reread at line 17 after `task:context` at line 11. The initial batch lookup at line 18 used the wrong keys, then line 25 dumped 35,495 bytes of queue structure before the targeted `.label` query at line 31. Most importantly, line 103 runs the full validator despite the explicit prohibition; it fails on unrelated batch `image-description-agent-1-wave-5` at line 105, after which the worker performs the requested narrow check at line 110.
- **Avoidable-token range:** **Low 0 / likely 750 / high 1,274 input tokens.** Method: the instruction-read window is bounded by the 942-token rise from lines 13 to 21; the forbidden-validator window is bounded by the 332-token rise from lines 98 to 106. The high is their sum. The likely value conservatively attributes about 500 and 250 tokens respectively; zero preserves mixed-turn uncertainty. The 35,495-byte schema dump is excluded because no adjacent delta isolates its avoidable share.
- **Root cause:** Missed instruction plus brittle batch-schema discovery.
- **Smallest reusable fix:** Put the exact narrow validation command in each worker prompt and add a worker-mode guard that refuses full-queue validation. Document or expose a stable `get-batch --label` helper to avoid probing queue schema.
- **Confidence:** High on the forbidden call and recovery; medium on the range and schema-discovery waste.
- **Escalations:** None.

### `019f3308-9ec3-7250-a1b2-a0125ad43241`

- **Request coverage:** **Insufficient evidence overall.** Eleven batch requests/completions are reported, but packet request records omit waves 7-10 and final messages only show wave 11. Wave 11 is handled correctly: four records written and narrowly validated. No full-queue validator is shown.
- **Verdict:** **Likely waste**, narrowly for startup rereading and avoidable batch-key probing. The many distinct image views are necessary cost for factual descriptions.
- **Cited waste events / first avoidable decision:** After `task:context` at line 11, `AGENTS.md` is reread at line 17; this is the first avoidable decision. For wave 1, line 23 queries nonexistent identifier fields, line 29 searches the full queue text, and line 35 finally uses the correct `.label` selector. The image payload signals at lines 43-50, 152-157, 207-210, 260-267, and 316-317 represent different assigned images and are not duplicate waste.
- **Avoidable-token range:** **Low 0 / likely 500 / high 694 input tokens.** Method: input rises from 18,548 at line 13 to 19,242 at line 19 after the instruction reread. The later batch-probing sequence is excluded because adjacent deltas combine necessary queue extraction.
- **Root cause:** Missed instruction and missing stable batch-extraction interface.
- **Smallest reusable fix:** Suppress the post-context instruction reread and provide a generated one-line batch extraction command keyed by `label` in every worker prompt.
- **Confidence:** High that image inspection is necessary; medium-high on startup waste; low on coverage of omitted waves.
- **Escalations:** None.

### `019f3964-a59a-7cd3-aa75-ae371881784f`

- **Request coverage:** **Handled correctly, but late.** The final handoff gives the open local review URL and detailed QA counts. However, the exact queue phrase had a hub fast-path requiring direct `task:context -- artist-helper`; the agent first ran repo discovery and later spent substantial effort repairing/deploying production tooling before completion.
- **Verdict:** **Confirmed waste** for delayed routing; **likely waste** for instruction rereading. The production repair/deploy sequence is insufficiently evidenced as avoidable because it may have been required to make the requested queue succeed.
- **Cited waste events / first avoidable decision:** The first avoidable decision is `npm run find:repos -- "Threads post suggestions"` at line 11; the hub rule says this exact request routes directly to artist-helper. Correct `task:context` follows at line 17, then `AGENTS.md` is redundantly read at line 23 (10,812 bytes). The first wrapper failure at line 29 and subsequent endpoint/script inspection may be legitimate recovery. Repeated SSH reports and deploy polling have changing workflow purposes and are not proven duplicates.
- **Avoidable-token range:** **Low 0 / likely 300 / high 412 input tokens.** Method: input rises from 19,352 at line 19 to 19,764 at line 25 after the `AGENTS.md` reread. The earlier discovery call has no preceding usage boundary and is not converted to tokens.
- **Root cause:** Routing instruction miss, then missed instruction after context.
- **Smallest reusable fix:** Add exact-prompt routing before generic discovery in the dispatcher and make `task:context` explicitly report that local instructions are loaded. Add a regression test that this queue phrase's first tool call is `task:context -- artist-helper`.
- **Confidence:** High on delayed routing and final coverage; medium-high on reread attribution; low on whether production repair work was avoidable.
- **Escalations:** None.

### `019f42e3-7d55-7ee3-a135-3aee47cd3f7d`

- **Request coverage:** **Insufficient evidence for the initial implementation request.** The packet shows broad implementation, tests/docs activity, branching, and later follow-up work, but its final messages cover only a sixth request to inspect a production sticker locally. That follow-up is handled correctly. The initial sticker caching/spoiler implementation's validation, commit/push, and handoff are omitted.
- **Verdict:** **Likely waste** for redundant routing/instruction reads; otherwise insufficient evidence. Distinct source windows are mostly necessary implementation discovery.
- **Cited waste events / first avoidable decision:** The first avoidable decision is rereading `portable-agent-instructions.md` and `SUBMODULES.md` at lines 11-12 even though both were in startup context. Correct `task:context -- blog-master` follows at line 19, then `AGENTS.md` is reread at line 25. The detector's repeated-file signals mostly collapse different ranges of large implementation files; for example `geesomeChan/index.js` lines 65-68, 81-82, 91-94, and 103-106 are distinct regions. The failed `socNetBot.js` read at line 192 is a small wrong-path probe, not a recovery loop.
- **Avoidable-token range:** **Low 0 / likely 300 / high 437 input tokens** for the post-context reread only. Method: input rises from 25,303 at line 21 to 25,740 at line 31 after `AGENTS.md`, README, and status; 437 caps attribution and 300 is a conservative likely share. No prior turn boundary isolates the two pre-routing reads.
- **Root cause:** Missed startup-context and routing instructions; detector over-normalizes distinct file ranges.
- **Smallest reusable fix:** Treat startup-injected hub docs as already loaded, route with the known manifest/helper, and make repeated-file detection overlap-aware so disjoint ranges are not counted as repeats.
- **Confidence:** High on redundant startup docs and false-positive file-read grouping; medium on the token range; low on initial-request completion.
- **Escalations:** None.

## Cross-Packet Findings

1. **Immediate instruction rereads recur in all six packets.** The smallest durable change is a machine-readable success marker from `task:context` plus a detector/regression test for any full portable/local instruction read before the next user request.
2. **Worker prompts need executable narrow-validation and batch-extraction commands.** This would prevent both the explicit full-validator violation in `019f31c0...` and repeated schema probing in image-description workers.
3. **Detector normalization needs semantic boundaries.** Distinct file ranges, different assigned images, changing waves, and post-change validations must remain distinct. Repetition should require overlapping ranges or equivalent inputs with no intervening write/state change.
4. **Packet completion coverage remains uneven.** Packets should include the governing request and final response for every cited task segment, plus intervening-write links for repeated validation or visual checks. This is necessary to distinguish iteration from duplication without raw-log escalation.

## Escalation Summary

- No raw windows requested. The packets are sufficient for the cited narrow findings; missing completion and causality fields are recorded as packet limitations rather than repaired through broad log reads.
