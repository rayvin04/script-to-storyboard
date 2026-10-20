# Fred’s Script-to-Storyboard Demo

A five-scene demo for Fred’s YouTube animation workflow. The priority is his actual drawing style and scene language: script → consecutive storyboard beats → reference-guided images → human review.

## Current work

The current implementation is documented in [Agent workflow v3](docs/agent-workflow-v3.md). All generation, progress, image delivery, shared feedback and CSV-download routes belong to the same n8n workflow (`rV2JjknCieGGXRNL`).

The live 77-node draft was saved and validated. The latest local export has 78 nodes, adding a missing-review guard and a no-charge readiness check; those final refinements still need synchronization. Execution `2024` started a one-image test, but Heroku returned HTTP 503 before its result could be inspected. The new draft has not been published, so live image generation and reference fidelity remain unverified. Inspect that saved run before spending on another test.

The UI defaults to five scenes, shows actual saved images instead of local sample drawings, polls background-job progress, supports image downloads and shared ratings/comments, and downloads a CSV created inside n8n. Its readiness check prevents a generation request from being sent to an older published workflow.

Stable production URL: [script-to-storyboard-six.vercel.app](https://script-to-storyboard-six.vercel.app/). A deployment-specific URL is a fixed snapshot; use the stable alias after the current workflow and UI release have been verified.

## Workflow architecture

- The planning AI Agent studies two actual approved Drive image binaries and retrieves Fred’s style brief, CSV examples and saved art reviews.
- A structured JSON parser enforces the storyboard fields.
- A scene art director AI Agent calls its connected Flare image tool once per scene. That tool enters the image-only branch of the SAME workflow.
- OpenRouter is used only for `openai/gpt-image-2.5-flare` image generation at low quality. Text planning/reasoning use the existing Vercel text model.
- The image branch sends actual reference bytes through OpenRouter’s dedicated Images API, creates an n8n binary preview, saves the result, and returns a small receipt to the Agent.
- The browser receives HTTP 202 quickly and polls for results. This avoids keeping a generation request open beyond Heroku’s 30-second router timeout.
- Ratings/comments are stored in the shared n8n Feedback table and can inform later Agent prompts. They do not train the model.
- The CSV route creates Fred’s eight columns in n8n, quotes commas/newlines correctly, and supports Excel. Unknown timings stay blank.

Google Drive delivery and the editing-team notification remain marked **LATER**. Image data currently uses n8n Data Tables for this small demo; regular production use needs durable object storage, authentication, rate limits and transactional job locking.

## Project files

- `public/` — static Vercel UI; `workflow-api.js` contains the fixed workflow routes. No provider secrets belong here.
- `workflows/script-to-storyboard/workflow.json` — complete n8n export, inactive on import.
- `workflows/script-to-storyboard/workflow.sdk.ts` — generated SDK graph for validation.
- `scripts/build_agent_workflow.py` — reproducible workflow/export builder.
- `scripts/check_storyboard_workflow.mjs` — local functional checks; makes no provider calls.
- `docs/agent-workflow-v3.md` — current architecture, verified status and remaining work.
- `docs/fred-agent-context.md` and `docs/fred-style-guide.md` — reference analysis and Agent context.
- `docs/Freds_Storyboard_Analysis.docx` — earlier human-readable reference analysis; consult the v3 addendum for current implementation status.

## Local checks

```powershell
node --check public/app.js
node --check public/workflow-api.js
node scripts/check_storyboard_workflow.mjs
```

Serve `public/` with a static server to inspect the UI. It still uses the saved n8n routes; no webhook URL entry is required. The Vercel project uses Framework Preset **Other** and Output Directory `public`. `.vercelignore` excludes workflow/docs/scripts and environment files from uploads. Keep all model credentials in n8n.
