# Fred Script-to-Backgrounds — Simple

Current n8n workflow ID: `QRPeaK5ayX9ZC5Zx`  
Editor: [open in n8n](https://n8n-rayv-742595626609.herokuapp.com/workflow/QRPeaK5ayX9ZC5Zx)  
Production webhook: `POST /webhook/fred-image-generation-stage-1`

The workflow accepts **one full script** from the UI’s single Generate action. The fixed sequence is always: (1) create the complete storyboard, then (2) generate up to 10 unique background plates from the storyboard’s `Background` values. The browser automatically orchestrates the two stages through lightweight calls to this same webhook; the user does not choose a mode, and no AI decides whether to storyboard or generate images.

The two internal request types are intentional: `action: "plan"` is always the first call, and `action: "image"` is sent only after the planner returns the storyboard. Each image call is sequential and contains one background so the Heroku host does not have to hold a full storyboard run and a batch of image payloads in one execution.

## Routes

### Plan a full script

```json
{"action":"plan","script":"Paste the complete voiceover script here..."}
```

The planner reads the external `Planner Context` tab once, ranks example CSV rows, and uses Vercel AI Gateway `openai/gpt-5-mini` with a structured parser. It returns `scenes`, `storyboardCsv`, `totalScenes`, `totalUniqueBackgrounds`, `remainingBackgrounds`, and up to 10 background objects with IDs, linked scene numbers, and background descriptions. The UI displays the complete storyboard in a table and provides the returned CSV for download. Planning does not call the image model.

### Generate one background image

```json
{"action":"image","background":"A warm illustrated jewelry shop interior with display cases and a sunlit window","backgroundId":"BG001","sceneNumbers":[1,3]}
```

The workflow adds fixed style constraints, reads one approved Drive style anchor, then uses OpenRouter’s Images API with model `openai/gpt-image-2.5-flare`, low quality, 16:9, and `n: 1`. The image route returns `imageData` as a displayable image data URL. The image model is never used for text work.

## Reference source

The workflow reads the `Planner Context` tab in [Fred Storyboard Style and Reference Index](https://docs.google.com/spreadsheets/d/1RL7C_3kg7Ua47R7BnQFi4YvsgDyecIQS7yi1uCAT-gg/edit). It is reference-only and contains 282 rows: 17 style rules, 18 reference-index rows, 81 example 01 rows, and 166 example 03 rows. n8n uses one Sheets read per planning call; it never writes the script or generated images to this sheet.

## Guardrails

- Full storyboard and CSV first; image count is capped at 10 unique Background values.
- Browser loop is sequential; one image per n8n execution.
- Only the `Background` field supplies scene-specific image content.
- No characters, animals, body parts, movable props, text, diagrams, logos, or motion are generated.
- No n8n Data Tables, n8n Memory, script/job storage, Drive upload, SVG export, notifications, or feedback loop. The CSV comes from the planner response and is not stored.
- `Read Planner Context` has bounded retry settings for transient Sheets errors.

The published graph is authoritative. Import snapshots should be inactive to avoid registering a duplicate webhook. Reconnect saved credentials in n8n after importing on another instance.
