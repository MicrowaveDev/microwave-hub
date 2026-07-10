# Context-Waste Pattern Clusters

## Scope and ranking method

This synthesis uses only `calibration-a.md`, `calibration-b.md`, and `review-01.md` through `review-07.md`. No raw logs or packets were read. Repeated reviews of the same session are de-duplicated, and distinct waves inside one reused physical session are not counted as distinct trees. Token figures are the notes' attributable adjacent-input bounds; they are not causal totals and are not summed where review windows overlap.

Rank combines: prevalence across distinct session/task trees, strength and size of attributable token evidence, latency or supervision consequences, and leverage of the smallest reusable fix. Confirmed and likely waste are included; detector-only frequency is not treated as proof.

## Ranked clusters

### 1. Bundled instructions were reloaded after `task:context`

**Prevalence:** at least 35 distinct sessions across queue workers/coordinators, implementation continuations, audits, and cross-repo debugging. **Evidence:** confirmed or likely in every review set; bounded examples range from about 0.3k to 4.6k input tokens per startup, with larger mixed windows in long continuations. **Impact:** recurrent context growth and startup latency; it also triggers package/README/script rediscovery and compounds on every continuation. **Cause:** `task:context` does not expose an enforceable success/completeness contract, and instructions are treated as reference material rather than a stop condition. **Fix leverage:** very high.

Smallest fix: have `task:context` emit machine-readable `instructionsLoaded`, `workflowLoaded`, and `truncated` fields; add a same-task guard/regression test that rejects full rereads unless truncation or a named omitted section is recorded.

### 2. Generated queue assignments lacked executable batch coordinates

**Prevalence:** at least 15 distinct image-description worker sessions. **Evidence:** repeated guessed `.id`/`batchId`/`agentId` lookups, text searches, and all-batch dumps before selecting canonical `label`; bounded likely costs are commonly 0.9k-13k, with highs to 14.8k per worker. Two sessions also wrote to the wrong repo root and repaired the result. **Impact:** large prompt expansion, extra tool rounds, path cleanup, and avoidable worker supervision; schema discovery can still end in incomplete visual review. **Cause:** prompts name a batch/result but omit a canonical selector, repo-absolute result path, and single-result validator. **Fix leverage:** very high because one generator change removes several symptoms.

Smallest fix: embed a tested command such as `print-image-description-batch --input ... --label ... --json`, an absolute output path, assigned count, and `validate-image-description-result --result ...`; assert the resolved write remains under `artist-helper`.

### 3. Exact workflow routes were treated as generic discovery prompts

**Prevalence:** at least five production image-description or Threads coordinator trees, plus smaller non-queue routing misses. **Evidence:** pre-route reads of portable instructions, `SUBMODULES.md`, README/package files, and `find:repos`; strongest bounded examples are 12k-16.5k input tokens (`019f2f37...`) and 5.5k-7.1k (`019f3e09...`). **Impact:** delayed time-to-first-correct-action, large search output, and higher supervision risk before production work even starts. **Cause:** exact phrase routes are advisory prose rather than executable dispatch constraints. **Fix leverage:** high.

Smallest fix: make exact queue phrases machine-checkable first-action routes to `npm run task:context -- artist-helper`, with an allowlist of subsequent workflow reads/calls and regression fixtures for the first tool call.

### 4. Broad discovery and status output substituted for bounded queries

**Prevalence:** at least nine distinct implementation, audit, status, and analysis trees. **Evidence:** truncated repo-wide searches, whole-file reads, all-batch/status JSON, and corpus-wide schema aggregation; attributable likely examples include 65k (`019f393a...`), 90k (`019e50c0...`), 12.5k (`019f32d7...`), 11k (`019f43cd...`), 9k (`019f2ef2...`), and 2.5k (`019f4dbb...`). **Impact:** largest recurring measured token cost outside session reuse, plus slow narrowing and difficult review. **Cause:** missing compact state/schema/status helpers and weak output caps; in one rollout-analysis tree, raw JSONL was read before the maintained analyzer. **Fix leverage:** high but split across domains.

Smallest fix: add bounded summary modes for queue plan state, production status, server audits, and ancestry schema; enforce analyzer-first for rollout work; cap broad searches by root, glob, match count, and output size.

### 5. Independent visual batches reused one long-lived worker context

