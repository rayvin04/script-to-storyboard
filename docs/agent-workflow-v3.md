# Fred storyboard demo: Agent workflow v3

> Historical design notes. The current implementation is the smaller, stateless **Fred Image Generation - Stage 1** workflow, ID **QRPeaK5ayX9ZC5Zx**, documented in [its folder](../workflows/fred-image-generation-stage-1/README.md). Stage 1 has eight nodes, generates one image per request, uses the actual Drive character and room images as references, and has no n8n storage nodes. Manual execution 2340 returned a PNG at a reported provider cost of $0.028384. The old 79-node workflow is preserved separately as inactive **Script to Image Paid Demo - Reference Backup**, ID **wGOMRtREoqFDUgqj**. The details below describe the earlier, complex architecture and should not be treated as the live workflow.

## What matters most

Fred's latest direction is to prioritize his drawing style and his scene/animation language over UI polish. A five-scene demo should cover a short continuous passage using the visual beats found in his CSVs. Do not summarize an entire long script into five generic illustrations. Preserve the character, clothes, important prop and room between related shots; change the shot or explanatory visual only when the narration advances.

## One workflow

Workflow ID: `rV2JjknCieGGXRNL` — **Script to Image Paid Demo**.

All routes and the Agent's image tool live in that workflow. The image tool calls the same workflow through its single Execute Sub-workflow Trigger, which enters the image-only branch. It never re-enters the planning branch.

| Route | Purpose |
| --- | --- |
| `POST /webhook/script-to-storyboard` | Accept a job, return HTTP 202, then plan and generate in the background. |
| `GET /webhook/script-to-storyboard-status?requestId=…` | Return progress, complete scene metadata and image URLs without base64. |
| `GET /webhook/script-to-storyboard-image?requestId=…&sceneId=…` | Return actual saved JPEG/PNG bytes. |
| `POST /webhook/script-to-storyboard-feedback` | Save a rating and optional comment to the shared review table. |
| `GET /webhook/script-to-storyboard-csv?requestId=…` | Generate and return Fred's eight-column storyboard CSV inside n8n. |

The status route accepts the reserved `__capability_probe__` ID as a no-charge version check. The UI checks for `fred-visual-v3` before it submits any generation request, so an older active workflow cannot accidentally consume image credits through the new UI.

## Actual visual references

Approved folder: https://drive.google.com/drive/folders/1KLTxXSsptR9OguL30DCBLX72GX2rtUBo

- `1B8FZJvtx2udKt-WHK_WlLF5RmWCl6hE4` — **normal man.png**. Brown skin, a large rounded head, narrow white eyes, tiny pupils, a dark green body/shirt and very thin black limbs.
- `19_rZZhpt3du495njrjnO5nuPWQjxnMAQ` — the supplied yellow living room. Flat yellow walls, green sofa, blue window accents, simple perspective and rough black outlines.

These were visually inspected in Drive. The workflow downloads the actual image binaries through its saved Google Drive credential. It attaches those binaries to the planning Agent, stores their data URLs in the job, and supplies those actual bytes through `input_references` to every Flare call. A folder link in a text prompt does not give an image model the contents of that folder.

The casual green-shirt character and the cream-faced professor host are different identities. Do not give the casual character the host's glasses or suit. The current two-image set anchors the casual character and room; a dedicated approved host reference remains a useful next refinement for host-heavy scripts.

## Agents and models

1. **Plan Storyboard Scenes** studies the two visual references, calls **Fred Style Reference Search** and **Read Saved Art Reviews**, and outputs the CSV scene contract through **Storyboard JSON Parser**.
2. **Direct Scene Art** runs once per scene. It reads style guidance/reviews and calls **Generate Fred Scene Image** once.
3. **Generate Fred Scene Image** is a connected Workflow Tool pointing at the SAME workflow. Its image-only entry branch attaches the actual reference pixels and calls OpenRouter's dedicated Images API with `openai/gpt-image-2.5-flare`, `quality: low`, `n: 1`, and 16:9 output.
4. **Format Scene Result** exposes a real image binary named `data` in n8n, saves image bytes/metadata, and returns a small receipt to the Agent. Base64 is never returned as tool text to the reasoning model.

