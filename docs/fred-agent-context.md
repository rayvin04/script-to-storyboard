# Agent Context — Fred's Background Storyboard Demo

Updated 20 October 2026. This file is the implementation source of truth for future AI agents working in this repository. Apply it together with [`fred-style-guide.md`](fred-style-guide.md).

## User's confirmed scope

- User pastes the **full script**.
- AI 1 creates the **full scene-by-scene storyboard** first, following Fred's exact CSV format.
- AI 2 creates **background plates only**, at most **10 distinct background images per generation batch**.
- Fred's drawing style is consistent across scenes, while settings vary to fit each scene. Do not lock every scene to the sample yellow living room.
- Do not generate people, characters, animals, bodies, organs, hands, loose props, overlay text, or motion. Animators draw and animate those.
- Show in the UI and downloaded CSV: **“This is the full storyboard. More background plates remain for a later batch.”** Add the actual deferred plate count when known.
- Every n8n node for this feature belongs to the same workflow. Use sticky notes to label its stages/routes.
- Use external Google Sheets/Drive for reference, storyboard, status, and image-file storage. Never use n8n Data Tables, n8n Memory, or n8n storage as the project's database.
- Use a text model for planning and OpenRouter `openai/gpt-image-2.5-flare` only for image generation. Do not spend image credits on retrieval, planning, or CSV work.

## Live/current workflows

### Proven image-only fallback