**Prevalence:** directly confirmed in one physical session spanning at least six visible and apparently eleven batch assignments; similar reused-session packet gaps appear in three sibling worker sessions. **Evidence:** `019f3308-9f8c...` has a 41.7k low, 260.1k likely, and 288.8k high estimate from replay across request boundaries. **Impact:** the single largest attributable cluster, with latency and cost increasing wave by wave; incomplete per-task finals make supervision harder. **Cause:** orchestration optimizes worker reuse while carrying unrelated image context and authored results forward. **Fix leverage:** high for future queues despite lower observed tree prevalence.

Smallest fix: launch a fresh worker session per independent visual batch and pass only the exact batch object/selector; retain one completion and validation record per task index.

### 6. Queue recovery and waiting lacked stateful barriers/resume points

**Prevalence:** two strong coordinator trees, with related friction in validator interfaces. **Evidence:** repeated shrinking-target polling and 156 calls in `019f3307...` (likely 24k), and repeated validate/merge/sync/build cycles in `019f3e97...` (likely 5.8k; high 42.1k). Invalid generated date arguments and wave-only validation caused manual repair/source inspection in additional trees. **Impact:** wall-clock latency, repeated supervision, and fragile run-to-pass recovery. **Cause:** no compact wave barrier, incremental resume state, or canonical per-result validator. **Fix leverage:** high for production reliability.

Smallest fix: add `wait-wave`, artifact-based retry for setup-only workers, and `queue-weekly-resume:prod` driven by the prior problems/state artifact; fixture-test generated status commands and per-result validation.

### 7. Validation proved shape while missing request semantics or explicit constraints

**Prevalence:** at least three directly evidenced worker trees, plus interrupted/setup-only workers. **Evidence:** one result passed schema/count checks without any image inspection (`019f3e99...`); another ran the explicitly forbidden full validator and recovered (`019f31c0-83b3...`); setup-only children produced no artifact but lacked lifecycle/reassignment evidence. **Impact:** false completion signals, rework, and human QA burden; token evidence is modest or unmeasured, but supervision and correctness risk are high. **Cause:** validators check JSON shape and counts, not visual-inspection provenance, scope restrictions, or expected artifact lifecycle. **Fix leverage:** high.

Smallest fix: require per-item inspection evidence before `described`, refuse full-queue validation in worker mode, and have coordinators accept success only when the expected artifact exists and passes narrow validation.

### 8. Detector and packet boundaries create false-positive review work

**Prevalence:** systemic across both calibration sets and all long-lived/multi-wave examples. **Evidence:** session-wide repeat counts span days and many completions; normalization erases wave, batch, target-set, range, and phase; unique image reads and disjoint file windows are labeled as repeats; packets omit governing requests, local finals, prior matches, output attribution, and child termination state. **Impact:** analyst supervision and mis-prioritization; it can turn required queue progress into apparent waste and prevents confident request-coverage judgments. **Cause:** physical-session scoping and parameter-erasing normalization. **Fix leverage:** very high for future calibration, though it does not remove runtime waste itself.

Smallest fix: segment by active user task, preserve semantic identifiers and file-range overlap, link events to intervening writes/state changes, include current/prior result summaries and local finals, and validate packet size/completeness.

## Compact evidence table