The reasoning Agents use the existing Vercel text model. OpenRouter's saved image credential is used for images only. Flare is not a tool-calling chat model; putting its name into an OpenRouter Chat Model expression does not change that node's API endpoint. Rayvin explicitly approved the Agent + connected Flare image-tool approach.

The generator requests JPEG compression to reduce transport and execution memory; it preserves the provider's actual returned MIME type and also supports PNG responses. No automatic image retries or regeneration loops are enabled. A saved generation-attempt flag prevents a repeated tool call from generating an already-attempted scene again. Reusing an existing job ID returns that job instead of overwriting it. This demo assumes serial scene processing; strict concurrent-request locking needs a database transaction/unique constraint before production scale.

## Shared reviews

Ratings and comments are upserted in **Storyboard Feedback** (`D4tarkv0790tfani`) with a job/scene key. Both Agents have a read-only Data Table tool that can retrieve the latest 20 reviews. Reviews are untrusted preferences, not instructions. They can guide later prompts, but they do not train the model or guarantee a match. Fred's visual review is the quality gate.

## CSV download is built in n8n

**Storyboard CSV Webhook → Read Storyboard for CSV → Create Fred Storyboard CSV → CSV Is Available? → Download Storyboard CSV**.

The CSV has these columns in this exact order: `Scene`, `Timestamp`, `Voiceover`, `What's happening`, `Background`, `Hand-drawn characters & props`, `On-screen text`, `Transitions/Motion`.

It exports the scene plan even if some images are pending or failed. Unknown timings, overlay text and transitions remain blank for script-only input. Commas, quotes and line breaks are CSV-escaped; UTF-8 BOM supports Excel; cells that could be spreadsheet formulas are neutralized. The UI downloads the binary produced by these nodes; it does not independently invent or rebuild the CSV.

## Verification and deployment status

### Hosting incident: 20 October 2026

Heroku's web-process logs confirm earlier `R15 (Memory quota vastly exceeded)` crashes, exit status 137, and a transition from up to crashed. The user approved the memory-setting changes below and the dyno restart. The user also approved temporarily deactivating the unrelated **Multi-Platform Content Generation & Scheduling System** (`l8fjcomB8Wd58hBx`). n8n now reports it inactive. The failed attempt to unregister its old webhook was caused by its missing `n8n-nodes-tareno.tareno` community node; after the approved restart, the startup log did not list that workflow among reactivated workflows.

The first approved values, `NODE_OPTIONS=--max-old-space-size=256`, `N8N_RUNNERS_MAX_OLD_SPACE_SIZE=128`, and `N8N_RUNNERS_MAX_CONCURRENCY=1`, caused Node to reach about 247 MB and fail with `JavaScript heap out of memory` during startup (exit status 134). The user then approved `NODE_OPTIONS=--max-old-space-size=320`, `N8N_RUNNERS_MAX_OLD_SPACE_SIZE=64`, and `N8N_RUNNERS_MAX_CONCURRENCY=1`. After restart, Heroku logged n8n ready. Memory peaked at 669 MB (130.9% of the 512 MB quota), then settled around 529–554 MB with recurring `R14 (Memory quota exceeded)` entries. The user then approved temporarily deactivating ten additional workflows. During the one-scene production attempt on 20 October, Heroku logged 564 MB (106.7%) and R14; two seconds after n8n returned HTTP 202, Node logged `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory` and exited with status 134. Heroku returned H18/503 during the process interruption. n8n later recovered, but subsequent samples remained 544–571 MB (103–108.5%) with R14. Eleven non-storyboard workflows are temporarily inactive; ten workflows remain active, including **Script to Image Paid Demo**. No hosting plan or billing changes have been made.

