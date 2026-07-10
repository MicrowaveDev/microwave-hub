# Context-Waste Review 01

## Scope and method

- Reviewed only the six assigned calibrated packets. Detector signals were treated as candidates, not proof.
- No raw logs or source windows were opened. Packet evidence was sufficient for the bounded findings below.
- Token estimates use only nearby `turnUsage.input_tokens` differences. They do not convert tool calls, output bytes, failures, or session totals into tokens, and they exclude unmeasured downstream replay.

## Packet reviews

### `019dfe3e-322b-7960-a2ce-a5dbc7e77705`

- **Request coverage:** **Not handled by the packet evidence.** The packet freezes three requests: estimate remaining ActivityPub PRs, add native Bluesky/ATProto to the plan, and continue after merge. It shows relevant searches, edits/diffs, tests, and later implementation starts, but omits the answers and handoffs near those requests. The supplied final messages are from a much later `geesome-ui` task, so they cannot prove coverage of the July 3 requests.
- **Verdict:** **Likely waste**, narrowly for repeated instruction loading; otherwise **insufficient evidence**. The substantive roadmap searches, implementation reads, tests, and branch refreshes are plausibly necessary across distinct continuation tasks.
- **Cited waste events and first avoidable decision:** The first supported avoidable decision is rereading `AGENTS.md` after task context at line 93988. The same immediate-reread signal recurs at lines 94304, 94518, and 94737. The two diffs at lines 93906 and 93926 may overlap, but the packet does not show their content equality, so they are not classified as waste. Session-wide totals and repeat counts are not local proof.
- **Avoidable-token range:** Not estimated. Although nearby turn usage exists, the four rereads occur across task boundaries and share turns with branch refreshes, source discovery, and other work; the packet does not isolate an attributable adjacent delta.
- **Root cause:** Missed helper/instruction plus packet task-boundary ambiguity.
- **Smallest reusable fix:** After successful `task:context`, suppress same-task reads of bundled instruction files unless the helper reports truncation or the agent requests a specific omitted section. Packet generation should attach a task-segment ID and the local completion to every cited event.
- **Confidence:** Medium on instruction-reread waste; high that end-to-end request coverage is not established.
- **Escalations:** None.

### `019f2f59-ca41-76d2-ad0f-71505e345d9b`

- **Request coverage:** **Handled correctly.** The final handoff reports all 36 batches and 175 items completed, merged queue validation, successful production import (`175 imported, 0 skipped`), and the requested production May workflow. Lines 557, 563, and 570-571 support the final checks.
- **Verdict:** **Confirmed waste** in startup routing; the queue fan-out, merge, validation, and import are necessary cost.
- **Cited waste events and first avoidable decision:** The first avoidable decision is line 11, reading `portable-agent-instructions.md`, followed by `SUBMODULES.md` at line 12 and two broad routing searches at lines 13-14. The hub fast path explicitly routes an image-description queue directly to `artist-helper` and `npm run task:context -- artist-helper`, which did not occur until line 25. Reading `AGENTS.md` again at line 31 after successful task context is also likely redundant. README and package reads at lines 32 and 34 may be needed for the generated workflow and are not condemned from packet evidence.
- **Avoidable-token range:** Not estimated. The routing detour precedes the first measured turn at line 21, so there is no adjacent before/after delta that bounds its token cost.
- **Root cause:** Routing and missed helper/instruction.
- **Smallest reusable fix:** Make the exact production image-description phrase a deterministic router that executes `task:context -- artist-helper` before any docs or search, then follows only the queue instructions named by `artist-helper/AGENTS.md`.
- **Confidence:** High.
- **Escalations:** None.

### `019f31c0-0fe7-7791-ad40-74e6daab2064`

