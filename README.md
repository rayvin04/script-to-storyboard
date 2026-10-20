# Fred’s Script-to-Backgrounds Demo

The demo takes **one complete voiceover script** in one submission. A text model plans the full script into scenes that follow Fred’s storyboard examples. The UI then uses the `Background` descriptions to generate up to 10 distinct environment plates, one image at a time.

Only backgrounds are generated. Animators add all characters, props, labels, diagrams, and movement by hand. Fred’s art treatment stays consistent across settings, while each background changes to fit its scene.

## Current architecture

- UI: static Vercel site in `public/`.
- n8n: **Fred Script-to-Backgrounds — Simple**, ID `QRPeaK5ayX9ZC5Zx` ([open in n8n](https://n8n-rayv-742595626609.herokuapp.com/workflow/QRPeaK5ayX9ZC5Zx)). It uses one webhook path; `action: "plan"` creates the scene plan and `action: "image"` generates one background.
- Storyboard planning: Vercel AI Gateway `openai/gpt-5-mini`, with read-only Google Sheets reference context.
- Image generation: OpenRouter `openai/gpt-image-2.5-flare`, low quality, 16:9, one image per request. The image model is used only for images.
- The browser sends image requests sequentially and renders each result as it arrives. It does not save scripts or generated images.

No CSV or SVG export, database writes, n8n Data Tables, n8n Memory, Drive upload, email notification, or status polling is part of this prototype.

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
- The current n8n planner reads the consolidated `Planner Context` tab once. Earlier planner tests hit Google Sheets HTTP 429 before this consolidation; the latest test crashed before any node ran, so the full planner path still needs an end-to-end check after the n8n host is available again.
- The image route has succeeded in n8n: Flare returned a PNG for a custom jewelry-shop background. The browser display path still needs verification against the deployed UI after this code is published.

Run local syntax checks with:

```powershell
node --check public/app.js
node --check public/workflow-api.js
```

Credentials stay in n8n and must never be placed in browser code or committed files.
