# Post content type and destination policy

## Contents

- [User requirements](#user-requirements)
- [Contract](#contract)
- [Workstreams and rollout](#workstreams-and-rollout)
- [Verification and delivery](#verification-and-delivery)

## User requirements

Replace internal boolean `sensitive` with post `contentType: sfw | nsfw`. Use a
small network-independent helper to decide whether the post fits the channel.
Remove unnecessary exceptions and do not retain the old sensitive contract.

| Post contentType | Channel contentPolicy | Allowed |
| --- | --- | --- |
| sfw | sfw | yes |
| sfw | nsfw | yes |
| nsfw | sfw | no |
| nsfw | nsfw | yes |

## Contract

New compose requests require top-level contentType; canonical targets contain
endpoint/provider-specific parameters, no sensitive classification. Each job
freezes contentType. `isContentTypeAllowed(contentType, contentPolicy)` compares
the two explicit values; it contains no social-network branches. Migration fills
null channel policy with nsfw, preserving existing explicit policies.

Adapters alone map type into external API parameters: Reddit nsfw, Twitter
possibly_sensitive, Bluesky labels, Telegram spoiler and Rule34 rating s/e.
Provider-specific validation, including Discord's NSFW channel requirement,
remains appropriate in adapters. No parallel internal sensitive truth is kept.

New Node capability: contentTypePublishing=true. Girls requires it and the
registered destination catalog before new preparation. New v6 canonical digest
is SHA256 of JSON.stringify with this exact ordered structure:

```text
{version:6,contentType,destinationId,executionMode,accountIdentity,clientId,
 network,localAccountId,text,attachments:[{storageId,mimeType}],target}
```

Nonapplicable identity fields are null; target keys are sorted. This binds type
to content and route. It does not reinterpret old digests as v6.

One-time migrations translate persisted old classification and strip retired
keys. Old IDs, request keys, opaque hashes/digests, claim tokens and outcomes
remain. Old queued jobs are held by intentVersion (new jobs use 6), never silently
resent under a changed contract, and remain cancellable. Accepted old Girls
receipts allow read-only reconciliation by original ID/key and opaque digest;
they cannot upload/compose/rekey a new send. Stale browser/CLI authored intents
fail closed with actionable upgrade/review guidance.

Both public claim APIs require an explicit intentVersion=6 request handshake.
This prevents an old running executor from claiming a new job and interpreting
its canonical target under the removed boolean contract. Result acknowledgements
for already-claimed jobs retain their existing protocol and claim tokens.

## Workstreams and rollout

1. Node #1581: helper, required contentType contract, schema/migration, v6 digest,
   claim fencing, adapters and real PostgreSQL/HTTP tests. Based on Reddit support
   #1580 until its user-owned merge. Source owner: Node agent.
2. Client #35: generic policy helper, composer/worker, adapter mapping and stale
   attempt rejection; unit/provider/UI verification. Depends on Reddit #34 until
   its user-owned merge. Source owner: Client agent.
3. Girls #1043: classify once at UI/CLI boundary, v6 receipts, capability gating,
   one-time receipt migration and read-only accepted history; preserve unrelated
   working-tree changes. Source owner: Girls agent.
4. Root coordinates the contract, reviews cross-repo behavior and records evidence.
   No library release, extra queue or executor registry is introduced. The small
   pure helper is verified against the same truth table in each runtime.

For the coordinated upgrade, stop old Node API/server workers and pause all old
local executors before migrating; let in-flight sends settle or record their
unknown outcome first. An old binary must never continue claiming work against
the converted schema. Back up, migrate and deploy Node first, then matching
producers/executors. Keep result tokens/journals for acknowledgement/review.
Nonempty legacy alternate endpoint configs
must be split explicitly before migration; migration must not discard a channel.
No production migration, restart, publication or live account edit is authorized
as a side effect of source verification. PR merges remain user-owned.

## Verification and delivery

Independent integration checks: all three actual helper implementations agree on
the four valid combinations and reject invalid/missing inputs (24 assertions).
Twenty-four Node/Girls v6 digests agree across six networks, both execution modes
and both types, including Unicode text, ordered media and sorted targets.

Client delivery: [PR #36](https://github.com/galtproject/geesome-client/pull/36),
head `d2379b6cea34d045b0616a5d49870e0c61814b2c`. 198 unit/API/provider tests and
syntax checks pass. Destination UI has 30 captures, Reddit 14 and Patreon 18;
new desktop/narrow upgrade-required states were inspected. Old queued work shows
review guidance with cancellation and no Send action. Automatic/manual claims on
both endpoints carry intentVersion=6; pending result acknowledgement is unchanged.
The local live account/config files and services were not changed.

Final source references, migration evidence and UI/API results will be recorded
here before handoff. Full completion includes removing stale sensitive readers
from runtime code (external provider fields and one-time migrations excepted),
checking the four helper cases, rejecting invalid/contradictory input, preserving
opaque outcomes and demonstrating no automatic sends of old queued work.

### Continuation delivery

Node content type is committed as `9f83d6b7` and pushed in
[PR #1582](https://github.com/galtproject/geesome-node/pull/1582), targeting `dev`.
The final isolated PostgreSQL unit/provider/schema suite has 79 passing. The
remaining policy test failure was fixture-key reuse and is fixed. Prior final
Docker HTTP evidence has 28 passing; host HTTP startup is blocked by the installed
IPFS dependency's missing `Crypto` export. Wider audit baseline remains two
fileCatalog model-sync failures; project TypeScript baseline errors remain.

Server account settings are implemented separately in Client
[PR #38](https://github.com/galtproject/geesome-client/pull/38), depending on #36.
Local / Server tabs preserve local account cards and show server destinations,
shared bot identities, one endpoint, source, policy and state. Every server
operation requires an explicitly entered key and current node binding; the key
is never persisted or substituted for the local executor key. Existing Node
catalog/disable authorization requires publishing:local and owner permissions;
setup additionally requires publishing:manage. Setup needs provider credentials
again and new destinations default disabled. Existing shared-account credential
rotation is explained. No server credentials are fetched or copied locally.
208 Client unit/API/provider tests and syntax checks pass. The new flow has 16
reviewed desktop/narrow captures; existing Reddit (14) and destination (30) flows
also pass.

User UI refinements: Girls Rule34 source must automatically use the current admin
site origin, with no editable source field. Rule34 tags must use the existing
multiselect and keyword database, including adding a new keyword. Ordinary tags
and Rule34 keyword selection stay separate. Browser evidence must prove a real
queued target contains both selected keyword contents and the current site as
source; provider rating remains adapter-only. No production account or live
configuration changes are part of this work.

Girls delivery: [`a0c5582d`](https://github.com/MicrowaveDev/microwave-girls/commit/a0c5582d719f34ae8bb275b435827356a0740b70), pushed directly to `dev` under
its local workflow. Twenty task paths include the canonical bridge/CLI/receipts,
Patreon caller, one-time receipt migration and Rule34 database multiselect with
current-site automatic source. Task paths are clean; unrelated dirty comic,
Generation and storage files remain preserved. `HEAD` and `origin/dev` both point
to the delivered commit. The generic pointer helper still reports a dirty
worktree because of those unrelated files; the pointer is verified against this
exact pushed base-branch commit rather than their uncommitted content.

Final Girls gates: 83 bridge/CLI/caption, 6 mock contracts, 47 focused frontend,
899 Generation regressions and disposable PostgreSQL receipt migration pass.
Queue/browser + real CLI/API passes with 38 fresh desktop/narrow captures (run
`099e305f-c395-4c4e-849b-b7b14d68288e`); social regression passes with 12 captures
(run `e6e13923-bbdd-412d-bc06-3fa5c6765966`). Generation Studio API completes
38 browser and 9 CLI/API/PostgreSQL cases. The six changed Rule34 captures and
ordinary tag search states were inspected. Image source verification compared
25 task files before reusing four immutable local images with fresh databases
through a frozen copy of the existing harness; only its image-build step was
omitted. This avoided repeated dependency downloads and concurrent wrapper edits.
Full evidence and the image/source hash record are under ignored Girls
`e2e-artifacts/content-type-{rule34,social,api}-pass` directories.

Remaining operational work is intentionally separate: user merges Node/Client
PRs in dependency order and authorizes the coordinated deployment. No production
connection, credential extraction, migration, restart, test post or live account
configuration was performed. The running local account service was not restarted.
