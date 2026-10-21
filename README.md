# Fred’s Script-to-Backgrounds Demo

The demo takes **one complete voiceover script** in one submission. A text model plans the full script into Fred-style scenes, then the workflow generates up to ten distinct environment plates from the storyboard’s `Background` descriptions. The complete storyboard and its CSV remain available when additional unique backgrounds are deferred.

Only backgrounds are generated. Animators add all characters, props, labels, diagrams, and movement by hand. Fred’s art treatment stays consistent across settings, while each background changes to fit its scene.

## Current architecture

- UI: static Vercel site in `public/`.
- n8n: **Fred Script-to-Backgrounds — Simple**, ID `QRPeaK5ayX9ZC5Zx` ([open in AWS n8n](https://n8n.47-131-239-128.sslip.io/workflow/QRPeaK5ayX9ZC5Zx)). One Generate action sends the title and full script once; n8n plans the storyboard first, then generates the selected backgrounds sequentially, and returns both.
- Storyboard planning: Vercel AI Gateway `openai/gpt-5-mini`, with read-only Google Sheets reference context.
- Image generation: OpenRouter `openai/gpt-image-2.5-flare`, low quality, 16:9, one image per request. The image model is used only for images.
- The workflow returns every storyboard row and Fred-format CSV data. The UI displays the full storyboard and downloads the CSV on request. Background images are generated sequentially and shown as they arrive. Scripts and generated images are not saved.

The UI can save completed backgrounds to the shared demo Drive folder through a separate n8n webhook. Uploads run sequentially and return a file link for each image. The saved personal Google Drive credential stays in n8n; no credential is placed in browser code. Email notification, SVG export, database writes, n8n Data Tables, n8n Memory, and status polling are not part of this stage. The CSV is built in the workflow response and downloaded by the browser; it is not stored.

## Files

- `public/` — one-script UI and the fixed webhook client.
- `workflows/fred-script-to-backgrounds-simple/` — current workflow export and setup guide; import it inactive to avoid a duplicate webhook.
- `workflows/fred-image-generation-stage-1/` — earlier single-image workflow export retained as a reference.
- `workflows/fred-background-storyboard/` — legacy full workflow notes, retained for reference and not used by the simplified UI.
- `docs/fred-style-guide.md` — analysis of Fred’s art treatment and storyboard examples.
- `docs/fred-agent-context.md` — current behavior and hard constraints for the AI planner and image stage.

## Limits and verification

- One script, maximum 30,000 characters.
- Complete storyboard plan; up to 10 unique backgrounds per run.
- Image requests run one at a time. A failed request stops the batch while keeping images already shown.
- The n8n planner reads the consolidated `Planner Context` tab once and returns the full storyboard with the selected backgrounds. Earlier planner tests hit Google Sheets HTTP 429 before this consolidation; the latest test crashed before any node ran, so the revised full pipeline still needs an end-to-end check.
- The image route has succeeded in n8n: Flare returned a PNG for a custom jewelry-shop background. The browser display path still needs verification against the deployed UI after this code is published.

Run local syntax checks with:

```powershell
node --check public/app.js
node --check public/workflow-api.js
```

Credentials stay in n8n and must never be placed in browser code or committed files.
