# Fred storyboard demo: Agent workflow v3

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

- The 77-node live draft was saved with no n8n validation warnings. A later local refinement adds an explicit missing-review branch and a no-charge readiness check; this makes the current export 78 nodes and still requires synchronization to the live draft.
- A one-image manual test was started as execution **2024** on 20 October 2026. The host subsequently returned Heroku HTTP 503 and the MCP endpoint disconnected before its result could be inspected. Do not claim this new architecture has passed image generation yet; inspect that execution before starting another paid test.
- Local checks pass for JavaScript syntax, the generated SDK graph, workflow CSV headers/escaping/formula guard, image byte and MIME delivery, status redaction, missing-image handling, duplicate-image guard and the same-workflow tool target. They make no provider calls and do not prove live credentials or model quality.
- The UI defaults to five scenes and permits 1–5 for smaller checks. It polls saved jobs, loads real binary image URLs, supports recovery without starting a new job, saves shared feedback and downloads the workflow's CSV.
- The stable production URL is https://script-to-storyboard-six.vercel.app/. Old deployment-specific URLs remain old snapshots. Verify publication and the current stable deployment before asking the user to generate.
- Google Drive delivery and an editing-team notification remain a later feature. Their UI control is explicitly marked **LATER**. Do not report delivery as working.

## Operational limits

The prototype stores image/reference data in the n8n Jobs Data Table. This is suitable for a small demo, but consumes table quota and execution memory; move image bytes to durable object/Drive storage before regular production use. The public demo routes use random job IDs and no credentials in the frontend. Authentication, rate limits and transactional job locking are required before broad public sharing.

Heroku's recurring outages remain an external availability issue. Do not infer a memory or request-limit cause without logs. The local Heroku CLI is not authenticated, so logs could not be inspected in this session. Vercel's connector lacked deployment permissions, but its authenticated local CLI could access the verified project and create a preview.
