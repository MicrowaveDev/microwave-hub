# Independent QA: Proposed Top Five

## Source Request

- **Original request:** independently QA the five named packet findings for citation accuracy, token arithmetic, request coverage, task-tree grouping, verdict strength, and reusable fixes; compare review notes and the counterexample audit, but adjudicate from packets.
- **Scope:** packet IDs `019f3308-9f8c-7172-817a-4ca944e09d41`, `019e50c0-0c62-7db3-9c82-694b7b07cad5`, `019f393a-b348-7da2-9b68-c6d00d1a2d08`, `019f2f37-09f1-70d1-b86b-c83d602519c1`, and `019f32d7-c98d-7681-a82d-9a0eaf882bda`.
- **Evidence boundary:** packets only. Review notes and `counterexample-audit.md` were comparison inputs, not evidence. No raw logs or source-window escalation was used.

## Executive Adjudication

| Packet | Proposed finding | QA verdict | Strength after QA |
|---|---|---|---|
| `019f3308...` | Reused worker sessions carry costly prior image context | Downgrade | Plausible hypothesis; token savings unsupported |
| `019e50c0...` | Repeated broad reads/rereads caused high context waste | Downgrade | Likely local waste; scale and coverage not packet-provable |
| `019f393a...` | Analyzer-first violation and broad exploration | Confirm narrowly | Raw `head` before analyzer is confirmed; broader bundle is mixed |
| `019f2f37...` | Exact production route was missed | Confirm, remove token total | Routing miss is direct; `12k-16.5k` attribution is invalid |
| `019f32d7...` | Unbounded status JSON caused avoidable context | Confirm | Strongest packet-bounded runtime finding |

## Request Coverage

- `019f2f37...` and `019f32d7...` each contain one request and a same-task final. Their packets support **handled correctly with documented recovery/residual state**.
- `019f3308...` contains requests only for tasks 1-6 but finals only for task 11. Coverage is **insufficient evidence**, not handled correctly or incorrectly. The task-11 final proves only that one later batch passed narrow validation.
- `019e50c0...` samples 11 requests through task 14 but its final is task 129. It cannot support session-wide coverage claims. At most, the sampled requests and final show a long-lived implementation workflow with an apparently successful later handoff.
- `019f393a...` samples tasks 1, 5, 6, and 7 but its final is task 20. The visible task-7 analyzer use is assessable; session-wide product and delivery coverage is not.

## Packet Adjudications

### 1. `019f3308...`: worker reuse

- **Citations:** packet lines 141, 220, 289, 356, and 403 do prove that new batch requests were appended to one physical worker session. Lines 41-61 and later `view_image` events are required work, not waste. Lines 23-35 separately prove failed schema guessing, a broad 14,537-byte batch sample, and eventual `label` selection.
- **Token arithmetic:** review 05's low `41,700` sums growth across request boundaries, but those intervals include the next batch's required image inspection and authoring. Its likely `260,096` and high `288,797` figures subtract one initial cached/total baseline from later first-turn values; that is replay/excess, not causal avoidable cost. None is a defensible savings estimate.
- **Grouping:** the packet session is correctly grouped by explicit ancestry in `tree-0012`. The tree has six session IDs and ten corroborating spawn events; ten must not be described as ten workers. Tree totals must not be charged to this one worker finding.
- **Verdict:** **downgrade from confirmed to plausible, unquantified hypothesis**. The packet proves reuse, not that fresh sessions would have lower end-to-end cost after startup, instructions, schema discovery, and handoff.
- **Reusable fix:** first add per-task marginal billed-input/latency telemetry and compare equivalent reused versus fresh/reset workers. Independently ship the stronger local fix: put the canonical `label` selector and resolved result path in generated assignments, with a schema-contract test.
- **Residual risk:** a fresh-session mandate may merely exchange visual replay for repeated startup and discovery.

### 2. `019e50c0...`: broad reads and instruction rereads

- **Citations:** lines 9791-9813 show `task:context`, immediate `AGENTS.md` reread, then several large implementation reads. Lines 10792 and 10842 read the same roughly 25 KB script in adjacent but distinct user tasks. Line 9705 and lines 10273/10349/10611 are broad outputs, but their active requests differ and packet excerpts do not prove their contents were unused.
- **Token arithmetic:** the cited deltas are arithmetically correct: `124,056-106,773=17,283`, `232,988-206,951=26,037`, and `211,076-132,096=78,980`. They are not additive causal savings. Each interval includes productive implementation, reasoning, user-task changes, and other tool results. The proposed `45k/90k/170k` range is therefore unsupported.
- **Grouping:** explicit ancestry supports `tree-0002`, with three session IDs and four spawn events. The packet itself is an unusually long physical session; tree metrics include descendants and cannot establish this session's avoidable share.
- **Coverage/verdict:** because requests between task 14 and final task 129 are omitted, session-wide coverage and a **confirmed high** verdict are too strong. Retain **likely local context waste, magnitude unknown**, especially for an immediate reread only if `task:context` fully emitted the same instructions.
- **Reusable fix:** make `task:context` emit machine-readable completeness/truncation metadata and suppress only same-task rereads of fully emitted sections. Add output caps/summary modes to existing search and diff workflows before inventing specialized helpers.
- **Residual risk:** task changes and changed files can make later rereads necessary.

### 3. `019f393a...`: analyzer-first violation

