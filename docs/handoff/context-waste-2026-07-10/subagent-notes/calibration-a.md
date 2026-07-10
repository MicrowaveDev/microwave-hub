# Calibration Review A

## Scope and method

- Reviewed exactly the six assigned packet JSON files.
- Applied the packet evidence as a bounded sample. Frequency across an entire session is not, by itself, evidence that the cited occurrence was unnecessary.
- Avoidable-token ranges are given only where adjacent `turnUsage` deltas can be tied to a packet-cited redundant action.
- Raw-log escalation: none. The packets are sufficient to classify the detector hits, although several cannot establish full request coverage or completion.

## Packet classifications

### `019ef16b-fd26-7ab0-af1a-25519d06d100`

- **Classification:** necessary / detector false positive; no packet-proven waste.
- **Evidence:** the bounded events show one `npm run task:context -- mushroom-master` followed by two targeted `rg` queries against relevant server, test, web, and plan paths. For a request as underspecified as "continue implementing the plan," establishing repo context and locating the next plan-related implementation points is necessary.
- **Detector issue:** `repeated-command: 83` and `repeated-read: 302` are session-wide frequencies from a session spanning June 22 to July 8, while the packet supplies only one local command and two searches. A search that includes a plan file is mislabeled as a repeated read; the packet does not show 302 local reads or repeated consumption of the same output.
- **Missing fields:** active user turn/request at line 16800; task boundary identifier; command cwd; exit status and output byte/token counts; previous occurrence lines and time gaps; whether `task:context` changed state; files or plan section selected by the searches. The source request is too generic to assess end-to-end coverage.
- **Avoidable tokens:** not estimated. No cited turn delta is attributable to proven waste.

### `019dfe3e-322b-7960-a2ce-a5dbc7e77705`

- **Classification:** necessary / detector false positive; no packet-proven waste.
- **Evidence:** one targeted search of `docs/todo.md` and `docs/activitypub-research.md`, followed by one `git status --short --branch`, directly supports estimating remaining ActivityPub PR work and checking repository state.
- **Detector issue:** counts of 92, 7, and 278 are aggregated over a May 6 to July 10 session and do not demonstrate repetition within this request. The two documents are searched, not broadly reread. `git status` is a cheap and relevant state check, especially in a shared worktree.
- **Missing fields:** request active near lines 93841-93842; search/status outputs; current repo/submodule; PR inventory or remote-query evidence; mapping from TODO items to PR-sized units; whether the final answer answered "how many." Without those fields, request coverage and estimate quality are indeterminate.
- **Avoidable tokens:** not estimated.

### `019e50c0-0c62-7db3-9c82-694b7b07cad5`

- **Classification:** necessary startup/discovery / detector false positive; no packet-proven waste.
- **Evidence:** `task:context -- artist-helper`, a worktree status check, and a shallow sorted listing of top-level Markdown docs are proportionate discovery for analyzing an implementation and authoring a plan.
- **Detector issue:** session-wide counts (`task:context: 30`, `git status: 128`) are attached to a single local occurrence in a May 22 to July 6 session. The detector does not account for task boundaries or the hub rule requiring `task:context` once the repo is known.
- **Missing fields:** active request at line 8905; outputs and sizes of all three commands; which implementation/server-result artifacts were subsequently inspected; authored plan path and validation; final answer. The packet cannot establish whether the substantive analysis happened or whether the plan satisfied the detailed user request.
- **Avoidable tokens:** not estimated.

### `019f393a-b348-7da2-9b68-c6d00d1a2d08`

- **Classification:** mixed: `task:context -- artist-helper` is necessary; rereading bundled hub instructions is likely avoidable; the AGENTS detector is under-evidenced.
- **Evidence:** the hub workflow requires `task:context` for the known repo. The next cited tool reads `portable-agent-instructions.md`, even though `task:context` bundles cross-repo and repo-local instructions and hub guidance says not to reread them. A signal claims repeated `AGENTS.md` reads, but the packet omits the corresponding local tool event(s).
- **Detector issue:** `task:context: 12` is a false positive because the count is global and the bounded occurrence is required. Normalizing `sed -n '<n>,260p' AGENTS.md` into four repeats may also collapse distinct page windows; `repeated-read: 12` lacks occurrence lines and output sizes.
- **Missing fields:** output of `task:context`; exact AGENTS commands/lines; whether the helper output was truncated; active request at each alleged repeat; command output sizes. These are needed to decide whether any AGENTS continuation was necessary.
- **Avoidable tokens (bounded):** **low 450 / likely 550 / high 575 tokens**, limited to the adjacent input-token growth from line 13 (18,757) to line 21 (19,330) around the explicit portable-instructions read. The later 5,411-token increase is not counted because uncited actions may intervene.

