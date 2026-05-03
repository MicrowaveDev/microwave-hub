# Hub Submodule Map

Use this file to quickly identify which repository the user is talking about before editing code.

Operational metadata lives in [submodules.manifest.json](/Users/microwavedev/workspace/microwave-hub/submodules.manifest.json). Use this file for routing and the manifest for branch, install, and verification details.

## Quick Routing

| If the user mentions... | Start in... | Why |
| --- | --- | --- |
| therapy app, bot journal, check-ins, therapist cabinet, Telegram mini app, visual novel engine | `psycho-game` | This repo combines the game engine and the Bot Journal web platform. |
| GeeSome node, IPFS node, storage node, GeeSome API, static site generator, groups, posts | `geesome-node` | Backend node for file storage, social features, APIs, and generated sites. |
| Porto food places, opening hours, Google Places refresh, local food finder | `geesome-locals` | Vue + Express app for checking which places are open, with Google Places refresh support. |
| GeeSome shared IPFS helpers, trie, PGP, IPLD helpers | `geesome-libs` | Shared low-level library code used by the GeeSome stack. |
| artist posting tool, social publishing, Tumblr, Twitter, Bluesky, creator panel | `geesome-artist` | Social-posting oriented app/server with integrations for multiple networks. |
| GeeSome frontend, old Vue UI package, parcel build, published UI package | `geesome-ui` | Packaged frontend/UI layer for GeeSome clients. |
| GeesomeChan, Telegram NSFW moderation bot, spoiler reposts, Stars balance, client PM review lane | `blog-master` | Contains the GeesomeChan moderation system and related operational scripts. |
| mushroom lore, Telegram archive, OCR reposts, character dossiers, PDF lore generation, Mycelium Autobattler, telegram mini app game, backpack, inventory, prep screen, artifact card, bag preview, loadout, item caption, replay, shop, season rank | `mushroom-master` | Two product surfaces: the lore PDF pipeline (`src/`, `data/`) and the Mycelium Autobattler Telegram Mini App (Vue frontend in `web/`, Express backend in `app/server/`). |
| microwave girls, social cross-posting, Twitter scraping, Bluesky, Discord posting, Tumblr, self repost | `microwave-girls` | Social cross-posting/scraping app spanning Twitter, Bluesky, Discord, Tumblr, and Telegram. |
| agent viewer, agent logs, rollout JSONL, Codex sessions, Claude task outputs | `agent-viewer` | Local viewer for agent task/session outputs and log analysis exports. |

## Detailed Notes

### `psycho-game`

- Primary role: combined repo for a visual novel engine and the Bot Journal therapy platform.
- Strong signals:
  - Express API
  - Vue SSR web app
  - Telegram Mini App auth
  - check-ins, therapist/admin flows, E2EE journal features
- Read first:
  - [psycho-game/CLAUDE.md](/Users/microwavedev/workspace/microwave-hub/psycho-game/CLAUDE.md)

### `geesome-node`

- Primary role: GeeSome backend node for decentralized file storage and social/media features.
- Strong signals:
  - IPFS storage
  - groups, posts, content APIs
  - static site generation
  - backend migrations and test suites
- Read first:
  - [geesome-node/AGENTS.md](/Users/microwavedev/workspace/microwave-hub/geesome-node/AGENTS.md)
  - [geesome-node/README.MD](/Users/microwavedev/workspace/microwave-hub/geesome-node/README.MD)
- Useful entry points:
  - `app/`
  - `docs/`
  - `index.ts`

### `geesome-locals`

- Primary role: small local-food finder app with Vue frontend, Express backend, SQLite storage, and optional Google Places refresh.
- Strong signals:
  - Porto-area food places
  - open-now queries by day/hour
  - Google Places API cost concerns
- Read first:
  - [geesome-locals/AGENTS.md](/Users/microwavedev/workspace/microwave-hub/geesome-locals/AGENTS.md)
  - [geesome-locals/README.md](/Users/microwavedev/workspace/microwave-hub/geesome-locals/README.md)

### `geesome-libs`

- Primary role: shared helper library for IPFS/IPLD, trie structures, wrappers, and crypto-related helpers.
- Strong signals:
  - helper functions used by other GeeSome repos
  - library-only changes with no direct app UI
- Read first:
  - [geesome-libs/AGENTS.md](/Users/microwavedev/workspace/microwave-hub/geesome-libs/AGENTS.md)
  - [geesome-libs/README.md](/Users/microwavedev/workspace/microwave-hub/geesome-libs/README.md)
- Useful entry points:
  - `src/base36Trie.ts`
  - `src/JsIpfsService.ts`
  - `src/ipfsHelper.ts`
  - `src/pgpHelper.ts`

