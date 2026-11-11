# Publication destination groups

## Contents
- [Contract](#contract)
- [Implementation order](#implementation-order)
- [Acceptance](#acceptance)
- [Evidence](#evidence)

## Contract
User: replace the hardcoded network selector with actual Node Publication
Destinations and first-class named Publication Destination Groups for one-click
multi-destination enqueue.

Node owns owner-scoped groups: id, label, revision, enabled and an ordered list of
1–20 unique owned destination IDs. Repeated networks are allowed; nested groups
and secrets are not. Create has a stable request key; update compares the current
revision. Group changes do not edit destinations or accepted jobs. Group metadata
uses publishing:local plus group-management authorization; server credential APIs
retain their explicit management authorization.

Girls displays actual destinations and groups and manages groups in publishing
settings through its existing personal Node connection. Node is the source of
truth. Selection freezes IDs/networks/group revision, then resolves every eligible
member against the owned private source and content policy before receipts,
uploads or compose. No silent subset/filter/fallback. Each destination has its
own batch keys, schedule and outcome, including repeated networks. Mixed provider
results remain separate; one click does not imply atomic external provider sends.

Saved attempts and receipts keep the original members even after group edits;
new intents require the current revision. Existing CLI/network requests and
historical receipt keys keep their original recovery path. The current dialog's
provider authoring requirements remain explicit (Rule34 keywords/source, Patreon
member previews in Prepare Post). Unsupported provider flows must be explained,
never silently excluded from a group.

## Implementation order
1. Node: new model and bounded catalog/create/update APIs, authorization,
   PostgreSQL and route checks. New tables use Model.sync, not a table-only migration.
2. Girls bridge: group proxy, explicit destination selection, frozen membership,
   distinct per-destination recipes/schedules, backward recovery tests.
3. Girls UI: real selector, settings group editor, frozen retry state and delivery
   labels; desktop/narrow screenshot and API evidence.
4. Push Node PR to dev, task-only Girls commit to dev, then update hub plan/pointer
   on main. Do not merge PRs or access production.

Work is serialized in the existing checkouts. Unrelated comic/Generation/storage
changes remain untouched. Client's active Vue work is outside this task; no
Client edits are needed for Node ownership and Girls selection/management.

## Acceptance
Owner isolation, stable group create retry, stale-revision conflicts, duplicate
IDs/bounds, repeated-network members, disabled/incompatible member rejection,
original member replay after edits, source/privacy/content policy checks and no
secret leakage. Browser creates a group through controls, selects it, queues all
members, reloads and distinguishes per-destination history. Verify desktop and
narrow layouts and real source/digest preservation with mock providers only.

## Evidence
Implemented Node model/API and Girls bridge, selector, settings editor and queue labels.

- Node issue [#1584](https://github.com/galtproject/geesome-node/issues/1584),
  commit `fcfef517`, PR [#1585](https://github.com/galtproject/geesome-node/pull/1585)
  was merged externally into `dev` as `affc4f76766cc290a8e81e179ac4010923e79f28`.
  Local `dev` fast-forwarded to that exact remote commit; its tree matches the tested feature tree.
- Girls issue [#1052](https://github.com/MicrowaveDev/microwave-girls/issues/1052),
  task-only 21-file commit `8e4d39505eaa2b7dd8296a6e57729bb8020b87f8` pushed to `dev`.
  Unrelated comic/catalog/Generation work was preserved, including concurrent
  base-branch commits. Both base-branch pointers are ready for the hub handoff;
  Node is clean and Girls has only unrelated preserved changes.
- Node: 83 targeted PostgreSQL/publishing/provider/image/migration tests pass;
  API-doc generation, security-route and database-scalability checks pass.
  TypeScript still has baseline errors; no errors reference the new group code/tests.
- Girls: 90 social CLI/bridge tests, 7 mock-contract tests and 54 frontend tests
  pass. The Generation unit regression also passed 900 tests.
- Final exact-source Docker queue run: 2 desktop/narrow tests plus CLI assertion,
  40 verified screenshots/evidence contracts, run
  `f75547b8-79b5-473f-9c85-a42428b497b3`.
  Artifacts: `microwave-girls/e2e-artifacts/destination-groups-queue-verified`.
- General social dialog regression: 2 desktop/narrow tests, 12 verified
  screenshots, run `092bab84-0212-4c98-a414-9ba536402cf7`.
  Artifacts: `microwave-girls/e2e-artifacts/destination-groups-social-verified`.
- Generation API regression: 38 desktop/narrow browser/API tests and 9 real-API
  CLI assertions pass, run `2d22aee5-bb77-4ec9-9910-7cf611f4ca97`.
  Artifacts: `microwave-girls/e2e-artifacts/destination-groups-api-verified`.
- Hub pointers updated to the exact pushed Node `dev` merge and Girls `dev`
  task commit. The pointer helper reports Node ready; Girls remains dirty only
  from unrelated preserved work. All 21 task paths are clean, HEAD equals
  origin/dev, and only the intended two pointers and this plan are staged.

Runtime and test files were compared by SHA256 with the Docker snapshots;
`verified-images.json` in each ignored artifact folder records immutable image
IDs and hashes. The final Vue branding-preference correction rebuilt the frontend
from the task snapshot. A /tmp copy of the repository harness skipped only
redundant image rebuilds; all fresh PostgreSQL setup, real Girls API, browser,
CLI and evidence validation steps remained intact. External services were mocked.
Desktop and narrow screenshots were visually checked, including the named group,
full member summary and settings editor. No overflow or production actions.

Rollout order: merge/deploy Node support first, then deploy Girls. Older Nodes
show an upgrade message for groups. Group selection metadata does not alter the
existing v6 content-type/digest contract or provider credential permissions.
