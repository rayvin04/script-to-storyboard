# Fred Storyboard — Full Plan + Background Batches

Live n8n workflow ID: `NO5b5a1P44wvK4U7`  
Editor: [open workflow in n8n](https://n8n-rayv-742595626609.herokuapp.com/workflow/NO5b5a1P44wvK4U7)  
Source: [`workflow.sdk.ts`](workflow.sdk.ts)

This workflow accepts a full script, reads the style guide and storyboard examples from Google Sheets, creates the complete storyboard, saves it to Sheets, and makes the storyboard CSV downloadable. A separate webhook accepts up to 10 unique background IDs and generates plates sequentially with OpenRouter GPT Image 2.5 Flare. Files are saved privately to Google Drive and streamed to the UI through a validated image route.

Local source work adds scene-aware image names (`fred-{job-random-suffix}-BG001-SC-001-007.png`) and a browser-generated SVG review export. These additions have not been published to n8n while the Heroku host is unstable. The combined team-folder delivery and email-notification route is planned but not live; see [`delivery-and-export-plan.md`](../../docs/delivery-and-export-plan.md).

## Webhook routes

| Method and path | Purpose |
| --- | --- |
| `POST /webhook/fred-storyboard-plan-v4` | Start full-script storyboard planning. |
| `POST /webhook/fred-storyboard-generate-v4` | Start generation for up to 10 selected unique background plates. |
| `GET /webhook/fred-storyboard-status-v4?jobId=...` | Poll job, scenes, background status, and image proxy URLs. |
| `GET /webhook/fred-storyboard-image-v4?jobId=...&backgroundId=...` | Stream one validated private Drive image. |
| `GET /webhook/fred-storyboard-csv-v4?jobId=...` | Download the complete storyboard CSV created inside this workflow. |

The planned `POST /webhook/fred-storyboard-deliver-v4` route is not live. It will move completed Drive files from private staging into the shared folder configured in `Workflow Settings` and send one email to the configured editor address when the job's generated plates have arrived.

## Guardrails

- Full storyboard first; image generation is an explicit, separate action.
- No more than 10 unique images per request; generation is serial.
- Image prompts use the scene’s `Background` field plus the shared style guide only.
- Flare is reserved for image generation; planning uses Vercel AI Gateway text model.
- Persistent jobs, storyboard rows, and references use Google Sheets. Image binaries use private Google Drive.
- Background names include a short job suffix, unique background ID, and linked scene numbers. The name is shared by the binary, Drive file, and Sheets `imageFileName` value.
- CSV remains the structured animator source. SVG is a visual review copy built in the browser and does not contain image binaries.
- The delivery destination is the shared team folder `153VPM-IBR1T5UIq-TthqtpklyAGwi-UU`; write access with the saved n8n Drive credential remains to be verified.
- Delivery must stay serial and capped at 10 Drive files per execution. The email recipient comes from the `editingTeamEmail` cell in the Google Sheet, never from a public webhook field.
- No n8n Data Tables, n8n Memory, or internal n8n storage for project data.
- If the storyboard has more than 10 unique settings, deferred CSV rows and the UI state that more background plates remain for a later batch.

## Current connected services

- Google Sheets credential: `giananrayvin@gmail.com`
- Google Drive credential: `giananrayvin@gmail.com GDRIVE`
- Text model: Vercel AI Gateway `openai/gpt-5-mini`
- Image model: OpenRouter `openai/gpt-image-2.5-flare`, low quality, 16:9

Credentials remain in n8n and must not be copied into this source folder or the browser UI.
