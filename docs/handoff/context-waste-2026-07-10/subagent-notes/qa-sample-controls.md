# Independent QA: Four-Finding Sample and Deterministic Controls

## Source Request

- Independently QA the four finding packets and five deterministic low-signal controls listed by ID.
- Check false negatives, citations, token arithmetic, request coverage, verdict strength, and control behavior.
- Compare the existing review notes and `counterexample-audit.md`, but adjudicate from packet JSON only; use no raw logs.
- Write only this file.

## Method and Limits

- The first four supplied IDs are treated as the finding sample; the final five as controls.
- Packet `events`, `userRequests`, `finalAssistantMessages`, and `turnUsage` are the evidence base. Detector signals are candidates, not findings.
- Event citations below use the packet's captured rollout line numbers.
- An adjacent `turnUsage.input_tokens` increase is only an upper bound on context introduced between turns. It is not exact causal savings, and bounds spanning necessary work use a zero low end.
- No raw-log escalation was needed. Truncated request/final text and omitted lifecycle data remain packet limitations.

## Executive Verdict

- **Finding sample:** 4/4 contain packet-supported waste, but only the exact Threads routing detour is strong enough for an unqualified confirmed verdict. The other three should remain mixed or likely because necessary work shares the cited windows.
- **Controls:** 3/5 behave as genuine low-signal controls, 1/5 (`019f3e99...`) is a deliberate-looking false-negative/control-break case, and 1/5 (`019f4dbb...`) is not low-signal at all: it contains a confirmed 56,941-byte overbroad corpus query.
- **Review-note agreement:** coverage calls are generally good. The main corrections are token-range overprecision, overstrong certainty for `019f4dbb...`, and failure to describe `019f3e99...` explicitly as a detector false negative.
- **Counterexample-audit agreement:** its cautions are upheld: unique image reads are necessary, cumulative input growth is not causal accounting, broad reads need case-by-case adjudication, and packet/lifecycle defects must not be mistaken for runtime waste.

## Finding Sample

### `019f31c0-0fe7-7791-ad40-74e6daab2064`

- **Request coverage:** handled correctly on packet evidence. Five distinct assigned images were inspected at lines 43, 49, 54, 59, and 64; the final at line 151 reports five descriptions and a passing targeted check. The missing sibling result is correctly reported as a full-queue validator blocker, not hidden as success.
- **Supported waste:** likely/mixed. The immediate `AGENTS.md` reread at line 17, failed `.id` selector at line 25, all-batch metadata dump at line 31, and unrelated full portable-instructions reread at line 124 are avoidable. The five image payloads, targeted validation, and ignored/generated-path checks at lines 133-144 are necessary.
- **Citation QA:** review-01's event citations are accurate. Calling line 119 a validator/tool failure is imprecise: the packet captures a failed full validator caused by a missing sibling; the unsupported `jq --argfile` command is line 125 and is not marked as a packet failure event.
- **Token arithmetic:** review-01's component caps compute correctly: `19,041-18,383=658`, `20,511-19,041=1,470`, `20,744-20,511=233`, and `42,741-42,236=505`, totaling `2,866`. However, these intervals include reasoning and mixed work, while the line-124 reread and line-125 failed check share one turn. Keep **0 / likely 1,500 / high 2,866**, never sum it with downstream replay or image costs.
- **Verdict strength:** review-01's **likely waste** is calibrated. Do not promote the whole packet to confirmed waste merely because individual unnecessary actions are visible.
- **Reusable fix:** generated prompts should include the canonical `label` selector and resolved result path; `task:context` should state whether local instructions were fully emitted, and ordinary command incompatibility should not trigger a full portable-instructions reread.

### `019f3309-be18-7611-8df8-5bb49f79360e`

