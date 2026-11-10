# EraOfWave Reddit destinations

## Contents

- [Requested setup](#requested-setup)
- [Implementation and live state](#implementation-and-live-state)

## Requested setup

Use one local Reddit profile, EraOfWave, for two explicit destinations:
`r/EraOfWave` with policy nsfw (allows both) and `r/EraOfWave_SFW` with policy sfw.
Cookie stays on Client and is supplied through stdin/clipboard, never chat,
command-line arguments, logs or Node.

## Implementation and live state

The user saved the account with the provided clipboard command. Read-only
Client account verification succeeded. Two Node client-mode destinations have
been created: IDs 6 and 7, source group 4, same local account and dedicated client
key. Both remain disabled. No Reddit publication or new queue mapping was created.

Node [PR #1580](https://github.com/galtproject/geesome-node/pull/1580), issue #1579,
commit `69db61f5`: optional Reddit target.sensitive, strict boolean validation,
SFW requires false, legacy omission and accepted replay unchanged. 74 targeted
PostgreSQL and 27 real HTTP/PostgreSQL/Kubo tests pass; apiDoc and inventories pass.

Client issue #33 adds optional account.redditDestinations rows, separate stable
subreddit keys and composer cards, sharing the account's single credential set.
Provider submit nsfw is supplied only for explicit sensitive true/false, preserving
legacy omitted fields. Deploy Node first, then restart the matching Client.

The currently running Client accepted but ignored a partial redditDestinations
metadata update, confirming it is still the old version. Raw persisted config was
verified unchanged. Do not edit the live config behind that process; after update,
save the two rows through Settings or the validated account API. Group mapping is
still unchanged, so the new disabled routes cannot be consumed accidentally.

Client [PR #34](https://github.com/galtproject/geesome-client/pull/34), commit
`8b1ccfab4afa4f33bc0cd0c79fc6f2463bdad7a1`: 192 unit tests and syntax checks pass;
14 Reddit UI captures were visually reviewed, plus 28 existing destination and
18 Patreon captures pass. Coverage includes Cookie/OAuth, text/native image and
omitted/false/true sensitivity, distinct cards/jobs and exact lost-response retry.
Legacy frozen base-key attempts fail closed after a route migration and replay
unchanged after original settings are restored.

After the matching Client restart, save account.redditDestinations with the two
rows above and verify its echo in GET /api/config. No cookie needs to be supplied
again. Map the account to group 4 only when deliberately enabling the routes;
their stable keys recover the already-created IDs 6 and 7 without duplicates.
