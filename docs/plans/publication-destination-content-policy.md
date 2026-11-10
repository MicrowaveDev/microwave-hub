# Explicit content policy for social destinations

## Contents

- [Contract](#contract)
- [Workstreams](#workstreams)
- [Delivery](#delivery)

## Contract

The user approved one channel per publication destination, with user-selected
`contentPolicy: sfw | nsfw`. SFW accepts only explicit safe content; NSFW permits
both. It does not select another channel or override Discord's own NSFW flag.

For Twitter, Bluesky, Discord and Telegram, safe means authored sensitive=false;
for Rule34, rating=s. Other networks have no supported SFW classification yet.
Existing null-policy configurations, receipts, jobs, digests and retry keys retain
their original behavior. New explicit policies reject alternate-channel fields.

Node freezes nullable policy on each destination job and validates policy before
source/media/job creation. Accepted retries return the original job even after
destination settings change. Executors check frozen policy, not current settings.

## Workstreams

1. Node (#1575): additive migration, setup/catalog/compose validation and worker
   checks. Outputs: module contract, SQL/HTTP regressions and PR to dev.
2. Client (#31), parallel after contract freeze: account policy choice, single
   endpoint settings, policy metadata and local frozen preflight. Preserve old
   combined-route accounts with clear migration guidance. Output: PR to main.
3. Girls (#1037), parallel after contract freeze: catalog/preflight, frozen receipt
   verification and unambiguous selection. Retain existing selector options.
   Output: verified task-only commit on dev.
4. Root integrates evidence and updates the published Girls pointer. PR merges
   remain user-owned. Node is deployed before either consumer.

## Delivery

No live configuration, account secrets, worker settings or publication is changed
by this source task. The previously separated live Discord destinations remain
disabled; assigning their new policy requires the upgraded Node schema/API.

Client: [PR #32](https://github.com/galtproject/geesome-client/pull/32) (merged by
the user during verification), commit
`4ea1e4dfe6dd507f3f3c6d8268caa324ae974ece`. 187 unit tests and syntax checks pass;
28 destination UI and 18 Patreon captures pass, including desktop/narrow policy
choice, SFW rejection, accepted-request recovery and preserved legacy settings.
The new states were visually inspected. Actual Twitter/Rule34 data was untouched.

Independent Client-to-Node/Girls contract review found no blocking mismatch in
registration echo, policy classification, frozen job/receipt metadata or retry
semantics.

Node: [PR #1576](https://github.com/galtproject/geesome-node/pull/1576), commit
`9216b164`. 73 targeted PostgreSQL and 26 actual Node/PostgreSQL/Kubo HTTP tests
pass. apiDoc/security/scalability checks pass. Schema audit: 299 pass, two known
unrelated file-catalog model-sync index failures, one skip; new fields pass.
The full repository suite was not run. Independent Node review found no blocker.

Girls: 78 focused social/CLI, five mock-contract and 898 Generation Studio tests
pass; frontend builds pass. Docker queue: 32 verified captures, run
`f83cc228-1db5-4b89-b781-1773b530671d`; social: 12 verified captures, run
`493c230e-db58-4e16-9968-42fce1947fed`. All 44 captures were visually reviewed,
including full desktop/narrow SFW rejection with zero uploads/jobs and preserved
selection. API gate: 38 browser plus nine CLI/API/PostgreSQL cases pass, run
`72eab765` (EXIT0). Girls commit `98b6d5180a4c8e964f3e2bc0a1b6dc48665af735`
is pushed on dev. Exactly eight task paths were committed with an isolated index
atop concurrent owner work; unrelated comic/Generation/storage edits were preserved.
Task runtime hashes remained frozen throughout the gates.

All implementation workstreams and required gates are complete. Node PR remains
user-owned; its feature pointer is not promoted in the hub before merge. Client
is a standalone nested repository, so it has no hub submodule pointer. The Girls
pointer is updated only to the exact verified published dev commit.
