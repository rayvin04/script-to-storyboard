# Fred's Script-to-Storyboard Demo

A static, cartoon-inspired storyboard UI prototype for Fred's YouTube production workflow. The first pass supports local script previews, sample scene cards, per-scene feedback, image downloads, and scene-plan export.

## Current prototype status

- The default experience is a local preview. Its sample panels are illustrative SVGs, not generated images.
- An optional n8n webhook can be entered in the UI settings. The browser posts `{ "script": "...", "maxScenes": 3, "aspectRatio": "16:9" }` and expects a JSON response with a `scenes` array.
- The live n8n workflow is not connected yet. No API key is stored in this repository or frontend.
- Ratings and the webhook URL are stored in that browser's local storage. They are not shared with a team database.
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

After deploying, add the n8n webhook URL from the UI settings when the workflow is available. Configure n8n to allow requests from the deployed site and keep provider credentials in n8n, never in frontend files.

## Project files

- `public/` — static web UI served by Vercel.
- `docs/Freds_Storyboard_Analysis.docx` — human-readable source and architecture analysis.
- `docs/fred-agent-context.md` — compact project context for an AI agent.
- `scripts/build_report.py` — source used to generate the DOCX report.