| Rank | Reusable cause | Distinct session evidence (representative, de-duplicated) | Attributable token evidence | Latency / supervision | Proposed owner |
|---:|---|---|---|---|---|
| 1 | Post-`task:context` instruction reload | `019f393a-b348-7da2-9b68-c6d00d1a2d08`, `019f3307-38bf-7cc0-80a1-3292d3ac054a`, `019dfe3e-322b-7960-a2ce-a5dbc7e77705`, `019e50c0-0c62-7db3-9c82-694b7b07cad5`, `019f2d92-a705-7a10-90db-d9dbc5ea35b5`, `019f3172-63e0-7f22-924a-2547743ff60c`, plus 29+ worker/audit sessions | Usually ~0.3k-4.6k per startup; larger mixed continuation windows | Repeats on nearly every tree/continuation | Hub helper owner (`task:context`) + agent-viewer detector owner |
| 2 | Missing exact batch selector/path/validator | `019f31c0-0fe7-7791-ad40-74e6daab2064`, `019f32f7-ca85-7a01-b133-4795b54e7d1a`, `019f3eb5-d2e6-76e0-accd-76d0a89dc916`, `019f31c0-2d63-7523-97cf-545fe86f09ea`, `019f31c0-83b3-7dd0-b6b1-d3452deabc40`, `019f32eb-663e-7aa0-9428-4625e4162671`, `019f3e99-17d0-7b50-bf0c-39d43cf6f098` | Likely ~0.9k-13k per worker; high 14.8k | Multi-round schema probing; wrong-root repair; QA risk | `artist-helper` queue generator/validator owner |
| 3 | Direct-route miss | `019f2f59-ca41-76d2-ad0f-71505e345d9b`, `019f3964-a59a-7cd3-aa75-ae371881784f`, `019f3e09-4b06-7522-9808-b0670c6d410c`, `019f2f37-09f1-70d1-b86b-c83d602519c1`, `019f31a6-2d62-7790-b510-b06f7a5f7c68` | Up to likely 15k in one coordinator; 6.5k in another | Delays first correct action and production start | Hub routing/instruction owner |
| 4 | Unbounded discovery/status reads | `019e50c0-0c62-7db3-9c82-694b7b07cad5`, `019f393a-b348-7da2-9b68-c6d00d1a2d08`, `019f3309-be18-7611-8df8-5bb49f79360e`, `019f43cd-8326-79b1-9985-db1678d8ff59`, `019f2ef2-3db0-7710-88d6-a3087c97c37a`, `019f32d7-c98d-7681-a82d-9a0eaf882bda`, `019f4dbb-2d72-7602-8709-dffaf45323af` | Likely examples 2.5k-90k; overlapping, not additive | Slow narrowing; truncated output; analyst review burden | Relevant repo helper owners; agent-viewer for analyzer/schema probes |
| 5 | Reused visual-worker session | `019f3308-9f8c-7172-817a-4ca944e09d41`; corroborating lifecycle gaps in `019f3308-9ec3-7250-a1b2-a0125ad43241`, `019f3308-9f26-7f61-96ff-33db3cdc227e`, `019f3308-a078-7f50-a0a7-cb22060fe24b` | 41.7k low / 260.1k likely / 288.8k high in primary session | Grows every wave; obscures per-batch completion | Queue orchestration/runtime owner |
| 6 | No wave barrier or incremental resume | `019f3307-38bf-7cc0-80a1-3292d3ac054a`, `019f3e97-4ad0-7ab0-9c6c-5f6e62e6252f`; validator friction in `019f31bc-1ec9-7e51-a05b-1a8165fb23dc`, `019f31c0-83b3-7dd0-b6b1-d3452deabc40`, `019f32d7-c98d-7681-a82d-9a0eaf882bda` | Likely 24k and 5.8k in primary coordinators | High wall time and manual recovery | `artist-helper` production orchestration owner |
| 7 | Weak semantic/lifecycle validation | `019f3e99-17d0-7b50-bf0c-39d43cf6f098`, `019f31c0-83b3-7dd0-b6b1-d3452deabc40`, `019f3ed8-272d-7443-9065-d98314f53e56`, `019f4dc2-8b81-7622-8a54-92dfb307f8d6` | Modest/unattributed; redo cost excluded | False pass, incomplete child, extra human QA | `artist-helper` validator owner + subagent runtime owner |
| 8 | Task-blind detector/packet schema | `019ef16b-fd26-7ab0-af1a-25519d06d100`, `019dfe3e-322b-7960-a2ce-a5dbc7e77705`, `019e50c0-0c62-7db3-9c82-694b7b07cad5`, `019f393a-b348-7da2-9b68-c6d00d1a2d08`, `019f3ed8-272d-7443-9065-d98314f53e56`, `019f3307-38bf-7cc0-80a1-3292d3ac054a`, and multi-request `019f3308-*` sessions | Runtime tokens not claimed; review cost systemic | High analyst supervision and false prioritization | `agent-viewer` analyzer/packet collector owner |

## Priority handoff

Implement in this order: (1) `task:context` completion contract and reread guard; (2) generated exact batch selector, absolute path, and narrow validator; (3) fresh session per visual batch; (4) exact-route first-action tests; (5) wave barrier/incremental resume; (6) bounded summary helpers; (7) semantic validation and lifecycle fields; (8) task-aware detector/packet schema. The first three address the broadest recurrence and the largest attributable replay cost with localized changes.

Residual risk: the notes intentionally leave truncated requests, omitted finals, and ambiguous retry state unresolved. Counts above therefore use “at least,” and token ranges should not be combined into a global savings estimate.