- **Request coverage:** **Handled correctly.** Five assigned descriptions were written, the targeted consistency check passed, and the handoff correctly separated a missing sibling result from this worker's output. The packet shows the required five image inspections at lines 43, 49, 54, 59, and 64.
- **Verdict:** **Likely waste** around duplicated instructions and batch lookup; the image views and targeted validation are necessary.
- **Cited waste events and first avoidable decision:** The first avoidable decision is rereading `AGENTS.md` at line 17 immediately after `task:context` at line 11. The lookup then queried `.id` at line 25 even though the request supplied the generated label, broadened to all batch metadata at line 31, and only later used `.label`. After a validator/tool failure at line 119, line 124 reread the full portable instructions rather than directly switching from unsupported `jq --argfile` to the narrow Node check. Final status/ignore checks at lines 133-144 accurately established generated-file state and are not treated as waste.
- **Avoidable-token range:** **Low 0 / likely 1,500 / high 2,866 input tokens.** Method: cap the immediate instruction reread at the line 13->21 delta (658), the wrong batch lookup at line 21->27 (1,470), the broad metadata fallback at line 31->33 (233), and the post-failure portable reread at line 120->128 (505). Zero retains uncertainty because useful work shares these turns; likely excludes part of the mixed-turn overhead.
- **Root cause:** Missed helper/instruction and queue-schema lookup ambiguity.
- **Smallest reusable fix:** Put an exact copy-paste selector and targeted result validator in every worker prompt, keyed by `label`; suppress bundled-instruction rereads after `task:context` and after ordinary tool incompatibilities.
- **Confidence:** Medium-high.
- **Escalations:** None.

### `019f32f7-ca85-7a01-b133-4795b54e7d1a`

- **Request coverage:** **Handled correctly.** The worker wrote five results and ran only scoped JSON checks, explicitly honoring “Do not run the full queue validator.” It also avoided deleting unrelated pre-existing hub-root `data/` files while repairing its own path mistake.
- **Verdict:** **Confirmed waste** from wrong-path authoring and cleanup; **likely waste** from duplicate instructions and avoidable batch discovery.
- **Cited waste events and first avoidable decision:** The first avoidable decision is the `AGENTS.md` reread at line 17 after task context. Lines 23, 29, and 35 show an empty `.id` lookup, a text search, then the correct `.label` lookup instead of selecting by the prompt-supplied label directly. The final updates acknowledge a mistaken first write under hub-root `data/`; lines 106 and 112 are cleanup attempts caused by that write. Image views at lines 43-45 are required despite their large outputs.
- **Avoidable-token range:** **Low 0 / likely 2,500 / high 5,583 input tokens.** Method: bounded by nearby deltas around the instruction reread (line 13->19: 779), wrong-id/search sequence (19->25: 1,461; 25->31: 276; 31->37: 728), and cleanup/status turns (102->108: 806; 108->114: 501; 114->122: 426; 122->126: 606). The likely value discounts mixed necessary validation/status work; no image-view cost is included.
- **Root cause:** Missed instruction, queue-schema lookup ambiguity, and working-directory/path routing error.
- **Smallest reusable fix:** Worker prompts should provide a repo-absolute result path plus a ready-made `label` selector/validator; add a pre-write assertion that `pwd` equals the assigned repo root and the resolved output remains beneath it.
- **Confidence:** High on wrong-path waste; medium on the token share.
- **Escalations:** None.

### `019f3309-be18-7611-8df8-5bb49f79360e`