- **Request coverage:** handled correctly as far as the captured final permits. The final is truncated but visibly supplies the read-only status, core SHA/blocker, backend inventory/classification, and exact paths. Packet evidence does not support checking every omitted extraction candidate, so that detail remains packet-limited rather than proven.
- **Supported waste and false negatives:** likely substantial context waste, broader than review-01's token estimate. Line 17 rereads `AGENTS.md` and returns 40,214 bytes; lines 18-19 load large planning/contract material; lines 42-45 issue four broad searches, each capped around 40 KB and later followed by narrower implementation reads. The broad searches are not automatically waste, but four truncated inventory outputs before targeted reads are strong evidence of poor scoping. The review appropriately avoided charging repeated non-overlapping `sed` windows.
- **Citation QA:** review-01 accurately cites lines 17-19, 42-45, 55-82. Its statement that the runtime contract was read despite “as needed” is not itself proof of waste; the requested classification plausibly needed that contract.
- **Token arithmetic:** `19,103-18,401=702` is arithmetically correct but is not a defensible high bound for all duplicate startup loading: it spans three outputs totaling over 100 KB and reflects cache/accounting effects. Conversely, the later `87,689-45,844=41,845` interval around broad searches contains necessary inventory work and cannot be called avoidable. Correct report: **no reliable packet-isolated token estimate**; at most retain `0-702` for the immediate post-context cluster, with no aggregate for searches.
- **Verdict strength:** strengthen review-01's narrative from “duplicate startup only” to **likely mixed waste**, but keep it below confirmed because the audit explicitly requested a broad inventory.
- **Reusable fix:** provide a bounded backend-audit inventory command or documented query that emits exports/imports, test references, and selected S1/S2 contract excerpts, then narrow by named module.

### `019f3e09-4b06-7522-9808-b0670c6d410c`

- **Request coverage:** handled correctly. The final at line 574 gives the review URL and requested QA counts, and it accurately labels the result partial. This is a valid partial QA handoff, not a false completion signal.
- **Supported waste:** confirmed startup routing waste. The exact request had a hub fast path, yet lines 11-13 read portable instructions, read `SUBMODULES.md`, and run `find:repos` before `task:context -- artist-helper` at line 21. Lines 27-28 then reread local instructions and README despite the exact route's exclusions.
- **Control against false positives:** repeated wrapper calls, SCP refreshes, wave printing, validation, spawning, and polls are not proven waste. The packet shows failures and changing queue state; polling lines 59-95 and 283-309 is necessary waiting. Review-04 correctly resists the repeated-command detector here.
- **Citation QA:** review-04's startup citations are exact and its treatment of later repeats is appropriately conservative.
- **Token arithmetic:** the cited `25,717-18,662=7,055` high bound is correct. Because the interval includes the required `task:context`, status, and potentially useful local instructions, **5,500 / 6,500 / 7,055** is too confident at the low end. Correct to **0 / likely 5,500 / high 7,055**. Startup waste is confirmed even though exact savings are not.
- **Verdict strength:** confirmed for routing; insufficient evidence for a separate repeated-wrapper finding. This matches the counterexample audit's exact-route and state-aware repetition conclusions.
- **Reusable fix:** enforce the exact prompt's first action as `npm run task:context -- artist-helper` and reject pre-wrapper reads of portable instructions, routing docs, README/package metadata, or `find:repos`.

### `019f43cd-8326-79b1-9985-db1678d8ff59`

- **Request coverage:** indeterminate for the original stale-hash request. The packet contains evolving requests and finals only for later noindex verification (tasks 8-9), not a completion tied to task 1. The later live-header/image verification is handled correctly. Review-04's mixed coverage call is right.
- **Supported waste:** substantial likely waste. Three successful `task:context` calls are followed by portable/local instruction rereads at lines 29-32. A repo-wide keyword search at line 43 reports 56,789 original tokens and is followed by targeted module reads. Lines 64-66 read all 820 lines of `staticSiteGenerator/index.ts`; line 216 later emits 20,624 bytes for another broad keyword search. Distinct targeted windows and the frontend build are necessary.
- **Citation QA:** review-04's citations are accurate. The failed environment-specific test at line 185 is not proven avoidable because the packet does not establish a helper that would pass. The empty line-217 repeat may be a cwd/task-context artifact; do not charge it separately without output equivalence.
- **Token arithmetic:** `106,948-94,069=12,879` is correct for lines 189-222, but that interval also includes the user's new Locked request, investigation, and `curl`. Therefore **9,000 / 11,000 / 12,879** overstates the low and likely bounds. Use **0 / likely 6,000 / high 12,879** for that cluster, and do not add earlier broad reads because their deltas overlap implementation work.
- **Verdict strength:** **likely substantial waste**, not globally confirmed. Request evolution and missing task-linked finals prevent a stronger end-to-end verdict.
- **Reusable fix:** add task/final linkage to packets; for known static-site symptoms, search named API/module boundaries and recent diffs first, cap broad searches, and use manifest/local validation commands before custom test invocations.