### `019f3ed8-272d-7443-9065-d98314f53e56`

- **Classification:** necessary; no detector finding and no packet-proven waste.
- **Evidence:** the sole event is `npm run task:context -- artist-helper`, exactly the required direct routing step for the production image-description queue. The packet's approximately 13-second duration and one tool call do not show exploratory waste.
- **Detector issue:** none on the event itself. However, `taskTree.sessionIds: 35` is misleading for this one-batch worker packet unless descendant/ancestry scope and contribution are identified.
- **Missing fields:** the source request is truncated mid-sentence; assigned queue item metadata; image inspection event; result-file write; validation result; completion status; explanation of why the task tree contains 35 sessions while this session has one tool call. Request coverage cannot be verified.
- **Avoidable tokens:** not estimated.

### `019f3307-38bf-7cc0-80a1-3292d3ac054a`

- **Classification:** predominantly necessary queue orchestration / detector false positives; one small likely redundant instruction read.
- **Evidence:** preparing the queue, printing each wave, dispatching one worker per batch, waiting for outstanding workers, validating each wave, and advancing waves are explicitly required by the user's command and queue workflow. Repetition here represents separate wave/batch instances, not repeated attempts at one action. `cat AGENTS.md` immediately after `task:context` is likely redundant because the helper bundles local instructions.
- **Detector issue:** command normalization erases semantic identifiers (`wave`, agent, target, result path), causing distinct required operations to collapse into "repeated-command." Wait calls with shrinking target sets are normal synchronization, not retries. Counts of 11 print/validate commands and per-agent dispatches should be grouped as workflow progress, with failures or unchanged parameters required before labeling waste.
- **Missing fields:** queue-declared wave/batch counts; each tool's exit/result status; worker state transitions; validation verdicts; merge/import/final-status events; command output sizes; whether `task:context` output was truncated. The packet ends during wave 3 and cannot establish final request coverage or handoff quality.
- **Avoidable tokens (bounded):** **low 500 / likely 600 / high 626 tokens**, based only on input growth from line 13 (18,709) to line 19 (19,335) surrounding the redundant `cat AGENTS.md`. No queue-loop tokens are counted as avoidable.

## Cross-packet calibration findings

1. **Frequency needs task-local denominators.** Repetition counts spanning days or months should not be assigned to one bounded occurrence. Add previous-occurrence lines/timestamps, task-turn IDs, cwd, normalized and raw command, and count within the active task.
2. **Classify semantic instances before repetition.** Preserve wave, batch, agent, target-set, file-window, and validator-phase identifiers. Queue print/dispatch/wait/validate sequences are required progress unless the same semantic instance is retried without new state or after success.
3. **Separate search from read.** An `rg` over a named file is not equivalent to opening the whole file. Record matched-line count, output bytes/tokens, and whether the same ranges were returned again.
4. **Packets need outcomes.** Include command exit status, concise output/result, writes, validator verdicts, final response, and active user request near each event. Current packets often support tool-necessity review but not request coverage or handoff assessment.
5. **Token attribution needs event-to-turn linkage.** Add per-event prompt contribution or output-token/byte size and explicit preceding/following turn IDs. Session totals and raw context replay are not estimates of avoidable tokens.
6. **Instruction helper awareness should be encoded.** A post-`task:context` read of bundled instruction files is a useful detector candidate, but it should check helper success/truncation and distinguish continuation windows before declaring waste.

## Residual risk

The two token ranges measure adjacent input growth, not causal token accounting; they are intentionally narrow and exclude later turns. The packets do not include enough completion evidence to judge whether any of the six sessions ultimately satisfied their requests. No raw source windows were opened, so those coverage questions remain explicitly unresolved rather than inferred.