The earlier approved test execution **2024** is recorded as `crashed` by n8n, with no node run data available through MCP. The later one-scene test is execution **2026**: its production webhook returned HTTP 202 and created the initial job record, but n8n marked the execution `crashed` at `2026-10-20T02:49:43.647Z`; MCP has no node run data. Heroku's fatal heap-limit log confirms a process-level out-of-memory termination immediately after acceptance. No completed scene or Flare response was saved, so generation is unverified and no cost should be inferred from this run. Do not submit another paid generation while the 512 MB dyno continues exceeding quota.

- The current live workflow has 78 nodes. Its saved draft is `versionId=ba0c9c07-17fb-48ff-88fd-797172df6b6e`; the published production version remains `activeVersionId=f2f30d57-ea8e-4a10-a158-be480b2dce72`. They are distinct versions. Verify the draft changes and publish the intended version after the host is stable; do not describe the current draft as production. The published version's no-charge capability probe returned the expected Fred workflow version, five-scene cap, CSV route, and two attached reference images.
- Before publication, a no-charge readiness probe returned HTTP 404 because the older published version had no registered status webhook. After publication, the same probe returned `{"workflowVersion":"fred-visual-v3","maxScenes":5,"csvInWorkflow":true,"actualImageReferences":2}`. This verifies the new production status endpoint; it does not verify a paid image call or the UI's full image-display path.
- Local checks pass for CSV headers/escaping/formula guard, image byte and MIME delivery, status redaction, missing-image handling, duplicate-image guard and the same-workflow tool target. These make no provider calls and do not prove live credentials or image quality.
- The UI defaults to five scenes and permits 1–5 for smaller checks. It polls saved jobs, loads real binary image URLs, supports recovery without starting a new job, saves shared feedback and downloads the workflow's CSV.
- The stable production URL is https://script-to-storyboard-six.vercel.app/. It currently reports a 40,000-character limit and throws `The workflow response did not include a scenes array.` after n8n returns its HTTP 202 job receipt. This is a UI/workflow contract mismatch: production UI expects a synchronous scenes response. The current `codex/fred-csv-references` preview at https://script-to-storyboard-ir7g8w9kc-rayvin-gianan-s-projects.vercel.app/ contains the newer 30,000-character UI with async job polling, while stable production remains on an older `main` build. Do not describe the stable UI as connected correctly until the release is aligned; the newer UI also cannot complete while n8n crashes.
- Google Drive delivery and an editing-team notification remain a later feature. Their UI control is explicitly marked **LATER**. Do not report delivery as working.

## Operational limits

The prototype stores image/reference data in the n8n Jobs Data Table. This is suitable for a small demo, but consumes table quota and execution memory; move image bytes to durable object/Drive storage before regular production use. The public demo routes use random job IDs and no credentials in the frontend. Authentication, rate limits and transactional job locking are required before broad public sharing.

The Heroku dyno is configured for a 512 MB memory quota and has repeatedly exceeded it. Avoid another paid generation while memory remains above quota. Adding memory by upgrading the dyno would incur a hosting cost and has not been authorized. The user-approved temporary pauses are: **Multi-Platform Content Generation & Scheduling System** (`l8fjcomB8Wd58hBx`), both **AI Sentiment Analysis & Customer Feedback Response System** workflows (`QRDzxgFMvDvQIIBh`, `kTsPCBpqHq4N0yPH`), **HubSpot Lead Classification & Automated Nurture System** (`BNq6kejhSQSPI6z8`), **Detailed Prompt Generator - Agamemnon** (`ltCTmyVu9BXGBnmV`), **Interview Questionnaire** (`2aCMGu0DVeoqCUdy`), **Monthly Intelligent HR Report & Analytics System** (`P1XBuABgVxdscIP3`), **Survey Questionnaire** (`5YEJPXzOG3EXfLpV`), **Employee Onboarding & Engagement System** (`WcfosCInXXJ4ioau`), **Multi-Agent Project Management System** (`6AUt6prd9OoCYLRM`), and **Shop Floor Agent** (`OtjVLTkOY3d1g3vh`). Their schedules and webhook triggers remain paused until reactivated. The missing Tareno community node still prevents clean webhook removal for Multi-Platform.

