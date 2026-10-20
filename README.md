# Fred’s Script-to-Storyboard Demo

An incremental prototype for Fred’s YouTube animation workflow. The current version creates a complete storyboard from the pasted script, then generates up to 10 unique background-only plates per batch. Characters, movable props, text, and animation cues remain in the animator’s CSV columns.

## Current background-first workflow

The n8n workflow is **Fred Storyboard — Full Plan + Background Batches**, ID **NO5b5a1P44wvK4U7** ([open in n8n](https://n8n-rayv-742595626609.herokuapp.com/workflow/NO5b5a1P44wvK4U7)). Its SDK source and canvas notes are in [the background storyboard folder](workflows/fred-background-storyboard/README.md).

The complete script is planned first using Fred’s CSV examples, style guide, and reference index from Google Sheets. The UI can then request up to 10 distinct backgrounds, one at a time, using OpenRouter’s GPT Image 2.5 Flare image API at low quality. Generated files stay private in Drive; the page displays them through the n8n image proxy. Storyboard rows, statuses, and reference data stay in Google Sheets. No n8n Data Tables or n8n memory are used.

The public UI is [Fred’s Storyboard Lab](https://script-to-storyboard-six.vercel.app/). It has fixed workflow routes in `public/workflow-api.js`; the user does not paste webhook URLs. It supports full storyboard review, a workflow-generated CSV, a browser-generated visual SVG, batch image generation, individual plate downloads, and a ZIP of completed images. If more than 10 unique settings are planned, the UI and deferred rows in the CSV say that more background plates remain for a later batch and include the count in the UI.

Scene-aware background filenames are being added in the local workflow source using the job suffix, background ID, and scene numbers. The team delivery folder is recorded in the Google Sheet `Workflow Settings` tab. The combined **Send to Drive & notify team** action is not live yet: n8n must be healthy, the Drive credential must be checked against the shared folder, and the configured `editingTeamEmail` value must be filled in before adding the workflow route and UI control. See [the delivery and export plan](docs/delivery-and-export-plan.md).

### Workflow routes

- `POST /webhook/fred-storyboard-plan-v4` — create a full storyboard job.
- `POST /webhook/fred-storyboard-generate-v4` — generate up to 10 selected background IDs.
- `GET /webhook/fred-storyboard-status-v4?jobId=...` — return storyboard rows and background status.
- `GET /webhook/fred-storyboard-image-v4?jobId=...&backgroundId=...` — stream one private Drive image.
- `GET /webhook/fred-storyboard-csv-v4?jobId=...` — create and download the Fred-format CSV in n8n.

The planned `POST /webhook/fred-storyboard-deliver-v4` route is not live. It will move reviewed plate files to the shared team folder in serial groups of at most 10 and send one email after the job's generated plates have arrived.

## Known-good fallback

**Fred Image Generation - Stage 1**, ID **QRPeaK5ayX9ZC5Zx**, remains active as a provider check. It creates a single full-scene image from character references and does not match Fred’s newer background-only brief. Keep it as a fallback; the current public UI uses the background-first workflow.

The older 79-node workflow remains preserved inactive as **Script to Image Paid Demo - Reference Backup**, ID **wGOMRtREoqFDUgqj**. The original complex workflow **rV2JjknCieGGXRNL** is also inactive.

## Project files

- `public/` — static Vercel UI; `workflow-api.js` holds fixed v4 webhook routes.
- `workflows/fred-background-storyboard/` — current workflow SDK source and guide.
- `workflows/fred-image-generation-stage-1/` — proven single-image fallback export and guide.
- `docs/fred-agent-context.md` and `docs/fred-style-guide.md` — project context and reference analysis.
- `docs/agent-workflow-v4.md` — AI-agent-readable workflow architecture.
- `docs/Freds_Storyboard_Analysis.docx` — human-readable reference analysis.

## Local verification

Run JavaScript syntax checks for the static UI files:

```powershell
node --check public/app.js
node --check public/storyboard-svg.js
node --check public/workflow-api.js
```

The Vercel project uses Framework Preset `Other` and Output Directory `public`. Provider credentials stay in n8n; never put them in browser code.