## Deterministic Controls

### `019f3ed8-272d-7443-9065-d98314f53e56` — control passes

- **Coverage:** not handled; the worker stops after the correct `task:context` action and a scope update.
- **Waste verdict:** no packet-proven waste. The only tool call is required by the exact queue route. The `953` output bytes and single measured turn cannot support avoidable-token arithmetic.
- **Behavior:** good low-signal control. A detector should return no waste finding while a separate coverage/lifecycle gate reports incomplete execution.
- **Notes comparison:** review-02 and both calibrations are correct; causal explanation must remain unknown.

### `019f4dc2-8b81-7622-8a54-92dfb307f8d6` — control passes with one narrow signal

- **Coverage:** not handled; no owned test file, test run, or final report is captured.
- **Waste verdict:** one likely low-severity discovery issue. Line 16 searches parent instruction trees after `task:context` and mixes unrelated status/file reads; line 22 is targeted preparation.
- **Token arithmetic:** `19,444-19,051=393` is a valid upper bound only. Keep **0 / likely 300 / high 393**.
- **Behavior:** acceptable near-low-signal control if the expected deterministic output allows one bounded finding. It must also trigger incomplete-lifecycle coverage, not a runtime success verdict.
- **Notes comparison:** review-06 is calibrated. The 15,555-byte compound output alone does not justify stronger severity.

### `019f1fd4-7f09-7512-8ee6-7a4839fa19aa` — control passes; packet defect detected

- **Coverage:** indeterminate. `userRequests` is empty, while the only final says to ignore a rollout message. The older `session.sourceRequest` cannot govern that final reliably.
- **Waste verdict:** insufficient evidence; no tool events or detector signals exist.
- **Token arithmetic:** none. The decrease `235,257 -> 231,836` is a reset/compaction effect, not negative savings.
- **Behavior:** good packet-integrity control. The correct output is a lifecycle/request-linkage defect, not a context-waste finding and not “handled correctly.”
- **Notes comparison:** review-04 is correct.

### `019f3e99-17d0-7b50-bf0c-39d43cf6f098` — control breaks as an intentional false-negative case

- **Coverage:** handled incorrectly. The request requires inspecting `localPath`; the complete 11-call packet has no `view_image` or equivalent media-inspection event. Lines 60, 67, and 73 show write, schema validation, and status only. A factual visual description cannot be proven from caption context.
- **False negative:** the packet has real workflow waste at lines 17, 23, and 29 (instruction reread, failed guessed selector, all-batch metadata dump), but only the instruction reread is detector-signaled. More importantly, ordinary waste ranking could call this low-signal while missing the higher-risk coverage failure. This control should assert that request-coverage validation outranks a clean schema/count result.
- **Token arithmetic:** `19,419-18,765=654` and `23,245-22,669=576`, totaling a `1,230` upper bound. Because the latter interval also contains the failed selector and metadata processing, retain **0 / likely 1,100 / high 1,230** and do not include the cost of redoing the unsupported description.
- **Behavior:** this is not a negative control for end-to-end quality. It is a deterministic false-negative regression fixture: expected outputs should include missing inspection provenance plus likely startup/schema waste.
- **Notes comparison:** review-06's evidence and coverage call are correct; its plain “likely waste” verdict should explicitly say **coverage-critical false negative**. The counterexample audit correctly warns against an agent-authored inspection boolean; provenance should come from actual tool-event/path linkage.

