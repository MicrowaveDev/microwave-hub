# SFW / NSFW publication readiness

## Contents
- [Contract](#contract)
- [Workstreams](#workstreams)
- [Operational boundary](#operational-boundary)
- [Evidence](#evidence)

## Contract
User requested working SFW and NSFW groups containing Twitter, Bluesky, Discord
and Reddit. Node owns groups and destination identity; Client keeps local sessions
and claims exact registered destinations; Girls authors an immutable group attempt.
No real publications, credential printing or endpoint substitution during QA.

## Workstreams
1. Node #1587: manage-only stored-credential revalidation for policy/activation,
   exact safe snapshot and locked conflict checks, provider identity/endpoint
   verification, preserved source/account/target/jobs. PR #1588.
2. Client #41: bounded distinct account arrays per network/source, compatible
   scalar mappings, independent registration/claim/composer/removal, source UI.
   Settings-only server proxy/UI depends on workstream 1 deployment.
3. Girls #1055: Reddit native image targets, one task per image, normalized final
   title/text equality and all-member preflight, real four-network group selector.
   Preserve v6 digest, receipts, legacy keys and frozen retries.
4. Verify isolated backends and desktop/narrow workflows, commit/push each repo,
   then prepare live local routes while paused. Remote activation needs deployed
   Node support plus an explicit management key. User owns all PR merges.

Work is serialized in existing checkouts; no agents/worktrees. SSH was used only
after the explicit user request to extend the Client key, as recorded below.
Girls remains dev with unrelated comic changes preserved. Client branches from
origin/main after the Vue integration merge; Node branches from dev.

## Operational boundary
Both groups and their eight actual destination memberships are configured. All
members are enabled; each SFW member has sfw policy. Local and server provider
connections passed verification without posting. No credentials are kept in this
plan, Git, command arguments or chat. Local worker was paused during setup and
restored only after verifying the queue was empty. New Girls code still requires
user deployment before the old UI can select Reddit groups.

## Evidence
Node: 50 targeted PostgreSQL/API tests, API docs and security inventory
pass; tsc retains baseline errors with none in the changed implementation/tests.
Node PR [#1588](https://github.com/galtproject/geesome-node/pull/1588) was merged
externally as `5ec9888543c4353da6adcc45cdba6b6ff08c6e76`; local dev is synced and
its tree equals the tested feature tree.

Client: 216 unit/API tests and syntax/build checks; 6 multi-account, 30 destination
regression and 16 server-settings screenshots pass at desktop/narrow and reviewed.
The multi-account browser scenario submits both accounts through the real API;
worker tests verify exact destination/account claims and exclude ambiguous legacy
unbound group/network routes. Commits `58bf444` and `f0cd411` are pushed in
[PR #42](https://github.com/galtproject/geesome-client/pull/42) to main. The local
service runs the final task source; user owns the PR merge.

Girls: commit `e75af3d4dc9afa77e17ae2d1ffebe3569cf6e388` pushed directly to dev,
14 task-only paths; unrelated comic work preserved. 92 social bridge/CLI tests,
55 frontend tests, 12 policy/mock checks and 900 Generation regression tests pass.
Docker queue: 2 desktop/narrow browser tests plus real-API CLI assertion pass,
40 screenshots/evidence contracts verified, run `04a2ae92-a79c-46ff-b9c4-c71c10602610`.
Artifacts: `microwave-girls/e2e-artifacts/reddit-queue-final`. Application/runtime
and browser spec hashes verified against recorded Docker snapshots. The final
host verifier changed only the expected four-network set from Telegram to Reddit,
then revalidated all existing fresh captures; no runtime/test changes in that step.
Generation API: 38 browser/API and 9 CLI tests pass, run
`62f137c9-6ddd-4eff-b227-460c7cb5a86f`, artifacts `microwave-girls/e2e-artifacts/reddit-api-verified`.
See each ignored verified-images.json for actual image IDs/hashes/scope. Reused
verified images via /tmp repository harness copy skipping only redundant builds;
fresh PostgreSQL/API/browser/CLI/evidence workflows remained intact.

## Operational completion and remaining deployment
User authorized SSH on geesome-test specifically to extend the existing Client
key. Guarded transaction verified the exact key identity and existing state,
added only publishing:manage while preserving all effective scopes and existing
permissions; API confirmed the result. No key/credential was printed or changed.
After the user updated Node, existing encrypted server connections were reverified
through the new authorized API. NSFW Bluesky/Discord and SFW Discord were enabled;
SFW Discord policy corrected. All local accounts passed read-only connection checks.
Local source now selects both Twitter accounts, SFW Bluesky and shared Reddit with
explicit two-subreddit policies. Existing destination IDs retained, both groups
report available under the new selector with all members enabled and correct
policies. Queue was empty; Client worker restored to its previous enabled state.
No real compose/publication requests were sent.

Remaining user deployment: update Microwave Girls to the pushed dev commit so its
running UI/API recognizes Reddit. SFW publication still requires explicit content
classification (the SFW checkbox); group names do not infer content type. Client
PR remains for normal source integration. No production updater was run by agent.
