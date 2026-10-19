# Fred's Script-to-Storyboard Demo

A static, cartoon-inspired storyboard UI prototype for Fred's YouTube production workflow. The first pass supports local script previews, sample scene cards, per-scene feedback, image downloads, and scene-plan export.

## Current prototype status

- The default experience is a local preview. Its sample panels are illustrative SVGs, not generated images.
- The UI is preconfigured with n8n's temporary test webhook and defaults to one scene. Start **Listen for test event** in n8n, then submit a script from the UI. Each scene triggers a paid image request. The test webhook only works while n8n is listening.
- The browser posts `{ "script": "...", "maxScenes": 1, "aspectRatio": "16:9" }` and expects a JSON response with a `scenes` array. A saved webhook URL in browser localStorage overrides the default; the settings dialog can change or clear it.
- An inactive n8n draft is available as **Script to Image Paid Demo**: [open workflow](https://n8n-rayv-742595626609.herokuapp.com/workflow/rV2JjknCieGGXRNL). It plans up to three scenes with `openai/gpt-5.6-luna`, then sends one request per scene to `openai/gpt-image-2.5-flare` through the Vercel AI Gateway image endpoint.
- The n8n export is stored separately in [`workflows/script-to-storyboard/`](workflows/script-to-storyboard/).
- The workflow uses the saved Vercel Gateway credential in n8n. No API key is stored in this repository or frontend. It has not been run against the paid image endpoint, and remains inactive.
- The workflow is not activated for production. Before exposing an active webhook to a public Vercel deployment, add authentication and restrict CORS to the deployed UI origin. The current draft allows wildcard origins and does not authenticate callers.
- The first draft returns individual scene success/failure states. Shared feedback storage, Google Drive delivery, notifications, and retrieval over previous feedback are later phases.
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

After deployment, add the production webhook URL in the UI settings only after adding authentication and replacing wildcard CORS with the deployed site's origin. Keep provider credentials in n8n, never in frontend files. The first workflow uses synchronous image generation, so the UI request remains open until the scene batch completes.

## Project files

- `public/` — static web UI served by Vercel.
- `docs/Freds_Storyboard_Analysis.docx` — human-readable source and architecture analysis.
- `docs/fred-agent-context.md` — compact project context for an AI agent.
- `scripts/build_report.py` — source used to generate the DOCX report.