- **Request coverage:** **Handled correctly.** The final response supplies the requested backend-only inventory/classification, extraction candidates, current core SHA, blocker/status note, and confirms read-only behavior with no tests run. The packet does not reproduce the entire final answer, but its visible portion and preceding targeted reads support the requested audit shape.
- **Verdict:** **Likely waste** for duplicate/broad context loading; most code inspection is necessary audit cost.
- **Cited waste events and first avoidable decision:** The first avoidable decision is `cat AGENTS.md` at line 17 after task context, returning 40,214 bytes. Line 19 then reads the entire runtime-contract document (23,100 bytes) despite “as needed.” Lines 42-45 run four broad searches capped near 40 KB each before narrower reads of the same server areas at lines 55-82. The detector's repeated-file-read labels on lines 56 and 68 alone are not proof, because the later windows inspect implementation detail omitted by symbol searches.
- **Avoidable-token range:** **Low 0 / likely 500 / high 702 input tokens**, limited to the immediate duplicate startup context bounded by line 13->23. No tokens are assigned to the broad searches because their outputs may have materially supported the inventory and the packet lacks per-result overlap.
- **Root cause:** Missed helper/instruction and audit task design that encourages broad inventory output before focused classification.
- **Smallest reusable fix:** Add a read-only server-audit helper that emits file names, exports/imports, test references, and relevant S1/S2 excerpts in one bounded report; make `task:context` the sole instruction load.
- **Confidence:** Medium.
- **Escalations:** None.

### `019f3eb5-d2e6-76e0-accd-76d0a89dc916`

- **Request coverage:** **Handled correctly.** Five current-batch objects were written to the requested reused result path, and narrow validation confirmed assigned membership, count, and required fields. The packet shows three of the image calls at lines 43-45; the large-output signals likely cover all five, but signal count is not used as proof of extra work.
- **Verdict:** **Confirmed waste** from a wrong-root write and correction; **likely waste** from duplicate instructions and batch lookup detours.
- **Cited waste events and first avoidable decision:** Line 17 rereads `AGENTS.md` after task context. Line 23 queries a nonexistent/incorrect `id`, line 29 dumps queue/batch overview metadata (22,859 bytes), and line 35 finally selects the prompt-supplied label. Line 61 writes the result under the hub-relative path; line 67 repeats the patch with the `artist-helper/` prefix, proving the first write targeted the wrong root. The subsequent narrow validation and ignore checks at lines 74, 80, and 86 are proportionate.
- **Avoidable-token range:** **Low 0 / likely 3,000 / high 4,634 input tokens.** Method: cap the instruction reread at line 13->19 (853), the failed id lookup at 19->25 (3,267), and the broad batch overview at 25->31 (514). The wrong-root write is confirmed waste but receives no token estimate because its next measured delta also includes authoring all five result objects.
- **Root cause:** Missed instruction, queue-schema lookup ambiguity, and repo-root path confusion.
- **Smallest reusable fix:** Generate worker prompts with a repo-absolute output path and exact `label` selector, and require a pre-write resolved-path assertion. This single prompt/helper change also prevents the same pattern seen in `019f32f7-ca85-7a01-b133-4795b54e7d1a`.
- **Confidence:** High on the wrong-write finding; medium-high on the bounded estimate.
- **Escalations:** None.

## Reusable findings

1. **Queue worker prompts need executable coordinates.** The recurring `.id`-then-discovery pattern and two wrong-root writes are best fixed by emitting an exact `label` selector, repo-absolute result path, and scoped validator in each generated prompt.
2. **`task:context` needs an enforceable stop condition.** Five packets reread bundled instructions immediately afterward. Add a success marker and detector/test that flags same-task rereads unless output was truncated or a named section was absent.
3. **Special queue routing should bypass discovery.** The production coordinator spent four startup reads/searches before the helper explicitly required by the hub fast path.
4. **Audit packets should expose overlap, not only output size.** Large source searches and image views are often necessary. For text reads, include matched ranges/hashes and overlap with later reads so reviewers can distinguish broad discovery from duplicated context.

## Validation and residual risk

- Completion is well evidenced for the production queue and three image workers. The long-lived ActivityPub packet does not preserve local completions, so its request coverage remains unverified rather than inferred from unrelated later finals.
- Nearby turn differences are upper bounds on mixed turns, not causal accounting. All ranges deliberately omit downstream context replay and any event without a defensible adjacent delta.
- No workspace cleanup, branch movement, or raw-log escalation was needed for this review.