### `geesome-artist`

- Primary role: social publishing/server app with integrations for multiple external platforms.
- Strong signals:
  - posting or syncing to Tumblr, Twitter/X, Bluesky, or similar services
  - creator/admin tooling
  - Express + Sequelize + Vue app structure
- Read first:
  - [geesome-artist/AGENTS.md](/Users/microwavedev/workspace/microwave-hub/geesome-artist/AGENTS.md)
  - [geesome-artist/package.json](/Users/microwavedev/workspace/microwave-hub/geesome-artist/package.json)
- Useful entry points:
  - `index.ts`
  - `app/`
  - `frontend/`

### `geesome-ui`

- Primary role: older packaged GeeSome frontend/UI layer published as `@geesome/ui`.
- Strong signals:
  - Vue 2 UI work
  - Parcel build issues
  - package publishing or dist generation
- Read first:
  - [geesome-ui/AGENTS.md](/Users/microwavedev/workspace/microwave-hub/geesome-ui/AGENTS.md)
  - [geesome-ui/package.json](/Users/microwavedev/workspace/microwave-hub/geesome-ui/package.json)
- Useful entry points:
  - `src/`
  - `assets/`
  - `locale/`

### `blog-master`

- Primary role: GeesomeChan Telegram moderation and NSFW filtering system.
- Strong signals:
  - media moderation
  - spoiler reposts
  - oversized video review lane
  - Telegram Stars balance or payment flow
- Read first:
  - [blog-master/AGENTS.md](/Users/microwavedev/workspace/microwave-hub/blog-master/AGENTS.md)
  - [blog-master/Readme.md](/Users/microwavedev/workspace/microwave-hub/blog-master/Readme.md)

### `mushroom-master`

- Two product surfaces in one repo. Identify the active surface before picking a verify command.
  - **Lore pipeline:** Telegram channel archiver plus OCR, lore generation, character routing, and PDF output. Lives in `src/`, `data/<channel>/`, and the `npm run regenerate` / `npm run analyze:pdf-structure` / `npm run set-message-hashtags` commands.
  - **Mycelium Autobattler:** Telegram Mini App game. Vue frontend in `web/`, Express backend in `app/server/`, shared code in `app/shared/`, Playwright specs in `tests/game/`. Verified with `npm run game:test`, `npm run game:test:e2e`, `npm run game:test:screens` (and `:debug`).
- Lore strong signals: Telegram fetch/regenerate workflows, OCR repost management, hashtag routing, page-image review, character manifests.
- Game strong signals: backpack, inventory, prep screen, artifact card, bag preview, loadout, item caption, replay, shop, season rank, achievement badge.
- Read first:
  - [mushroom-master/AGENTS.md](/Users/microwavedev/workspace/microwave-hub/mushroom-master/AGENTS.md) — the "Surfaces" block at the top tells you which verify command and design-rule section apply.
  - [mushroom-master/README.md](/Users/microwavedev/workspace/microwave-hub/mushroom-master/README.md)

### `microwave-girls`

- Primary role: social cross-posting / scraping service with integrations across multiple networks.
- Strong signals:
  - Twitter scraping or posting
  - Bluesky / atproto posting
  - Discord posting
  - Tumblr posting
  - Telegram bot flows
  - self repost / cross-network repost handling
- Read first:
  - [microwave-girls/package.json](/Users/microwavedev/workspace/microwave-hub/microwave-girls/package.json)
- Useful entry points:
  - `index.ts`
  - `app/`
  - `frontend/`
  - `migrations/`

### `agent-viewer`

- Primary role: local viewer for agent task/session outputs, Codex rollout JSONL, and Claude task outputs.
- Strong signals:
  - agent logs or session viewer
  - Codex sessions
  - rollout JSONL
  - Claude task outputs
- Read first:
  - [agent-viewer/package.json](/Users/microwavedev/workspace/microwave-hub/agent-viewer/package.json)
- Useful entry points:
  - `server.js`
  - `public/`
  - `docs/`

## Ambiguity Rules

- If a request mentions `GeeSome` without more detail:
  - backend/API/IPFS usually means `geesome-node`
  - shared helper code usually means `geesome-libs`
  - frontend package/build usually means `geesome-ui`
  - content/social publishing integrations usually means `geesome-artist`
- If a request mentions Telegram bots:
  - therapy/journal/check-in flows usually mean `psycho-game`
  - moderation/spoiler reposts usually mean `blog-master`
  - lore archiving/OCR/PDF generation usually mean `mushroom-master`
- If a request spans multiple repos, say that explicitly and list the intended order before editing.
