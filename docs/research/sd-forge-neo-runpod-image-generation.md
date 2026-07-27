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
- [Recommended product UI](#recommended-product-ui)
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

Use a persistent RTX 4090 Runpod Pod with:

- Forge Neo;
- an SDXL checkpoint suited to the intended visual style;
- Forge Couple;
- ControlNet OpenPose;
- character LoRAs or a supported reference-image adapter.

Start with Forge Neo's native UI. Measure generation time with the exact
production payload before optimizing infrastructure.

### Production UI

Build a small character-composition frontend with a thin authenticated backend
that translates user-facing controls into Forge API requests. Keep the Forge
native UI available only to administrators for model and workflow tuning.

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
- [Runpod Serverless product and pricing](https://www.runpod.io/product/serverless)
- [Runpod port exposure documentation](https://docs.runpod.io/pods/configuration/expose-ports)
- [Runpod integration overview](https://docs.runpod.io/integrations/overview)
- [Forge Couple](https://github.com/Haoming02/sd-forge-couple)
- [ControlNet WebUI extension](https://github.com/Mikubill/sd-webui-controlnet)
- [SwarmUI](https://github.com/mcmonkeyprojects/SwarmUI)
- [SwarmUI ControlNet documentation](https://github.com/mcmonkeyprojects/SwarmUI/blob/master/docs/Features/ControlNet.md)
- [InvokeAI Canvas Projects](https://invoke.ai/features/canvas/canvas-projects/)
- [Krita AI Diffusion requirements and common issues](https://github.com/Acly/krita-ai-diffusion/wiki/Common-Issues)
