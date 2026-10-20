# Fred Storyboard — Full Plan + Background Batches

Live n8n workflow ID: `NO5b5a1P44wvK4U7`  
Editor: [open workflow in n8n](https://n8n-rayv-742595626609.herokuapp.com/workflow/NO5b5a1P44wvK4U7)  
Source: [`workflow.sdk.ts`](workflow.sdk.ts)

This workflow accepts a full script, reads the style guide and storyboard examples from Google Sheets, creates the complete storyboard, saves it to Sheets, and makes the storyboard CSV downloadable. A separate webhook accepts up to 10 unique background IDs and generates plates sequentially with OpenRouter GPT Image 2.5 Flare. Files are saved privately to Google Drive and streamed to the UI through a validated image route.

## Webhook routes

| Method and path | Purpose |
| --- | --- |
| `POST /webhook/fred-storyboard-plan-v4` | Start full-script storyboard planning. |
| `POST /webhook/fred-storyboard-generate-v4` | Start generation for up to 10 selected unique background plates. |
| `GET /webhook/fred-storyboard-status-v4?jobId=...` | Poll job, scenes, background status, and image proxy URLs. |
| `GET /webhook/fred-storyboard-image-v4?jobId=...&backgroundId=...` | Stream one validated private Drive image. |
| `GET /webhook/fred-storyboard-csv-v4?jobId=...` | Download the complete storyboard CSV created inside this workflow. |

## Guardrails

- Full storyboard first; image generation is an explicit, separate action.
- No more than 10 unique images per request; generation is serial.
- Image prompts use the scene’s `Background` field plus the shared style guide only.
- Flare is reserved for image generation; planning uses Vercel AI Gateway text model.
- Persistent jobs, storyboard rows, and references use Google Sheets. Image binaries use private Google Drive.
- No n8n Data Tables, n8n Memory, or internal n8n storage for project data.
- If the storyboard has more than 10 unique settings, deferred CSV rows and the UI state that more background plates remain for a later batch.

## Current connected services

- Google Sheets credential: `giananrayvin@gmail.com`
- Google Drive credential: `giananrayvin@gmail.com GDRIVE`
- Text model: Vercel AI Gateway `openai/gpt-5-mini`
- Image model: OpenRouter `openai/gpt-image-2.5-flare`, low quality, 16:9

Credentials remain in n8n and must not be copied into this source folder or the browser UI.
