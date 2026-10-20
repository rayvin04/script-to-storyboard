# Fred Script-to-Backgrounds — Simple

Current n8n workflow ID: `QRPeaK5ayX9ZC5Zx`  
Editor: [open in n8n](https://n8n-rayv-742595626609.herokuapp.com/workflow/QRPeaK5ayX9ZC5Zx)  
Production webhook: `POST /webhook/fred-image-generation-stage-1`

The workflow accepts **one full script** with `action: "plan"`, creates a complete scene storyboard from Fred’s examples, and returns the first 10 distinct `Background` settings. The browser then sends each setting back to the same webhook with `action: "image"`, one at a time. There is no separate prompt per scene.

## Routes

### Plan a full script

```json
{"action":"plan","script":"Paste the complete voiceover script here..."}
```

The planner reads the external `Planner Context` tab once, ranks example CSV rows, and uses Vercel AI Gateway `openai/gpt-5-mini` with a structured parser. It returns `totalScenes`, `totalUniqueBackgrounds`, `remainingBackgrounds`, and up to 10 background objects with IDs, linked scene numbers, and background descriptions. It does not call the image model.

### Generate one background image

```json
{"action":"image","background":"A warm illustrated jewelry shop interior with display cases and a sunlit window","backgroundId":"BG001","sceneNumbers":[1,3]}
```

The workflow adds fixed style constraints, reads one approved Drive style anchor, then uses OpenRouter’s Images API with model `openai/gpt-image-2.5-flare`, low quality, 16:9, and `n: 1`. The image route returns `imageData` as a displayable image data URL. The image model is never used for text work.

## Reference source

The workflow reads the `Planner Context` tab in [Fred Storyboard Style and Reference Index](https://docs.google.com/spreadsheets/d/1RL7C_3kg7Ua47R7BnQFi4YvsgDyecIQS7yi1uCAT-gg/edit). It is reference-only and contains 282 rows: 17 style rules, 18 reference-index rows, 81 example 01 rows, and 166 example 03 rows. n8n uses one Sheets read per planning call; it never writes the script or generated images to this sheet.

## Guardrails

- Full storyboard first; image count is capped at 10 unique Background values.
- Browser loop is sequential; one image per n8n execution.
- Only the `Background` field supplies scene-specific image content.
- No characters, animals, body parts, movable props, text, diagrams, logos, or motion are generated.
- No n8n Data Tables, n8n Memory, script/job storage, Drive upload, CSV/SVG export, notifications, or feedback loop.
- `Read Planner Context` has bounded retry settings for transient Sheets errors.

The published graph is authoritative. Import snapshots should be inactive to avoid registering a duplicate webhook. Reconnect saved credentials in n8n after importing on another instance.
