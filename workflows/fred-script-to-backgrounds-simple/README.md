# Fred Script-to-Backgrounds — Simple

Current n8n workflow ID: `QRPeaK5ayX9ZC5Zx`  
Editor: [open in n8n](https://n8n-rayv-742595626609.herokuapp.com/workflow/QRPeaK5ayX9ZC5Zx)  
Production webhook: `POST /webhook/fred-image-generation-stage-1`

The workflow accepts **one full script** from the UI’s single Generate action. The fixed sequence is always: (1) create the complete storyboard, then (2) generate up to 10 unique background plates from the storyboard’s `Background` values. The browser automatically orchestrates the two stages through lightweight calls to this same webhook; the user does not choose a mode, and no AI decides whether to storyboard or generate images.

The two internal request types are intentional: `action: "plan"` is always the first call, and `action: "image"` is sent only after the planner returns the storyboard. Each image call is sequential and contains one background so the Heroku host does not have to hold a full storyboard run and a batch of image payloads in one execution.

## Routes

### Plan a full script

```json
{"action":"plan","script":"Paste the complete voiceover script here..."}
```

The planner reads the external `Planner Context` tab once, ranks and selects four rows from each example CSV, passes only approved environment metadata from the Drive index, and uses Vercel AI Gateway `openai/gpt-5-mini` with a structured parser. It returns the full eight-column `storyboardCsv`, counts, and up to 10 background objects with IDs, linked scene numbers, and background descriptions. It checks that the ordered Voiceover rows contain every word of the submitted script before returning the CSV; incomplete plans return a clear error and create no images. It does not duplicate the scene array in the response. The UI focuses on background progress/images and offers a storyboard CSV download; planning does not call the image model.

### Generate one background image

```json
{"action":"image","background":"A warm illustrated jewelry shop interior with display cases and a sunlit window","backgroundId":"BG001","sceneNumbers":[1,3]}
```

The workflow adds fixed style constraints, reads one approved Drive style anchor, then uses OpenRouter’s Images API with model `openai/gpt-image-2.5-flare`, low quality, 16:9, and `n: 1`. The image route returns `imageData` as a displayable image data URL and preserves `backgroundId` and `sceneNumbers` in success and error results. It does not build a duplicate binary output. The image model is never used for text work.

## Reference source

The workflow reads the `Planner Context` tab in [Fred Storyboard Style and Reference Index](https://docs.google.com/spreadsheets/d/1RL7C_3kg7Ua47R7BnQFi4YvsgDyecIQS7yi1uCAT-gg/edit). It is reference-only and contains 282 rows: 17 style rules, 18 reference-index rows, 81 example 01 rows, and 166 example 03 rows. n8n uses one Sheets read per planning call; it never writes the script or generated images to this sheet.

## Guardrails

- Full storyboard and CSV first; every script word is checked for coverage, and image count is capped at 10 unique Background values.
- Browser loop is sequential; one image per n8n execution.
- Only the `Background` field supplies scene-specific image content.
- No characters, animals, body parts, movable props, text, diagrams, logos, or motion are generated.
- No n8n Data Tables, n8n Memory, script/job storage, Drive upload, SVG export, notifications, or feedback loop. The CSV comes from the planner response and is not stored.
- `Read Planner Context` has bounded retry settings for transient Sheets errors.

When there are more than 10 distinct settings, the planner samples evenly across the complete scene sequence rather than taking only the opening scenes. Any remaining unique settings are counted as deferred. The workflow disables successful-execution payload storage so large base64 images are not retained in n8n execution history.

The published graph is authoritative. Import snapshots should be inactive to avoid registering a duplicate webhook. Reconnect saved credentials in n8n after importing on another instance.

## Live Verification

- The current published graph is active as version `6d6ac00c-1875-43c6-856e-6c08f2a63b68` with 24 nodes.
- Image execution `2557` succeeded: it downloaded the approved Drive style reference, called OpenRouter `openai/gpt-image-2.5-flare`, and returned `imageData` for the UI.
- Planner executions `2563` and `2564` crashed before any node after the webhook ran. Heroku recorded R14 at roughly 601 MB and 597 MB, respectively, against the 512 MB dyno; the host returned HTTP 503.
- The full plan-to-image journey has not passed end-to-end yet. The image branch is verified; the planner is blocked by Heroku memory pressure. The user-approved hosting cap is `$13/month`; do not raise the plan because the next Heroku dyno with 1 GB RAM is listed at `$50/month`.

## UI Connection and Timeouts

The frontend uses the same production webhook for both stages. It sends `action: "plan"` with the full script and a title derived from the first non-empty line, then sends one `action: "image"` request per selected background in a serial loop. The client waits 210 seconds for planning and 195 seconds per image; the Vercel model and OpenRouter HTTP nodes each have a 180-second timeout, leaving response-handling time. Keep the webhook's `allowedOrigins` and every `Respond to Webhook` CORS response in sync with the deployed Vercel origins. Add a new preview origin in both places before testing from a newly generated preview URL.
