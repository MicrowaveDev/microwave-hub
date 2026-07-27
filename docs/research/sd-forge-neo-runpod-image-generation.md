# SD WebUI Forge Neo on Runpod: API, Cost, Latency, and UI Research

Last reviewed: 2026-07-27

## Contents

- [Summary](#summary)
- [Can Forge Neo run as an API on Runpod?](#can-forge-neo-run-as-an-api-on-runpod)
- [Deployment choices](#deployment-choices)
- [Current cost model](#current-cost-model)
- [Expected generation time and cost](#expected-generation-time-and-cost)
- [Cold starts and hidden costs](#cold-starts-and-hidden-costs)
- [UI options](#ui-options)
- [Recommended character-composition workflow](#recommended-character-composition-workflow)
- [Checkpoint and LoRA support](#checkpoint-and-lora-support)
- [Microwave Girls generation workflow](#microwave-girls-generation-workflow)
- [Recommended product UI](#recommended-product-ui)
- [Adult-content and provider restrictions](#adult-content-and-provider-restrictions)
- [Runpod monitoring and enforcement surfaces](#runpod-monitoring-and-enforcement-surfaces)
- [Security and operational constraints](#security-and-operational-constraints)
- [Recommendation](#recommendation)
- [Sources](#sources)

## Summary

SD WebUI Forge Neo can run on a Runpod GPU and expose an
Automatic1111-compatible HTTP API. The lowest-effort setup is a persistent
Runpod Pod running Forge Neo with `--api`. Runpod Serverless is possible, but
requires a custom container/worker and careful model caching to prevent startup
and model-loading time from dominating latency and cost.

For a warm RTX 4090 worker generating a normal 1024×1024 SDXL image, a useful
planning estimate is:

- approximately 3–10 seconds per image;
- approximately $0.001–$0.003 per image;
- approximately $1–$3 per 1,000 images.

These figures are estimates, not guaranteed Forge Neo benchmarks. The actual
result depends on the checkpoint, sampler, number of steps, resolution,
attention implementation, LoRAs, ControlNet, upscaling, and whether weights
must be moved between VRAM and system RAM.

For controlled scenes with multiple characters, the simplest Forge-based
workflow is:

- Forge Neo's native browser UI;
- Forge Couple for separate character regions and prompts;
- ControlNet OpenPose for pose and composition;
- LoRA or IP-Adapter for character identity;
- inpainting for selective corrections.

There is an important provider-policy blocker for sexually explicit generation:
Runpod's Terms of Service currently identify pornography and graphic adult
content as unauthorized. Forge can technically run adult-capable models, but
that does not make an explicit workload permissible on Runpod. Written
confirmation from Runpod is required before choosing it for that use case.

## Can Forge Neo run as an API on Runpod?

Yes. Forge Neo documents the `--api` command-line option. It inherits the
common Automatic1111 API, including endpoints such as:

- `POST /sdapi/v1/txt2img`
- `POST /sdapi/v1/img2img`
- `GET /sdapi/v1/options`
- `POST /sdapi/v1/options`

The exact API schema exposed by a running installation is available at its
`/docs` route.

Example startup command:

```bash
python launch.py \
  --listen \
  --port 7860 \
  --api \
  --api-auth username:strong-password
```

If port `7860` is exposed through the Runpod HTTP proxy, the URLs are:

```text
UI:  https://POD_ID-7860.proxy.runpod.net/
API: https://POD_ID-7860.proxy.runpod.net/sdapi/v1/txt2img
Docs: https://POD_ID-7860.proxy.runpod.net/docs
```

Example request:

```bash
curl -u username:strong-password \
  -X POST \
  "https://POD_ID-7860.proxy.runpod.net/sdapi/v1/txt2img" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "cinematic photograph of a futuristic Lisbon",
    "negative_prompt": "blurry, low quality",
    "width": 1024,
    "height": 1024,
    "steps": 20,
    "cfg_scale": 6,
    "sampler_name": "DPM++ 2M"
  }'
```

The response contains generated images encoded as base64 strings.

## Deployment choices

### Persistent Runpod Pod

This is the easiest deployment for Forge Neo:

- run the normal Forge application;
- expose its UI and REST API on port `7860`;
- keep the checkpoint loaded in VRAM between requests;
- pay for the entire time the Pod is running, including idle time.

This option is best for experimentation, interactive use, regular traffic, or
long editing sessions.

### Runpod Serverless

Serverless can scale workers down when there is no traffic and bills GPU worker
time by the second. Forge Neo must be packaged into a custom container and
wrapped in a Runpod worker contract.

This option is best for intermittent or bursty API traffic, provided that:

- the model is included in the container or available from fast persistent
  storage;
- the worker does not download the checkpoint for every cold start;
- initialization and model loading are measured as part of billed time;
- long jobs use asynchronous submission and polling.

Forge Neo is primarily designed as a persistent WebUI application. A dedicated
inference worker based on ComfyUI or Diffusers may be operationally simpler for
a serverless-only production service.

## Current cost model

Runpod's public Serverless page currently lists these representative prices:

| GPU class | Price per hour | Approximate price per second |
| --- | ---: | ---: |
| 16 GB A4000 class | $0.58 | $0.000161 |
| 24 GB L4/A5000/3090 class | $0.69 | $0.000192 |
| 24 GB RTX 4090 | $1.10 | $0.000306 |

Use the current Runpod console price when making a purchase decision because
availability, GPU classes, and prices can change.

The basic calculation is:

```text
cost per image = GPU price per hour × billed seconds / 3600
```

For example, six billed seconds on an RTX 4090 at $1.10 per hour:

```text
$1.10 × 6 / 3600 = $0.001833...
```

That equals:

- **$0.00183 per image**
- **0.183 cents per image**
- approximately **1.83 cents for 10 images**
- approximately **$1.83 for 1,000 images**

The unit distinction is important:

```text
0.18 cents = $0.0018
18 cents   = $0.18
```

Ten images would cost approximately $1.80 only if each image cost $0.18, or
18 cents.

## Expected generation time and cost

The following are planning ranges for a **warm RTX 4090 worker** at $1.10 per
hour. They should be replaced by measurements from the selected checkpoint and
production payload.

| Model and settings | Estimated generation time | Estimated compute cost |
| --- | ---: | ---: |
| SD 1.5, 512×512, 20 steps | 1–2 sec | $0.0003–$0.0006 |
| SDXL, 1024×1024, 20–30 steps | 3–7 sec | $0.0009–$0.0021 |
| FLUX Schnell, 1024×1024, 4 steps | 3–8 sec | $0.0009–$0.0024 |
| FLUX Dev, 1024×1024, 20–30 steps | 15–35 sec | $0.0046–$0.0107 |
| SDXL with hires fix or upscaling | 10–30 sec | $0.0031–$0.0092 |

Cost examples at $1.10 per GPU-hour:

| Total billed time | Approximate cost |
| ---: | ---: |
| 1 sec | $0.00031 |
| 3 sec | $0.00092 |
| 6 sec | $0.00183 |
| 10 sec | $0.00306 |
| 30 sec | $0.00917 |
| 60 sec | $0.01833 |

ControlNet, multiple ControlNets, high-resolution fixes, face correction,
upscaling, and partial weight offloading can materially increase these times.

## Cold starts and hidden costs

A warm generation time is not the same as end-to-end serverless latency. A
cold worker may also need to:

1. start the container;
2. initialize Python, PyTorch, and Forge;
3. obtain or mount the checkpoint and auxiliary models;
4. load weights into VRAM;
5. compile or warm optimized kernels;
6. run the requested generation;
7. encode and upload the result.

With a cached model and prepared container, a first request might take roughly
15–60 seconds end to end. Downloading a multi-gigabyte checkpoint during worker
startup can push latency into minutes.

Additional costs can include:

- persistent or network storage;
- container image storage and transfer;
- idle time on a persistent Pod;
- billed startup/model-loading time on Serverless;
- generation retries;
- image output storage;
- preprocessing and postprocessing.

The per-image estimates above therefore describe compute for a warm request,
not a guaranteed final invoice.

## UI options

### Forge Neo native UI

This is the recommended starting point when retaining Forge as the backend.
Opening the Runpod proxy root URL exposes the same Forge UI used locally. It
provides the broadest compatibility with Forge settings and extensions because
the UI and backend run together.

Advantages:

- no separate frontend deployment;
- full access to Forge-specific controls;
- direct compatibility with extensions;
- suitable for interactive experimentation.

Disadvantages:

- dense and technical interface;
- not optimized around a simple character-composition workflow;
- exposes many controls that normal users do not need.

### SwarmUI

SwarmUI offers a cleaner general-purpose image-generation interface and has an
option for an Automatic1111 backend. However, its strongest advanced support,
including native ControlNet integration, is built around its ComfyUI backend.
Forge extension compatibility should be tested rather than assumed.

Use SwarmUI when a cleaner general interface is more important than complete
Forge extension compatibility. Prefer its ComfyUI backend for advanced
workflows.

### InvokeAI

InvokeAI has a strong layered canvas with:

- raster layers;
- regional guidance;
- reference images;
- control layers;
- inpainting masks;
- saved canvas projects.

It is well suited to visually arranging several characters, but it uses its own
backend. It is not a drop-in UI for a remote Forge API.

### Krita AI Diffusion

Krita with the AI Diffusion plugin provides a familiar painting and
compositing interface. It is useful when manual painting, masking, layout, and
AI generation should coexist. The plugin relies on ComfyUI rather than Forge,
so choosing it means changing the backend architecture.

### Custom focused UI

A custom UI is the best eventual option if non-technical users need a simple
product rather than a general diffusion workbench. The browser should call an
application server, which then validates and translates requests for Forge.

This is more work initially, but it can expose only the concepts the workflow
needs: background, character, identity, pose, region, and variations.

## Recommended character-composition workflow

### Separate character prompts with Forge Couple

Forge Couple applies different prompt conditioning to different regions,
reducing color, clothing, and identity leakage between subjects. It supports:

- horizontal or vertical divisions;
- advanced region layouts;
- manually painted masks;
- a global/background prompt;
- shared prompt fragments;
- API use.

At the time of review, its documented model support is SD 1.x, SDXL, and Anima.
This limitation matters when selecting FLUX, Qwen Image, or other newer model
families.

Conceptual prompt:

```text
cinematic forest clearing at sunset, painterly fantasy style
two characters, woman on the left, red jacket, short black hair
two characters, man on the right, blue coat, blond hair
```

The first line can act as the global background/style prompt and subsequent
lines can be assigned to separate regions.

### Control poses with ControlNet OpenPose

An OpenPose conditioning image can specify body position. A single pose image
can contain more than one skeleton, allowing the overall interaction and
spacing between several characters to be controlled.

ControlNet can be used through the WebUI and API. API calls generally send
extension data through `alwayson_scripts`, and the exact schema should be
checked against the running Forge `/docs` endpoint and the installed extension
version.

### Preserve character identity

Possible identity mechanisms include:

- a trained character LoRA;
- an IP-Adapter/reference-image workflow;
- face-specific adapters where supported by the selected model;
- a fixed checkpoint, prompt template, and seed family.

Regional prompts alone separate descriptions but do not guarantee consistent
identity across unrelated generations.

### Build or control the background

Possible approaches, from simplest to most controlled:

1. describe the background in the global prompt;
2. use a background reference with img2img or a compatible image adapter;
3. generate the background first, then add characters by inpainting;
4. composite rough character silhouettes over the background and run img2img;
5. preserve the background while selectively regenerating character masks.

For strong art direction, generating the background first and adding or
correcting characters through masks is usually more reliable than asking one
text-to-image pass to solve every detail.

## Checkpoint and LoRA support

Forge Neo's Automatic1111-compatible API supports ordinary checkpoint and LoRA
use well.

### Responsibilities

A checkpoint is the main image model. It defines the base architecture,
capabilities, and much of the visual behavior. A generation attempt normally
uses one checkpoint.

A LoRA is a smaller adapter applied on top of a compatible checkpoint. Common
roles include:

- recurring character identity;
- clothing or costume;
- visual style;
- location or background;
- expression, action, or other learned concept.

Pose should normally use ControlNet OpenPose when exact positioning matters. A
pose LoRA is less exact and is better treated as a learned concept or stylistic
preference.

### Storage

Default Forge locations are:

```text
models/Stable-diffusion/   # checkpoints
models/Lora/               # LoRAs
```

Forge also accepts model-directory command-line options and a central
`--model-ref` hierarchy. On Runpod, model files should live in a persistent
volume, prepared container, or other cached location. Downloading a
multi-gigabyte checkpoint during every serverless cold start would make latency
and cost unpredictable.

Example:

```bash
python launch.py \
  --api \
  --listen \
  --port 7860 \
  --ckpt-dir /runpod-volume/models/checkpoints \
  --lora-dir /runpod-volume/models/loras
```

Only an administrator should install model files. The product UI should select
registered model IDs rather than accept arbitrary download URLs.

### API operations

The relevant Automatic1111-style routes normally include:

```text
GET  /sdapi/v1/sd-models
GET  /sdapi/v1/loras
POST /sdapi/v1/refresh-checkpoints
POST /sdapi/v1/refresh-loras
```

The running Forge installation's `/docs` route remains the definitive contract
for the deployed version.

A checkpoint can be selected for a request using
`override_settings.sd_model_checkpoint`. LoRAs are activated in the positive
prompt using `<lora:filename:weight>`.

```json
{
  "prompt": "adult fictional woman, mw_mira, red jacket, <lora:mira_character_v2:0.85>, <lora:editorial_comic_style:0.35>",
  "negative_prompt": "low quality, malformed anatomy, duplicate person",
  "width": 1024,
  "height": 1024,
  "steps": 24,
  "cfg_scale": 6,
  "sampler_name": "DPM++ 2M",
  "seed": 123456,
  "override_settings": {
    "sd_model_checkpoint": "illustrationXL_v20.safetensors"
  },
  "override_settings_restore_afterwards": true
}
```

### Compatibility

Checkpoint, LoRA, and ControlNet architectures must match:

```text
SD 1.5 checkpoint
└── SD 1.5 LoRAs
    └── SD 1.5 ControlNet

SDXL checkpoint
└── SDXL LoRAs
    └── SDXL ControlNet
```

The same principle applies to Anima, FLUX, Qwen Image, and other architectures.
Microwave Girls should reject incompatible combinations before submitting a
GPU job.

### Checkpoint concurrency

Checkpoint selection is effectively global worker state. Concurrent requests
that try to select different checkpoints can interfere with one another.
Generation jobs should therefore be grouped by checkpoint where practical:

```text
Load Editorial SDXL
├── generate shots 1–20
└── generate repairs 3 and 8

Switch to Anime SDXL
└── generate shots 21–30
```

LoRA changes are comparatively lightweight and can normally vary per request.

### Multiple characters

Multiple character LoRAs can be enabled in one prompt, but their attributes may
bleed across subjects. Forge Couple separates regional prompt conditioning, yet
its documentation cautions that different LoRAs in different regions still
depend on how well the concepts work together.

Recommended escalation:

1. use separate character LoRAs with Forge Couple regions;
2. use unique trigger words and visually distinct descriptions;
3. reduce competing LoRA strengths;
4. use OpenPose to keep characters spatially distinct;
5. generate the scene and inpaint each important character separately;
6. train a joint multi-character LoRA with distinct tokens when the same cast
   repeatedly appears together.

Every generation attempt should store the checkpoint name and hash, LoRA names
and hashes, weights, prompt, seed, sampler, steps, extension versions, and
output. Model files and their licenses must be reviewed separately; the Forge
license does not grant rights to third-party checkpoints or training data.

## Microwave Girls generation workflow

The intended product flow is:

```text
Creative brief
    ↓
Grok structured shot plan
    ↓
Artist edits plan and confirms estimated spend
    ↓
Durable Forge/Runpod generation queue
    ↓
Review, approve, reject, regenerate, or inpaint
    ↓
Import approved outputs into the Media Catalog
    ↓
Existing editing, scheduling, and publishing flow
```

Grok should return a provider-neutral structured plan rather than a single
free-form diffusion prompt. The server should compile that plan into Forge
parameters.

Suggested hierarchy:

1. **Project:** creative brief, global style, characters, backgrounds, and
   default checkpoint.
2. **Shot:** composition, pose, camera, prompt additions, and desired variation
   count.
3. **Attempt:** immutable checkpoint, LoRA, ControlNet, seed, prompt, cost,
   latency, provider job ID, output, and review status.

Regeneration creates a new attempt linked to the original rather than
overwriting evidence:

```text
shot-03
├── attempt-1 — rejected: wrong pose
├── attempt-2 — rejected: identity drift
└── attempt-3 — approved
```

The UI should distinguish:

- new seed variation;
- edited prompt;
- corrected OpenPose input;
- stronger or different identity reference;
- lower-denoising img2img;
- selected-region inpainting;
- more variations based on an approved attempt.

For batches of 10–20 images, and especially a future limit of 100, generation
must use a persistent asynchronous queue. A browser request must not own the
job lifecycle. Required properties include idempotency, concurrency control,
cancellation, progress polling or events, spend limits, infrastructure retry
rules, and provider job recovery.

The Grok planner must select only checkpoint and LoRA registry IDs supplied by
the server. It must not invent model filenames, weights, or download sources.
The local compiler resolves safe model IDs to Forge filenames and trigger
syntax.

Suggested registry fields include:

- stable internal ID and display label;
- checkpoint or LoRA type;
- architecture;
- Forge filename and cryptographic hash;
- category such as character, style, costume, or background;
- trigger words and recommended weight range;
- compatible checkpoint IDs;
- preview images;
- source, license, and commercial-use status;
- enabled or disabled status.

## Recommended product UI

A focused application could use this structure:

```text
┌─────────────────────────────────────────┐
│ Background                              │
│ Prompt · Reference image · Style        │
├───────────────────┬─────────────────────┤
│ Character 1       │ Character 2         │
│ Reference image   │ Reference image     │
│ Description       │ Description         │
│ Pose image        │ Pose image          │
│ Region/mask       │ Region/mask         │
│ Character LoRA    │ Character LoRA      │
├───────────────────┴─────────────────────┤
│ Composition canvas                      │
│ Drag characters and resize regions      │
├─────────────────────────────────────────┤
│ Generate 4 variations · Advanced ▾      │
└─────────────────────────────────────────┘
```

Suggested mapping:

| Product control | Forge mechanism |
| --- | --- |
| Background description | Global prompt |
| Background reference | img2img or compatible image adapter |
| Character description | Forge Couple regional prompt |
| Character position | Forge Couple region or mask |
| Character pose | ControlNet OpenPose |
| Consistent identity | Character LoRA or IP-Adapter |
| Correct one character | `img2img` inpainting |
| Generate alternatives | Seed and batch parameters |

Sampler, scheduler, CFG, denoising, extension weights, and model-loading details
can live inside an optional Advanced panel.

## Adult-content and provider restrictions

### Forge is technically capable but does not supply models

Forge Neo does not include a hosted checkpoint or LoRA catalog. It uses whatever
compatible files the operator installs. An adult-capable checkpoint or LoRA
can therefore work technically through the ordinary API. Forge generally does
not provide a central prompt/output moderation service for a self-hosted
installation.

Technical capability does not establish permission. The operator must
separately satisfy:

- infrastructure-provider terms;
- checkpoint and LoRA licenses;
- training-data and likeness rights;
- applicable law;
- storage-provider policies;
- destination social-network policies.

### Runpod restriction

Runpod's Terms of Service, last updated March 24, 2026, identify pornography
and graphic adult content, images, and adult products as unauthorized content.
The same terms reserve account suspension or termination as possible
consequences.

This creates a material deployment blocker:

| Intended content | Runpod assessment |
| --- | --- |
| Swimsuit, glamour, or suggestive posing | Wording is unclear; obtain written confirmation |
| Artistic nudity | Wording is unclear; obtain written confirmation |
| Explicit fictional adult sexual content | Terms appear to prohibit it |
| Pornographic output | Terms explicitly prohibit it |
| Sexual content involving a minor or ambiguous age | Absolutely prohibited |
| Sexualized identifiable real person | Do not support; severe consent, policy, and legal risk |

A private Pod and absence of a technical refusal do not change the contractual
restriction. If explicit generation is central, obtain a precise written
answer from Runpod before implementation or choose infrastructure whose terms
expressly permit the intended lawful workload.

### Grok and OpenRouter

Grok prompt planning is a separate provider boundary. xAI's current Acceptable
Use Policy prohibits, among other things:

- sexualizing or exploiting children;
- nudifying real people;
- altering a real person's likeness into an intimate or sexual context;
- depicting a person's likeness pornographically;
- illegal content and attempts to bypass safeguards.

OpenRouter or the selected provider may return moderation errors, including
HTTP `403`. Provider refusal should be treated as a normal, non-retriable
result. The application must not rewrite prompts for the purpose of bypassing
provider safeguards.

### Product restrictions

For a sexualized generation workflow, Microwave Girls should require:

1. fictional characters only;
2. explicit adult confirmation for every character;
3. rejection of unknown, ambiguous, or youth-coded age;
4. no sexualized real-person references or identity LoRAs;
5. private storage for unreviewed and rejected output;
6. human approval before import into the publishable Media Catalog;
7. no automatic publishing;
8. model license and source records;
9. immutable prompt/model/seed/audit metadata;
10. destination-specific policy checks before publishing.

Example trusted character record:

```json
{
  "id": "mira",
  "fictional": true,
  "adultConfirmed": true,
  "agePresentation": "adult",
  "sexualGenerationAllowed": true,
  "realPersonReference": false,
  "loraId": "character-mira-v2"
}
```

The server, not Grok, must validate this contract before accepting a generation
job.

## Runpod monitoring and enforcement surfaces

Runpod does not publicly document a classifier that inspects every prompt and
generated image. Its Terms say that it does not actively monitor hosted
content, while also reserving the right to:

- electronically monitor its network;
- access, store, process, and use customer content;
- investigate complaints;
- institute filters or other abuse-prevention mechanisms;
- disclose content or records for legal or governmental requests;
- restrict or terminate service after suspected violations.

Documented and plausible compliance surfaces include:

1. **Public endpoints and complaints.** A publicly exposed Forge UI, API,
   gallery, output URL, or published site can be reported.
2. **Serverless logs.** Runpod automatically collects worker stdout, stderr,
   lifecycle messages, and request history. Its documentation states that
   centralized endpoint logs are retained for 90 days. Prompts, filenames,
   model names, or output URLs can be exposed if the application logs them.
3. **Network and abuse monitoring.** The terms reserve electronic network
   monitoring and filters, but do not disclose their implementation.
4. **Stored content.** Generated images, thumbnails, metadata, and model files
   may be present on Pod disks or network volumes.
5. **Support and infrastructure investigation.** Screenshots, crash reports,
   support tickets, or operational access may disclose the workload.
6. **External reports and legal notices.** Reports from users, rights holders,
   depicted individuals, publishers, or authorities may lead back to the
   generating service.
7. **Operational metadata.** Endpoint names, container metadata, traffic
   patterns, and application logs may reveal a workload even when individual
   image bytes are not proactively classified. This is an inference, not a
   documented Runpod detection method.

Runpod's Privacy Policy additionally describes processing user-generated
content and metadata and using information to prevent, identify, investigate,
and deter harmful, unauthorized, unethical, or illegal activity.

It is not possible to establish the provider's exact detection implementation
from public documentation. Disabling logs or keeping a Pod private is good data
hygiene but is not a compliance mechanism and must not be treated as a way to
evade provider enforcement.

## Security and operational constraints

- Do not expose Forge publicly without authentication.
- Do not put Runpod or Forge credentials into public browser JavaScript.
- Place a small application server between the custom UI and Forge.
- Validate dimensions, steps, batch size, model selection, and extension
  parameters to prevent unbounded GPU jobs.
- Add rate limits and per-user quotas.
- Runpod's HTTP proxy documentation notes a 100-second request timeout. Use
  background jobs and polling for operations that can exceed it.
- Store outputs outside the temporary worker filesystem if they must survive
  worker replacement.
- Confirm checkpoint and model licenses before commercial deployment. Running
  open software does not automatically grant commercial rights to every model
  loaded into it.

## Recommendation

### Immediate prototype

For non-explicit content, use a persistent RTX 4090 Runpod Pod with:

- Forge Neo;
- an SDXL checkpoint suited to the intended visual style;
- Forge Couple;
- ControlNet OpenPose;
- character LoRAs or a supported reference-image adapter.

Start with Forge Neo's native UI. Measure generation time with the exact
production payload before optimizing infrastructure.

For sexually explicit content, do not proceed with Runpod on the assumption
that private compute is permitted. Resolve the provider-policy blocker first.

### Production UI

Build a small character-composition frontend with a thin authenticated backend
that translates user-facing controls into Forge API requests. Keep the Forge
native UI available only to administrators for model and workflow tuning.

Use a provider-neutral generation adapter so the hosting backend can change
without changing the project, shot, attempt, review, or publishing model.

### When to choose ComfyUI instead

Use ComfyUI as the Runpod backend when:

- newer FLUX, Qwen Image, or specialized workflows are central;
- exact node-level workflow composition is required;
- SwarmUI or Krita will be the main interface;
- Forge Couple's model limitations block the selected model;
- serverless execution is more important than preserving Forge compatibility.

## Sources

Primary and project documentation reviewed:

- [Forge Neo README](https://github.com/Haoming02/sd-webui-forge-classic/blob/neo/README.md)
- [Automatic1111 API guide](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/API)
- [Automatic1111 command-line arguments](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Command-Line-Arguments-and-Settings)
- [Automatic1111 extra-network and LoRA documentation](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/features)
- [Runpod Serverless product and pricing](https://www.runpod.io/product/serverless)
- [Runpod port exposure documentation](https://docs.runpod.io/pods/configuration/expose-ports)
- [Runpod integration overview](https://docs.runpod.io/integrations/overview)
- [Runpod Terms of Service](https://www.runpod.io/legal/terms-of-service)
- [Runpod Privacy Policy](https://www.runpod.io/legal/privacy-policy)
- [Runpod Serverless logging documentation](https://docs.runpod.io/serverless/development/logs)
- [Forge Couple](https://github.com/Haoming02/sd-forge-couple)
- [ControlNet WebUI extension](https://github.com/Mikubill/sd-webui-controlnet)
- [xAI Acceptable Use Policy](https://x.ai/legal/acceptable-use-policy)
- [xAI non-consensual intimate content policy](https://x.ai/legal/help-center/non-consensual-intimate-content)
- [OpenRouter moderation errors](https://openrouter.ai/docs/api/reference/errors-and-debugging)
- [SwarmUI](https://github.com/mcmonkeyprojects/SwarmUI)
- [SwarmUI ControlNet documentation](https://github.com/mcmonkeyprojects/SwarmUI/blob/master/docs/Features/ControlNet.md)
- [InvokeAI Canvas Projects](https://invoke.ai/features/canvas/canvas-projects/)
- [Krita AI Diffusion requirements and common issues](https://github.com/Acly/krita-ai-diffusion/wiki/Common-Issues)