### `019f4dbb-2d72-7602-8709-dffaf45323af` — control fails low-signal classification

- **Coverage:** handled correctly. The final supplies exact ancestry fields, distinguishes optional `session_id` from `id`, treats spawn evidence as corroborating, gives caveats, and exposes no private message contents.
- **Waste verdict:** confirmed isolated broad-query waste. The corpus-wide scalar-path aggregation starts at line 22, waits at lines 26 and 48, and returns 56,941 bytes at line 48. Later targeted `session_meta` and spawn-call queries establish the requested facts more directly.
- **Citation QA:** review-05 incorrectly calls line 48 the first avoidable decision; line 48 is the delayed result. The decision/tool invocation is line 22. This distinction matters for time-to-first-correct-action.
- **Token arithmetic:** `25,637-23,175=2,462` is arithmetically correct, but it spans the long-running broad query, an intervening sample-shape command at line 30, and model processing. **2,462 / 2,462 / 2,462** falsely presents causal precision. Correct to **0 / likely 2,000 / high 2,462**.
- **Verdict strength:** confirmed that the query was overbroad; likely, not exact, token impact. A specialized helper is not yet justified by one incident; first add bounded field selection/output caps to the existing query pattern.
- **Behavior:** this packet is a positive finding mislabeled as a low-signal control. If the control is intended to test suppression, its expected result must still preserve this broad-query finding while suppressing necessary rules reads, bounded sampling, waits, and targeted referential checks.

## Compact Timeline and Cluster QA

1. **Correct fast paths:** controls `019f3ed8...` and `019f4dc2...` begin with required `task:context`; the Threads finding does not.
2. **First correct substantive action:** image worker `019f31c0...` reaches image inspection only after selector/schema detours; `019f3e99...` never reaches it. The server audit and static-site tasks eventually narrow after large searches.
3. **Validation/handoff:** schema validation is sufficient for JSON shape but not visual provenance. Partial QA is valid when explicitly labeled. Interrupted workers need lifecycle status rather than inferred causes.
4. **Reusable waste clusters:** exact-route detours, canonical queue-selector absence, immediate post-context rereads, and broad query/search output. Unique image inspections, changed-state orchestration, targeted non-overlapping windows, and active-session polling are counterexamples, not waste.

## Smallest Reusable Fixes

- **Packet/validator:** attach every event and final to the active request/task and child lifecycle outcome; fail packet integrity when a final has no governing request.
- **Coverage gate:** for image-description work, link actual media-inspection tool events to assigned paths before accepting `agentStatus: described`; do not trust a self-reported boolean.
- **Routing test:** enforce first action for exact production queue phrases.
- **Generator test:** emit and test a canonical `label` selector plus absolute/resolved result path.
- **Detector:** key repetition by task, semantic instance, target/state, and phase; suppress unique required media reads and changing-state polls.
- **Token reporting:** require zero as the low bound whenever a turn interval mixes necessary and avoidable work; prohibit exact low=likely=high claims from cumulative input deltas alone.
- **Search hygiene:** prefer bounded field selection and output caps before adding specialized one-use helpers.

## Residual Risks

- Truncated source requests and finals prevent field-by-field coverage proof in some packets.
- Packet events do not preserve full tool output, so overlap between broad and narrow reads cannot always be demonstrated.
- No aggregate avoidable-token total is defensible across these packets; ranges overlap and use cumulative context accounting.
- Long-lived/evolving sessions remain hard to adjudicate until task-local finals and lifecycle outcomes are mandatory packet fields.

## Workspace State

- QA used only the nine packet JSON files, existing review notes, `counterexample-audit.md`, and `AGENT_LOG_ANALYSIS_RULES.md`.
- No raw logs were read. Only `subagent-notes/qa-sample-controls.md` was written.
