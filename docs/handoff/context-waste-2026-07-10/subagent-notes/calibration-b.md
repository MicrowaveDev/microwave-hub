# Calibration Review B

## Scope And Method

- Reviewed exactly the six assigned evidence packets under `packets/` and the packet rubric in `docs/agent-playbook/past-week-log-context-waste-analysis-plan.md`.
- Applied `AGENT_LOG_ANALYSIS_RULES.md`. Detector signals were treated as review candidates, not proof of waste.
- No raw-log windows were opened. All conclusions below are bounded by packet evidence.
- Avoidable-token ranges are omitted unless a packet exposes an attributable adjacent turn delta. Counts of calls, signals, failures, bytes, and cumulative session tokens are not converted into token estimates.

## Packet Reviews

### `019ef16b-fd26-7ab0-af1a-25519d06d100`

- **Request coverage:** Insufficient packet evidence. The frozen request is only `continue implementing the plan`; the packet does not identify the plan, the active user turn at lines 16800-16807, requested completion state, or final validation/handoff for that turn.
- **Verdict:** Insufficient evidence.
- **Evidence and first potentially avoidable decision:** The packet cites `npm run task:context -- mushroom-master` at line 16800, two targeted `rg` calls at lines 16806-16807, and session-wide quantities of 83 repeats for the context command and 302 reads for one plan path. These commands are plausibly the first correct routing and implementation-discovery actions for a new task. The packet does not show a prior equivalent call in the same user turn, so no avoidable decision is established.
- **Detector assessment:** Likely false positives. Repetition is counted across a 16-day, 6,714-turn, 96-completion session, while the evidence shows only one occurrence from one late turn. Reading the same active plan across many implementation turns is not inherently redundant. The two distinct targeted searches are complementary, not repeated calls.
- **Avoidable-token range:** Not estimated. Turn usages at lines 16802 and 16814 exist, but the packet does not isolate duplicate output or establish that either operation was unnecessary.
- **Root cause if confirmed:** Detector scoping, not demonstrated agent waste.
- **Smallest reusable fix:** Scope repeat detection to a user-turn/task segment and include the nearest prior matching calls plus their result summaries. Exclude expected startup helpers from cross-task repeat counts.
- **Confidence:** High that the packet cannot support a waste verdict; low on underlying session necessity.
- **Raw-window escalation:** None.

### `019dfe3e-322b-7960-a2ce-a5dbc7e77705`

- **Request coverage:** Insufficient packet evidence. The frozen request asks how many PRs remain for ActivityPub, but cited events occur nearly two months after session start. The packet omits the active user prompt and answer around lines 93841-93849, so it cannot show whether a count was produced or verified.
- **Verdict:** Insufficient evidence.
- **Evidence and first potentially avoidable decision:** A single targeted `rg` over `docs/todo.md` and `docs/activitypub-research.md` and one `git status --short --branch` occur at lines 93841-93842. Both can be necessary to answer current roadmap status safely. No same-turn duplicate is supplied.
- **Detector assessment:** Likely false positives. Quantities 92, 7, and 278 are whole-session repetition counts over 4,054 turns and 106 completions, not evidence that this occurrence was redundant. A roadmap file is expected to be revisited as work changes.
- **Avoidable-token range:** Not estimated. The line-93845 turn cost cannot be assigned to avoidable work without the missing prior matches, outputs, and active request.
- **Root cause if confirmed:** Detector task-boundary failure.
- **Smallest reusable fix:** Add user-turn segmentation, prior-match citations, command outputs summarized by bytes/tokens, and the answer/completion associated with the cited turn.
- **Confidence:** High that the signals are not adjudicable from this packet.
- **Raw-window escalation:** None.

### `019e50c0-0c62-7db3-9c82-694b7b07cad5`

