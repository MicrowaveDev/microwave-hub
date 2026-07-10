# Context-Waste Review 06

## Scope And Method

- Reviewed exactly the six assigned calibrated packets using `AGENT_LOG_ANALYSIS_RULES.md` and the review schema in `docs/agent-playbook/past-week-log-context-waste-analysis-plan.md`.
- Detector signals were treated as candidates. Large image outputs, distinct image inspections, and queue orchestration were not classified as waste merely because they were expensive.
- No raw-log windows were opened. Avoidable-token estimates use only adjacent measured input-token deltas and do not include speculative downstream replay savings.

## Packet Reviews

### `019f2ef2-3db0-7710-88d6-a3087c97c37a`

- **Request coverage:** Handled correctly. The final response recommends the gacha roll/burn DTO slice, identifies exact source functions and prospective core/Mushroom/Meat files and tests, states risks/non-goals, and says no files were edited. It also refreshes the recommendation after detecting that Mushroom's nested core moved during the audit.
- **Verdict:** Likely waste.
- **Cited waste events and first avoidable decision:** The first avoidable decision is rereading `mushroom-master/AGENTS.md` at line 22 after `task:context` at line 11 had already bundled local instructions. The Meat instructions and portable instructions at lines 23-24 are the same immediate reread pattern. The unbounded Mushroom file inventory at line 32 returned 16,096 output tokens and was truncated; the broad source search at line 66 reported 131,721 original output tokens and was also truncated. Later targeted searches and narrow `sed` windows show that these broad dumps were not required. Reads of successive, non-overlapping ranges in `client-view-model.js`, its tests, and `asset-service.js` are necessary audit work, not duplicate-read waste.
- **Avoidable-token range:** **Low 0 / likely 9,000 / high 11,599 input tokens.** Method: the instruction-read cluster is capped by the 416-token rise from line 18 to line 28; the line-32 inventory cluster is capped by the 11,183-token rise from line 28 to line 38. The likely estimate assigns most of the latter delta to the 16,096-token truncated inventory. The later line-66 broad search is not added because its contribution is not isolated from nearby work in the packet.
- **Root cause:** Missed instruction plus task design/search scoping.
- **Smallest reusable fix:** After successful `task:context`, suppress instruction rereads. For cross-product extraction audits, start with targeted symbol searches in known source roots and cap matches/output; do not enumerate all source files or search server and web trees with a large generic keyword alternation.
- **Confidence:** High on request coverage and the instruction/file-inventory waste; medium on the token range because several read-only calls share the adjacent turn.
- **Escalations:** None.

### `019f31b1-8bfb-7bf0-9a09-56f4a0e0198e`

- **Request coverage:** Handled correctly. The worker produced the requested result path with five items, validated JSON and count, and did not report edits outside the result. The packet does not expose field-by-field validation, but the requested narrow completion state is otherwise present.
- **Verdict:** Likely waste, limited to startup/probing overhead; the image and video payloads are necessary cost.
- **Cited waste events and first avoidable decision:** The first avoidable decision is `cat AGENTS.md` at line 17 immediately after `task:context` at line 11. Lines 133-136 probe four browser application paths even though Chrome succeeds on the first probe; the remaining probes are avoidable. The two video capture calls at lines 152 and 159 are not proven duplicates: the first establishes playable media but its server does not implement byte ranges, while the second adds proper range handling and captures seeked frames. Large still-image and video-frame outputs are required visual evidence, not context waste by themselves.
- **Avoidable-token range:** **Low 0 / likely 800 / high 927 input tokens.** Method: cap the instruction reread at the measured rise from 18,383 input tokens at line 13 to 19,310 at line 19. Browser-path probes are not added because the packet provides no separately attributable turn delta.
- **Root cause:** Missed instruction and minor task-design probing.
- **Smallest reusable fix:** Make the queue worker startup path explicitly stop after `task:context`, and use the first available browser (or a single `command -v`/ordered lookup helper) rather than probing every known application after success.
- **Confidence:** High that visual payloads were necessary; medium-high on the narrow waste finding.
- **Escalations:** None.