- **Fred Image Generation - Stage 1**, workflow ID `QRPeaK5ayX9ZC5Zx`, active: [open in n8n](https://n8n-rayv-742595626609.herokuapp.com/workflow/QRPeaK5ayX9ZC5Zx).
- One prompt generates one full character scene using a character reference. It does **not** meet Fred's new background-only brief. Keep it intact as a known-good provider test/fallback; do not point the new UI at it.

### Background-first storyboard workflow

The new workflow is **Fred Storyboard — Full Plan + Background Batches**, ID `NO5b5a1P44wvK4U7`: [open in n8n](https://n8n-rayv-742595626609.herokuapp.com/workflow/NO5b5a1P44wvK4U7). It is a separate workflow from Stage 1 and uses these fixed routes:

| Route | Purpose |
| --- | --- |
| `POST /webhook/fred-storyboard-plan-v4` | Retrieve style/CSV references, produce and save the full storyboard. |
| `POST /webhook/fred-storyboard-generate-v4` | Accept a job ID and up to 10 background IDs; acknowledge quickly, then generate sequentially. |
| `GET /webhook/fred-storyboard-status-v4?jobId=...` | Return all scene rows, unique plate statuses, counts, and private image-proxy URLs. |
| `GET /webhook/fred-storyboard-image-v4?jobId=...&backgroundId=...` | Validate against the sheet and stream one private Drive image as binary to the UI. |
| `GET /webhook/fred-storyboard-csv-v4?jobId=...` | Build and download the complete Fred-format CSV inside n8n. |

The public page is `https://script-to-storyboard-six.vercel.app/`. The source is `public/`; routes are fixed in `public/workflow-api.js`. The workflow uses external Google Sheets and Drive for persistent data and files. Do not add n8n Data Tables or Memory.

## Reference data and credentials

All numeric IDs below are exact resources established in the connected accounts; do not replace or invent values.

- Main style/reference spreadsheet: `1RL7C_3kg7Ua47R7BnQFi4YvsgDyecIQS7yi1uCAT-gg` — `Fred Storyboard Style and Reference Index`; tabs include `Reference Index`, `Style Guide`, `Job Results`, and `Storyboard Jobs`.
- Example sheet 01: `1LTU3tWF92dzKXzMDPZtV09uQhTqeBGFfDj3TxhJ-xq0`, tab `01_every_weird_body_glitch`, 81 source rows.
- Example sheet 03: `1z3zC8r8Ew93j22QvGRQXcqfeHF-vEMlUa9hDsA_5QOc`, tab `03_strangest_things_your_body_d`, 166 source rows.
- Fred's style source folder: `1KLTxXSsptR9OguL30DCBLX72GX2rtUBo`. Its character PNGs are style evidence, never image subjects. The tagged environment example also contains a person; if used as an image reference, say to ignore and omit that person.
- Private image-batch Drive folder: `1CcdOgXEwhyXJ1Dnonzv4AVFWloztgTGn`.
- Google Sheets credential: `giananrayvin@gmail.com`, ID `uhpKISQ818MUREdV`.
- Google Drive credential: `giananrayvin@gmail.com GDRIVE`, ID `PWL6ap3LIUEv75px`.
- Vercel text-model credential: `Vercel AI Gateway account`, ID `FulgOrYzN8KoCQ7j`; model `openai/gpt-5-mini`.
- OpenRouter image credential: `GPT 2.5 Image Flare`, ID `5gcKsflkw4r3rGS8`; model `openai/gpt-image-2.5-flare`, `quality: low`, 16:9.

Use existing saved credentials in workflow nodes; never place secrets in code, the UI, markdown, workflow JSON, or execution outputs.

## Storyboard record

The first eight columns and their exact order:

1. `Scene`
2. `Timestamp`
3. `Voiceover`
4. `What's happening`
5. `Background`
6. `Hand-drawn characters & props`
7. `On-screen text`
8. `Transitions/Motion`

The text model outputs every scene for the full script. Keep `Voiceover` as an exact excerpt; timestamp only when supplied; split narration into visual beats; keep editor/animation notes in their own fields. The image generation request must use only the `Background` field with the shared style rules. Derive all generated prompt text deterministically; do not let a scene's other fields leak into the prompt.

Workflow tracking fields may follow the eight CSV columns: `Background ID`, `Background image status`, and `Generation batch note`. Assign a stable `BG001` etc. for genuinely shared background setups. Only deduplicate if setting and framing match. First 10 distinct backgrounds are `pending`; later backgrounds remain `deferred`, with full scene records retained.

## Workflow design

### 1. Plan route — synchronous, no image calls

1. Webhook validates a non-empty script (maximum 30,000 characters) and creates an opaque job ID.
2. Read the style guide, reference index, and both example sheets using Google Sheets. Select a compact set of matching CSV examples for planning; keep external source data outside n8n storage.
3. A Basic LLM Chain + Vercel AI Gateway + Structured Output Parser create the full storyboard, following the exact eight-column schema. The planner does not need agent tools because the workflow retrieves and supplies the live references before prompting; this reduces execution overhead on the 512 MB host.
4. Code validates fields, assigns distinct background IDs, chooses a maximum of 10 initial plate IDs, creates background-only prompt strings, and creates a standards-compliant CSV string.
5. Google Sheets appends one row per storyboard scene to `Job Results`. The CSV and all storyboard rows are returned by the webhook so the UI can display and download the CSV that the workflow created.

### 2. Generate route — fast acknowledgement, sequential work

1. Validate `jobId` and the requested IDs. Enforce a strict maximum of 10 unique IDs on every request.
2. Send HTTP 202/accepted before image calls so the browser does not wait for a 10-image generation run.
3. Read rows for that job from Sheets. Select only `pending`/explicitly requested `deferred` backgrounds.
4. Call OpenRouter's dedicated Images API once per background using only `Background` + retrieved style rules. Keep generation sequential to protect the 512 MB Heroku process and keep cost predictable.
5. Upload each binary to the private batch folder in Drive; update all scene rows that reference that background with status, file ID/name/MIME type, image proxy URL, prompt, and provider cost when available. Continue after a single plate failure and record the failure.

### 3. Status/image routes

- Status route reads the job's rows from Google Sheets and returns counts for planned, generating, completed, failed, and deferred scenes/backgrounds. It does not return image base64.
- Image route accepts a random job ID and background ID, verifies the combination in Google Sheets, downloads the Drive file with the saved credential, then returns one binary image. Do not make Drive images public merely to preview them.
- The UI polls status and renders each background through its image-proxy URL. It can download images or a ZIP on the client after they load; never send a large array of base64 images in one n8n response.

### Sticky-note labels

Add sticky notes to the same workflow for: (1) full storyboard planning + sheet-backed retrieval; (2) background-only image generation, 10-image cap, private Drive upload; (3) status/image proxy routes; (4) failure/status handling. Do not add Data Table or memory nodes.

## UI contract

- Page title `Fred's Storyboard Lab`; consistent cartoon palette and readable Lexend type.
- Script field and `Build full storyboard` action.
- Display full scene table before image spend; CSV download must contain the exact eight source columns plus workflow columns and batch notes.
- `Generate first batch` and `Generate next batch` actions each send no more than 10 distinct background IDs.
- Progress state is polled from n8n. Display successful images, failures, costs, and deferred count. Gallery cards represent unique backgrounds, not duplicate storyboard scenes.
- Display clearly: **“This is the full storyboard. More background plates remain for a later batch.”** The UI/CSV must make the remaining count explicit when the plan has more than 10 unique plates.
- Do not show character preview placeholders as generated assets; do not imply image calls happen during planning.

## Failure, privacy, and cost

- The n8n host has a 512 MB Heroku memory limit and has previously crashed while several workflows were enabled. Preserve all other workflows. The new batch is serial and capped at 10. Do not restart, pause, or change Heroku configuration without an explicit user request.
- Use no more than 10 image calls per generation request. No automatic regeneration loops. Record provider failures and continue to the next background when possible.
- The webhook has no caller auth. CORS limits browsers but does not authenticate requests. Keep model keys on n8n; validate and clamp every request. Do not expose Drive file IDs or public links unnecessarily.
- A one-image production smoke check may consume image credits. Use low quality. Confirm a successful image response and provider cost before testing a larger batch.
- A same-workflow error path was previously selected; keep failure recording inside this workflow. Do not create a separate error workflow unless the user explicitly changes that decision.

## History to retain

- The older 79-node workflow is preserved inactive as `Script to Image Paid Demo - Reference Backup`, ID `wGOMRtREoqFDUgqj`; it contains n8n Data Tables and character-frame assumptions. Do not use or activate it.
- The original workflow ID `rV2JjknCieGGXRNL` remains inactive.
- The user's accepted shift is background-only. Do not revert to full character image generation.

## Sources

See [`fred-style-guide.md`](fred-style-guide.md) for analysis of channels, both sample workbooks, the art direction, and the background prompt contract. The workbooks are available as native Sheets under the IDs above. URLs for the supplied videos, scripts, Drive folder, portfolio, and UI repo are recorded in the source ledger in that guide.
