# Fred's Script-to-Storyboard Demo

A static, cartoon-inspired storyboard UI prototype for Fred's YouTube production workflow. The first pass supports local script previews, sample scene cards, per-scene feedback, image downloads, and scene-plan export.

## Current prototype status

- The UI is wired to one persistent n8n production webhook in `public/app.js`. The webhook URL is part of the code, so users do not need to paste or save it in the browser.
- Use the stable Vercel URL [`https://script-to-storyboard-six.vercel.app`](https://script-to-storyboard-six.vercel.app). The project-specific deployment preview URL may require Vercel sign-in.
- The browser sends `{ "script": "...", "maxScenes": 1, "aspectRatio": "16:9" }` to the production webhook. It uses a CORS-safelisted `text/plain` request body; the n8n workflow parses the JSON body and responds with a `scenes` array.
- The n8n workflow is **Script to Image Paid Demo**: [open workflow](https://n8n-rayv-742595626609.herokuapp.com/workflow/rV2JjknCieGGXRNL). It plans scenes with the text model `openai/gpt-5-mini`, then sends one request per scene to the image model `openai/gpt-image-2.5-flare` through the Vercel AI Gateway image endpoint.
- The n8n export is stored separately in [`workflows/script-to-storyboard/`](workflows/script-to-storyboard/). The export stays inactive when imported; the connected n8n instance uses its published production version.
- Provider credentials stay in n8n. No API key is stored in this repository or frontend. We have not run a paid end-to-end generation in this session.
- The production webhook accepts requests from the stable Vercel app origin. CORS only limits browser origins; it is not caller authentication. Before wider public use, add a server-side proxy with authentication and rate limits to protect the image-generation budget.
- The workflow returns per-scene success/failure states. Shared feedback storage, Google Drive delivery, notifications, and retrieval over previous feedback are later phases.
- Ratings remain in that browser's local storage; they are not shared with a team database.
- Google Drive delivery is a later-phase placeholder.

## Run locally

From the repository root, run:

```powershell
python -m http.server 8000 --directory public
```

Then open `http://localhost:8000`.

## Deploy on Vercel

Import this repository in Vercel and use these project settings:

- Framework Preset: **Other**
- Build Command: leave blank
- Output Directory: `public`
- Root Directory: repository root

The app is plain HTML, CSS, and JavaScript, so it does not need a build step. The `docs/` and `scripts/` folders stay outside the deployed output; only `public/` is served. See [Vercel's static build guidance](https://vercel.com/docs/builds/configure-a-build).

After deployment, the UI already targets the production webhook. Keep provider credentials in n8n, never in frontend files. The first workflow uses synchronous image generation, so the UI request remains open until the scene batch completes.

## Project files

- `public/` — static web UI served by Vercel.
- `docs/Freds_Storyboard_Analysis.docx` — human-readable source and architecture analysis.
- `docs/fred-agent-context.md` — compact project context for an AI agent.
- `scripts/build_report.py` — source used to generate the DOCX report.