- **Request coverage:** Insufficient packet evidence. The frozen request asks for analysis and an authored Markdown plan, but events at lines 8905-8907 are from a later July task in a session started in May. No target plan path, write, validation, or final handoff is included.
- **Verdict:** Insufficient evidence.
- **Evidence and first potentially avoidable decision:** `npm run task:context -- artist-helper`, `git status --short`, and a shallow listing of `docs/*.md` are a coherent startup sequence. The packet does not establish a redundant call within that task.
- **Detector assessment:** Likely false positives. Counts of 30 task-context calls and 128 status calls span 1,847 turns and 110 completions. Reusing these safety/routing commands across separate tasks is expected. The unflagged `find` is bounded and may be necessary to locate the requested plan or related documentation.
- **Avoidable-token range:** Not estimated. Adjacent turn usage exists, but necessity and per-command contribution are absent.
- **Root cause if confirmed:** Routing/task segmentation in the detector.
- **Smallest reusable fix:** Freeze the active user request for each detected event, reset repetition groups at task boundaries, and include authored-file and final-handoff state.
- **Confidence:** High on packet insufficiency.
- **Raw-window escalation:** None.

### `019f393a-b348-7da2-9b68-c6d00d1a2d08`

- **Request coverage:** Insufficient packet evidence. The initial request clearly asks for an implementation/postmortem analysis and a plan, but the packet provides only startup events and no plan artifact, conclusions, validation, or final response. Later turns extend through July 10, so the 20 completions likely cover multiple tasks that are not separated.
- **Verdict:** Likely waste for duplicate instruction loading; otherwise insufficient evidence.
- **Evidence and first avoidable decision:** After the required `npm run task:context -- artist-helper` at line 11, the agent manually read `portable-agent-instructions.md` at line 17 and apparently `AGENTS.md` at line 18. The hub contract says `task:context` bundles repo-local instructions and says not to reread instructions already in startup context. The first avoidable decision is the manual instruction reread at line 17.
- **Detector assessment:** Mixed. The session-wide count of 12 task-context calls is a likely cross-task false positive. The repeated `AGENTS.md` read is directionally valid, but the packet omits the actual line-18 tool event and output, leaving only a normalized signal. The normalized `sed -n '<n>,260p' AGENTS.md` detail also loses the concrete range needed to compare reads.
- **Avoidable-token range:** Not estimated. Although the adjacent input total rises from 18,757 at line 13 to 19,330 at line 21, the packet does not expose separate output-token contributions for the two reads; assigning the 573-token delta to one or both would be speculative, and downstream replay savings cannot be bounded from the packet.
- **Root cause:** Missed instruction plus packet-field omission.
- **Smallest reusable fix:** Make `task:context` output end with a terse `instructions loaded; do not reread` marker and detect immediate rereads within the same task. Packets should include every tool event behind a cited signal and per-tool output size/token estimate.
- **Confidence:** Medium on likely waste; high on missing evidence.
- **Raw-window escalation:** None.

### `019f3ed8-272d-7443-9065-d98314f53e56`

- **Request coverage:** Not handled in this physical session. The request requires processing one generated image-description batch and writing its result JSON. The packet records one context command, one model turn, zero completions, and no write or validation. It may represent an interrupted/abandoned child whose work was reassigned, but the packet does not say.
- **Verdict:** Necessary cost at the physical-session level, with task-tree necessity insufficiently evidenced.
- **Evidence and first avoidable decision:** The only tool call is `npm run task:context -- artist-helper` at line 11. The hub fast-start rule explicitly requires that command for the image-description queue, so it is the correct first action and not waste.
- **Detector assessment:** Correctly emitted no waste signal. The tree summary's 72 spawn events and 35 sessions must not be attributed to this one-turn child.
- **Avoidable-token range:** Not applicable; no avoidable operation is established and context replay is zero.
- **Root cause of non-completion:** Unknown interruption or orchestration state, not demonstrated agent behavior.
- **Smallest reusable fix:** Add child lifecycle fields: termination reason, cancellation/reassignment target, whether its output was used, and whether another child completed the same batch.
- **Confidence:** High that the sole call was necessary; low on why the child stopped.
- **Raw-window escalation:** None.

### `019f3307-38bf-7cc0-80a1-3292d3ac054a`