- **Citations:** line 717 runs `head -n 5` on the raw JSONL and emits 37,485 bytes; line 725 then runs the maintained analyzer. This directly reverses the required analyzer-first order. Lines 17-18 reread 23,550 bytes after `task:context`; lines 25 and 122 are broad truncated searches, but the initial planning request plausibly required broad implementation/content discovery.
- **Token arithmetic:** input rises from 22,504 at line 649 to 37,391 at line 721, exactly `14,887`, immediately after the raw read. This is a valid upper bound on that turn's added input, not a guaranteed reusable savings amount. The broader `35k/65k/100k` estimate mixes necessary plan research and productive analyzer work and is not supported.
- **Grouping:** `tree-0013` is correctly a standalone root session. No child/tree aggregation issue applies.
- **Coverage/verdict:** task 7's requested rollout analysis is visibly routed to the analyzer, but only after the raw read. Because later requests through task 20 are omitted, limit the verdict to **confirmed narrow workflow waste**; do not label the whole session confirmed high waste.
- **Reusable fix:** enforce analyzer-first in the log-analysis entry point and add a bounded preview option to the analyzer for cases where orientation is needed. This removes the raw pre-read rather than relocating it.
- **Residual risk:** the analyzer may omit evidence needed for a later bounded escalation; that escalation should remain permitted and cited.

### 4. `019f2f37...`: missed exact queue route

- **Citations:** the exact production image-description request appears at line 6. Lines 11-13 read portable instructions/package metadata and run `find:repos`, producing 38,427 bytes, before `task:context -- artist-helper` at line 23. This is a direct violation of the hub fast path. Line 29's local `AGENTS.md` read is allowed when queue instructions are not already in context, so it is not independently proven waste.
- **Token arithmetic:** review 07's `16,509` calculation (`34,929-18,420`) is correct arithmetic but wrong attribution. The first usage sample at line 19 is already after lines 11-13; the measured interval instead spans line 23 `task:context` and subsequent activity. No packet sample bounds the pre-route cluster, so the `12k/15k/16.5k` range must be removed.
- **Grouping:** explicit ancestry supports `tree-0006`: 25 session IDs and 48 corroborating spawn events. The final reports 23 main batches plus a later review batch; event count and session count are different measures and do not show duplicate agents.
- **Coverage/verdict:** one request and same-task final support handled correctly with recovery. The initial routing waste is **confirmed**, while queue waves, waits, validation, import, and residual-row diagnosis are necessary on packet evidence.
- **Reusable fix:** keep the existing exact-phrase fast path and add a first-action regression test that rejects portable-doc/package/routing probes before `task:context -- artist-helper`. This is reusable for the named production commands without overgeneralizing novel requests.
- **Residual risk:** prompt variants outside the exact route may still need normal routing.

### 5. `019f32d7...`: unbounded production status JSON

- **Citations:** line 641 requests `--json=1`, producing an original 224,137-token result and a truncated 40,220-byte packet event. Line 647 then obtains the needed source counts from the saved remaining-row log in 147 bytes. Lines 590 and 635 are distinct source ranges and are not duplicate reads. The line-17 instruction reread remains only likely waste because `task:context` completeness is not recorded.
- **Token arithmetic:** the post-dump input rise is `114,020-101,466=12,554`, matching the review's cap apart from its rounded `12,500` likely value. Adding the separate `856` startup delta yields `13,410`, but those incidents should not be fused into one causal estimate. A defensible statement is: **the JSON turn added at most 12,554 input tokens; exact avoidable savings are lower and unknown**.
- **Grouping:** explicit ancestry supports `tree-0011`, with 40 session IDs and 78 corroborating spawn events. The counts are consistent with multi-wave dispatch evidence and do not establish duplicate work.
- **Coverage/verdict:** the single request is covered by the final: queue preparation, waves, validation, merge, import, and status were completed, and the invalid generated range command was corrected. The unbounded JSON request is **confirmed context waste**.
- **Reusable fix:** add bounded `--summary`/field-selection and output-cap behavior to the existing status command, and test date-range command generation. Prefer these changes over a new parallel status helper.
- **Residual risk:** deployed/local script-version drift can still force fallback diagnostics; summary behavior must exist in the deployed wrapper too.

## Ranked Result

1. **Keep:** bounded status output and valid date-range status generation (`019f32d7...`).
2. **Keep:** exact production-route first-action guard (`019f2f37...`), with no token claim.
3. **Keep narrowly:** analyzer-first enforcement (`019f393a...`), bounded to the raw pre-read incident.
4. **Qualify:** canonical batch selector is stronger than the fresh-worker claim (`019f3308...`); measure reuse before changing orchestration.
5. **Qualify:** context-completeness metadata and output caps (`019e50c0...`); reject the high token range and session-wide verdict.

## Cross-Cutting Risks

- Do not sum any ranges across these findings: usage windows include productive work and some findings overlap startup or adjacent turns.
- `input_tokens`, `cached_input_tokens`, output bytes, and original truncated-output tokens are different measures.
- Tree spawn-event counts are corroboration counts, not unique sessions, workers, batches, or wasted calls.
- Packet improvements reduce false-positive review cost; they should not be counted as runtime token savings.

## Workspace State

- Only this QA note was authored. No raw logs, source files, packet JSON, other notes, Git state, or submodule state were modified.