### `019f32d7-c98d-7681-a82d-9a0eaf882bda`

- **Request coverage:** Handled correctly, with recovery. The final handoff reports 124/124 queue items described, validation/import outcomes, human-review counts, and final production status. It also records that the generated range-as-month status command was invalid and gives the corrected status invocation and remaining-list artifact.
- **Verdict:** Likely waste.
- **Cited waste events and first avoidable decision:** The first avoidable decision is rereading `AGENTS.md` at line 17 after `task:context` at line 11. Queue preparation, wave printing, worker dispatch, validation, merge, and import are required. At line 590 the agent reads 280 lines of the status implementation, then another range at line 635; those ranges are distinct, so the repeated-read detector overstates the issue. The stronger waste event is line 641: after observing that the deployed status wrapper exposes the older output shape, the agent requests JSON that emits 224,137 original output tokens and a truncated 40,220-byte packet event merely to recover summary counts. The next step uses the already-saved remaining-row log, which was the bounded source to query directly.
- **Avoidable-token range:** **Low 10,000 / likely 12,500 / high 13,410 input tokens.** Method: the JSON status dump is capped by the 12,554-token rise from line 643 to line 649; the instruction reread is capped by the 856-token rise from line 13 to line 19. The low estimate allows for some structured status data being necessary while excluding the bulk remaining-item array.
- **Root cause:** Missed instruction plus missing helper/validator contract for concise production status.
- **Smallest reusable fix:** Add a production status summary mode that emits only aggregate counts and source breakdowns, and validate generated status commands against accepted date arguments. Queue instructions should direct agents to the saved remaining-row log for bounded follow-up queries instead of requesting full JSON arrays.
- **Confidence:** High on completion and the large-output finding; medium-high on attribution of the adjacent delta.
- **Escalations:** None.

### `019f3308-a000-7a03-a725-305c7b79d49b`

- **Request coverage:** Handled correctly for the batches evidenced by the packet. The session receives successive wave requests and the final event reports a validated one-item wave-11 result; however, the packet lists only requests through wave 5 and omits most writes/finals, so complete coverage of every reused-session batch cannot be independently checked.
- **Verdict:** Likely waste, with most reported large outputs being necessary image-inspection cost.
- **Cited waste events and first avoidable decision:** The first avoidable decision is rereading `AGENTS.md` at line 17 after `task:context` at line 11. The first batch lookup at line 23 tests nonexistent identifier fields and returns nothing. After line 30 reveals the actual `label` field, line 31 dumps metadata and keys for every batch, producing 5,505 output tokens, instead of selecting the requested label directly. The many `view_image` outputs correspond to distinct assigned images across successive wave requests and are necessary, not duplicate work.
- **Avoidable-token range:** **Low 0 / likely 900 / high 1,033 input tokens.** Method: sum the adjacent caps for the instruction reread (740-token rise from line 13 to line 19) and the all-batch metadata dump (293-token rise from line 25 to line 35). No image-token savings are claimed.
- **Root cause:** Missed instruction plus queue-schema discoverability/task design.
- **Smallest reusable fix:** Put a copy-paste batch-selection command in each generated worker prompt, keyed by the real `label` field. Suppress instruction rereads after `task:context`; if schema discovery is necessary, inspect one batch's keys and immediately issue the targeted selector.
- **Confidence:** High on the two startup waste events and necessity of distinct image reads; medium on whole-session request coverage because reused-worker requests/finals are incomplete.
- **Escalations:** None.

### `019f3e99-17d0-7b50-bf0c-39d43cf6f098`