- **Request coverage:** Insufficient packet evidence. The timeline shows queue preparation, five workers, wave validation, and wave reuse, which directly follow the request. However, the packet truncates cited events at line 156 while turns continue to line 690; it omits merge, import, final-status output, and final handoff. One completion is recorded but not included.
- **Verdict:** Likely waste, narrowly limited to one duplicate instruction read; the repeated queue commands are necessary cost.
- **Evidence and first avoidable decision:** The required `npm run task:context -- artist-helper` runs at line 11, followed by `cat AGENTS.md` at line 17. Because task context already bundles local instructions, line 17 is the first avoidable decision. Preparation at line 23, per-wave print/validate calls, five distinct worker prompts, and waits on changing active-worker sets are required orchestration, not repetition waste.
- **Detector assessment:** Major false positives. Normalizing wave numbers, agent IDs, target sets, and timeouts causes semantically distinct `print`, `validate`, `spawn/send`, and `wait` operations to collapse as repeats. Polling a shrinking target set is progress-aware, not an equivalent retry. The detector missed the stronger immediate duplicate read at line 17.
- **Avoidable-token range:** **Low 0 / likely 500 / high 626 input tokens.** Method: the adjacent measured input rises from 18,709 at line 13 to 19,335 at line 19, a 626-token turn delta after `cat AGENTS.md`. Zero preserves uncertainty about non-read overhead; 500 is a conservative likely share; 626 caps attribution at the measured delta. No downstream replay savings are claimed.
- **Root cause:** Missed instruction plus command normalizer that erases workflow-significant parameters.
- **Smallest reusable fix:** Suppress immediate local-instruction rereads after successful `task:context`. Make command-family normalization parameter-aware for wave, batch/agent, active target set, and validation phase; classify `wait_agent` as polling and only flag unchanged targets after a completed/terminal response.
- **Confidence:** High on detector false positives; medium-high on the duplicate-read estimate; medium on end-to-end coverage because final events are missing.
- **Raw-window escalation:** None.

## Cross-Packet Calibration Findings

### 1. Repeat Counts Cross Task Boundaries

- The three largest packets aggregate 16-day to 65-day sessions with 96-110 completions, then cite one occurrence from one late task beside whole-session repeat quantities.
- This produces false positives for `task:context`, `git status`, and active plan/roadmap reads that are legitimately repeated across independent user turns.
- **Fix type:** Detector and packet schema.
- **Fix:** Define task segments from user messages/completion boundaries, calculate repetition within a segment, and publish both segment count and session count.

### 2. Parameter Erasure Collapses Necessary Queue Work

- Wave numbers, worker IDs, target sets, and timeout values determine whether queue commands are equivalent. Replacing them with `<n>`, `<sha>`, and `<path>` makes required per-wave/per-worker actions appear repeated.
- **Fix type:** Detector test.
- **Fix:** Preserve semantic parameters and add fixtures proving that different waves, batches, shrinking wait sets, and validations are not duplicates.

### 3. Packets Do Not Meet Their Intended Review Contract

- Four packets are 114 KB to 1.62 MB, far beyond the stated 12,000-token intent, because they include every turn-usage record while providing only five cited events.
- Packets lack active user-turn text, bounded event excerpts/tool-result summaries, prior matching calls, completion content, validation state, per-tool output attribution, task-segment IDs, and child termination/output-use state.
- `sourceRequest` is the first request of a long-lived physical session, not necessarily the request governing cited events. This prevents request-coverage review.
- **Fix type:** Packet generator and validator.
- **Fix:** Enforce the cap, include a compact local turn window around each signal, attach the governing user request and completion, and validate that every signal has its current and prior event plus result summary.

## Calibration Summary

- **Necessary cost:** `019f3ed8-272d-7443-9065-d98314f53e56` (sole startup call); most queue orchestration in `019f3307-38bf-7cc0-80a1-3292d3ac054a`.
- **Likely waste:** Immediate instruction rereads in `019f393a-b348-7da2-9b68-c6d00d1a2d08` and `019f3307-38bf-7cc0-80a1-3292d3ac054a`.
- **Insufficient evidence:** The overall work in the other four packets and end-to-end completion in the queue packet.
- **Confirmed waste:** None. No packet contains enough paired before/after evidence to raise a likely duplicate beyond reasonable doubt.
- **Escalations:** None; bounded raw windows were not essential to identify the calibration defects.
