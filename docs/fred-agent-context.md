# Agent Context — Fred’s Script-to-Backgrounds Demo

Updated 20 October 2026. This is the current implementation brief for agents working in this repository. It replaces the older multi-route, job-storage architecture. Pair it with [`fred-style-guide.md`](fred-style-guide.md) for the source analysis.

## Product contract

- The user pastes **one complete narration script once**. They do not write a separate prompt for each image.
- The text planner covers the whole script with a scene-by-scene storyboard in Fred’s original eight-column format.
- The storyboard is part of the final result. The image stage reads only each scene group’s `Background` description and creates up to **10 unique background plates** for that script, one request at a time.
- Keep Fred’s drawing treatment consistent while letting each scene’s location, palette, and composition fit its narration.
- Generate environment backgrounds only. Animators add characters, animals, anatomy, handheld or loose props, diagrams, text, and all movement.
- If more than 10 unique settings are planned, tell the user how many remain for a later run. Never send a per-scene prompt form to the user.

## Current workflow

- n8n workflow: **Fred Script-to-Backgrounds — Simple**, ID `QRPeaK5ayX9ZC5Zx` ([open in n8n](https://n8n-rayv-742595626609.herokuapp.com/workflow/QRPeaK5ayX9ZC5Zx)).
- One production webhook: `POST /webhook/fred-image-generation-stage-1`.
- `{"action":"plan","script":"..."}` validates one full script, reads the external reference tab once, plans all storyboard scenes, and returns Fred-format CSV data, at most 10 selected distinct backgrounds, and counts. It does not duplicate every scene as JSON in the response.
- `{"action":"image","background":"...","backgroundId":"BG001","sceneNumbers":[1]}` makes one image. The browser waits for that result before sending the next image request to the same webhook.
- The browser always runs plan first, then image requests in order from the returned storyboard. The `action` field is an internal stage marker; the user submits one script and does not choose a mode.
- Text planning uses Vercel AI Gateway `openai/gpt-5-mini` and the structured storyboard parser. GPT Image 2.5 Flare is used **only** for image generation through OpenRouter’s Images API, at low quality, 16:9, `n: 1`.
- Current fixed image style reference: Google Drive image `19_rZZhpt3du495njrjnO5nuPWQjxnMAQ`. It guides linework and color treatment; the reference subject, setting, and composition are not copied.

## Reference retrieval

The read-only tab `Planner Context` is in the external workbook [Fred Storyboard Style and Reference Index](https://docs.google.com/spreadsheets/d/1RL7C_3kg7Ua47R7BnQFi4YvsgDyecIQS7yi1uCAT-gg/edit). It consolidates the two CSV examples, style guide, and Drive reference index so the planner makes one Sheets read per script.

Its columns are `recordType`, `source`, and `payloadJson`. It currently has 17 style guide records, 18 reference-index records, 81 rows from example 01, and 166 rows from example 03. The workflow ranks the examples against the submitted script and passes four matched rows from each source, the style guide, and the approved environment reference index to the text model.

Do not save submitted scripts, generated prompts, job state, or image binaries to this reference sheet. It is reference context only. No n8n Data Tables, n8n Memory, or internal n8n storage may be introduced.

## Fred’s storyboard fields

Preserve the source columns, in this exact order and spelling:

1. `Scene`
2. `Timestamp`
3. `Voiceover`
4. `What's happening`
5. `Background`
6. `Hand-drawn characters & props`
7. `On-screen text`
8. `Transitions/Motion`

Keep every Voiceover field verbatim; together the fields must cover the complete script in order. The workflow checks this before creating image requests. Use exact supplied timestamps and leave timestamps blank when none were provided. Split visual beats when the narration or location changes. Keep animator directions, text, and motion in their own columns. Do not generate image prompts or images during the planning stage.

Only `Background` can contribute scene-specific content to an image request. Never concatenate voiceover, actions, characters/props, on-screen text, transitions, feedback, or inferred objects into the image prompt.

## UI and scope

The static UI is in `public/`. It has one full-script textarea and one generate action. It offers the complete storyboard as a workflow-produced CSV download, plus a gallery of completed backgrounds. It displays each image as soon as it arrives and preserves completed images if a later image fails.

Current demo omits SVG export, Drive upload, email delivery, review feedback, job/status persistence, and automatic retries. The storyboard CSV is returned by n8n and downloaded in the browser without persistence. Keep every AI/node step for this product in the same n8n workflow.

## Reliability and known test state

- The image branch succeeded in n8n execution `2557` on 20 October 2026. The workflow downloaded the approved Drive style reference, called OpenRouter Flare, and returned an image data URL. An earlier successful image run reported provider cost of about `$0.0168`.
- The planner was tightened to send four matched example rows from each CSV, cap reference-index context, validate complete ordered script coverage, and return a dynamic error status before images are requested.
- Planner execution `2563` crashed before any node after the webhook ran. Heroku logs recorded `R14` at about 601 MB on the 512 MB dyno. The next published planner request, execution `2564`, also crashed before any node after the webhook ran; Heroku recorded `R14` at 597 MB and returned HTTP 503. Do not repeat large execution-data reads; returning image payloads through execution inspection can create multi-megabyte responses.
- The latest published workflow version is `6d6ac00c-1875-43c6-856e-6c08f2a63b68`. One submission still always plans the complete storyboard first, then the UI requests selected unique Background settings sequentially. The stage field is routing metadata, not an AI decision.
- Stage 2 has a verified success, but the full planner-to-image UI path has **not** yet passed an end-to-end check because the current Heroku host exceeds its 512 MB memory quota. The requested hosting budget cap is `$13/month`; the next Heroku dyno tier with 1 GB RAM is listed at `$50/month`, so do not change the plan under that cap.
- The older complex workflow `NO5b5a1P44wvK4U7` is unpublished. Preserve it as a reference; do not use its old UI routes or activate it alongside this workflow.
- Do not issue duplicate image calls after timeouts. Check the matching n8n execution first; a retry can incur another image charge.

## Security

Keep Google Sheets, Google Drive, Vercel Gateway, and OpenRouter credentials in n8n only. The webhook is public and CORS is not authentication. Validate/clamp the full script and background string, limit each image request to one, and do not log or expose credentials.