- **Request coverage:** Handled incorrectly. The worker writes and validates the one-item result, but the packet contains no `view_image` or other visual inspection of the assigned `localPath`. The request explicitly requires inspecting the image and says caption text is context, not proof. The completion therefore proves schema/count success, not factual visual review.
- **Verdict:** Likely waste.
- **Cited waste events and first avoidable decision:** The first avoidable decision is rereading `AGENTS.md` at line 17 after `task:context` at line 11. The line-23 batch selector guesses `agentId`, `id`, and `batchId` and fails; line 29 then dumps metadata for every batch before line 35 finally selects the actual `label`. Those two discovery attempts are avoidable if the generated prompt or queue helper provides the canonical selector. More importantly, this exploration did not lead to the required image inspection, so the low-cost schema validation cannot make the handoff complete.
- **Avoidable-token range:** **Low 0 / likely 1,100 / high 1,230 input tokens.** Method: cap the instruction reread by the 654-token rise from line 13 to line 19 and the all-batch metadata query by the 576-token rise from line 25 to line 31. The failed targeted lookup's cost and any cost of redoing the uninspected description are not estimated.
- **Root cause:** Missed instruction plus task-design/queue-schema ambiguity.
- **Smallest reusable fix:** Generate the exact `jq`/Node selector for the batch's canonical `label`, and make narrow worker validation require recorded visual-inspection evidence for each assigned `localPath` before accepting `agentStatus: described`.
- **Confidence:** High that visual inspection is absent from the packet's complete 11-call timeline; medium-high on the token range.
- **Escalations:** None.

### `019f4dc2-8b81-7622-8a54-92dfb307f8d6`

- **Request coverage:** Not handled. The session ends after three read-only calls with no creation of `agent-viewer/test/rank-context-waste.test.mjs`, no test run, and no final report. The packet may represent an interrupted or superseded child, but no termination/reassignment evidence is included.
- **Verdict:** Likely waste for one broad discovery call; otherwise necessary but incomplete startup cost.
- **Cited waste events and first avoidable decision:** `task:context -- agent-viewer` at line 12 is the correct first action. The first avoidable decision is the line-16 compound probe: `find .. -name AGENTS.md -o -name CLAUDE.md` scans above the target repo and lists instructions across unrelated submodules even though `task:context` already supplied the target instructions. The same call mixes status, file discovery, and large source reads, returns 15,555 bytes despite a 3,000-token cap, and makes it harder to distinguish relevant concurrent files. The line-22 targeted implementation/package/test read is reasonable preparation for the requested test.
- **Avoidable-token range:** **Low 0 / likely 300 / high 393 input tokens.** Method: cap the broad line-16 discovery call at the measured rise from 19,051 input tokens at line 14 to 19,444 at line 18. No cost is assigned to the necessary targeted implementation read or to the unexplained interruption.
- **Root cause:** Missed helper/routing instruction plus unknown task lifecycle interruption.
- **Smallest reusable fix:** After `task:context`, scope discovery to `rg --files test scripts` and the owned target file; never search parent/submodule instruction trees. Add child-session termination and reassignment fields so an interrupted worker can be distinguished from an abandoned task.
- **Confidence:** High that the request was not completed and the parent-wide instruction search was irrelevant; low on why the session stopped.
- **Escalations:** None.

## Cross-Packet Findings

1. **Immediate instruction rereads remain the most consistent calibrated waste.** Five packets reread local instructions directly after successful `task:context`; one additionally searched every neighboring repo for instruction files. A terse helper completion marker plus a same-task guard/detector would remove this reliably.
2. **Generated queue prompts do not expose a canonical batch selector.** Three workers guess nonexistent ID fields, inspect schema, or dump all batch metadata before discovering `label`. Emit the exact bounded selector in `subagentPrompt` and cover it with a generator test.
3. **Large visual payloads are usually necessary.** Distinct `view_image` calls and seeked video frames should not be ranked as waste solely by byte size. The actionable large-output case is structured status JSON containing thousands of rows when only aggregates were needed.
4. **Validation can pass while request coverage fails.** `019f3e99-17d0-7b50-bf0c-39d43cf6f098` validates JSON shape/count without evidence that the assigned image was inspected. Worker validation needs an inspection-evidence gate, not only schema checks.
5. **Packets still need lifecycle completeness for reused or interrupted workers.** Successive wave requests/finals are incomplete in one reused session, and the unfinished test worker has no termination reason or reassignment state. This limits end-to-end coverage judgments without justifying a raw-log escalation.
