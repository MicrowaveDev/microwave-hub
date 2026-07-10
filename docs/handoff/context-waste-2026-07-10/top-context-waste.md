# Past-Week Context-Waste Findings

## Request Coverage

The frozen request was completed: all 278 physical sessions with activity in the rolling seven-day window were scanned, grouped into 21 explicit task trees, ranked through independent deterministic cohorts, and narrowed to 41 bounded packets. Two calibration reviewers, seven non-overlapping deep-dive reviewers, two synthesis reviewers, and two QA reviewers completed the adjudication. No reviewer needed a raw-log escalation.

The analysis identifies the strongest supported logs and reusable causes. It does not claim that all 2.217 billion measured input tokens were waste, and it does not sum overlapping nearby-turn ranges into a fictional global savings total.

## Ranked Logs

| Rank | Session | Supported finding | Verdict | Bounded avoidable input |
|---:|---|---|---|---:|
| 1 | `019f32d7-c98d-7681-a82d-9a0eaf882bda` | Production status requested unbounded JSON, then answered the real count question with a 147-byte targeted read | Confirmed | `0..12,554`; exact savings unknown |
| 2 | `019f393a-b348-7da2-9b68-c6d00d1a2d08` | Read 37,485 bytes from raw JSONL before running the maintained analyzer | Confirmed, narrow | `0..14,887`; upper bound only |
| 3 | `019f3e09-4b06-7522-9808-b0670c6d410c` | Exact Threads queue request went through portable docs, routing docs, and repo discovery before the required fast path | Confirmed | `0 / 5,500 / 7,055` |
| 4 | `019f43cd-8326-79b1-9985-db1678d8ff59` | Static-site debugging began with very broad searches and full-module reads before narrowing to named boundaries | Likely substantial | `0 / 6,000 / 12,879` |
| 5 | `019f31c0-0fe7-7791-ad40-74e6daab2064` | Worker prompt omitted the canonical batch selector, causing failed schema guesses, an all-batch dump, and an instruction reread | Likely mixed | `0 / 1,500 / 2,866` |
| 6 | `019f4dbb-2d72-7602-8709-dffaf45323af` | Corpus-wide scalar-path aggregation returned 56,941 bytes before targeted metadata queries answered the question | Confirmed, isolated | `0 / 2,000 / 2,462` |
| 7 | `019f2f37-09f1-70d1-b86b-c83d602519c1` | Exact production image-description request missed the direct route and explored hub docs/package metadata first | Confirmed | Not attributable from available turn boundaries |

Ranking combines verdict strength, attributable bounds, recurrence, and reusable-fix leverage. It is not a descending sort of speculative token totals.

## Important Non-Rankings

- `019f3308-9f8c-7172-817a-4ca944e09d41` proves that one worker handled multiple visual batches, but QA rejected the proposed 41.7k-288.8k savings range. Required image work shares those intervals, and fresh workers would reintroduce startup cost. Measure reused versus fresh workers before changing orchestration.
- `019e50c0-0c62-7db3-9c82-694b7b07cad5` contains likely broad-read and instruction-reread waste, but its long-lived session and missing task-linked finals make the proposed 45k-170k range unsupported.
- Unique required image inspections are necessary context. Large image bytes alone are not waste.
- Repeated queue waits, validations, and wave commands are necessary when target sets or workflow state change.

## Pattern Clusters

1. Generated queue assignments omit a canonical `label` selector, absolute result path, and narrow validator. This recurred across at least 15 worker sessions and also caused wrong-root writes in two workers.
2. Exact production routes are sometimes treated as generic discovery requests. At least five coordinator trees delayed the required first action.
3. Instruction files are often reread after `task:context`. This is likely recurring waste only when the helper confirms the same section was emitted completely.
4. Broad status/search/schema output is used before bounded queries. This produced the strongest individually supported token windows.
5. Queue waiting and recovery lack compact state barriers, but stateful resume should be added only after telemetry proves unchanged successful phases are rerun.
6. Validation can pass shape/count checks while missing request semantics, especially actual image-inspection provenance.

## Helper Findings

Missed existing helpers:

- `agent:analyze-log --workflow-waste` was used only after a raw-log preview in one confirmed finding.
- Exact image-description and Threads routes did not consistently start with `task:context -- artist-helper`.

Missing or incomplete helpers:

- bounded production status fields/summary output
- generated `--label` batch selector and narrow result validator
- resolved-path guard for worker results
- compact wave barrier and artifact-based retry status
- task-aware packet linkage between request, events, validation, final, and child lifecycle

## Validation And Handoff

Most reviewed queue coordinators eventually completed validation, merge, import, or an explicitly partial QA handoff. The repeated operations themselves were not treated as waste when state changed.

Two controls exposed coverage failures that token ranking alone would miss: a setup-only child stopped after the required context call, and an image-description worker passed schema/count checks without any captured image inspection. Completion gates must validate expected artifacts and inspection provenance independently from context-waste scoring.

## Smallest Reusable Fixes

Ship now:

- add first-action regression tests for exact production queue phrases
- include canonical batch selector, absolute result path, and narrow validator in generated worker prompts
- add bounded field selection and output caps to existing status/analyzer queries
- link packet events and finals to active requests and child lifecycle outcomes
- preserve semantic parameters and changed state in repeat detection

Pilot with telemetry:

- suppress post-`task:context` rereads only when helper output declares the section complete and untruncated
- compare reused versus fresh/reset workers on equivalent visual batches
- add incremental resume only after measuring no-op reruns of successful phases

## Residual Risks

- Nearby input deltas mix useful work, cached context, tool results, and reasoning; every range is an upper-bound estimate.
- Long-lived sessions still contain omitted intermediate finals, so session-wide request coverage is sometimes indeterminate.
- The fork-history cutoff is schema-informed but heuristic.
- The deterministic controls found one coverage-critical false negative and one positive finding mislabeled as low-signal; future cohort selection should include coverage-risk controls separately from waste-negative controls.

## Workspace State

Source logs were not modified. Scanner implementation is committed in `agent-viewer` at `754c9df75f639f079b29592e7a99fb1763f0515f`. Unrelated dirty submodules and untracked hub directories were left untouched.
