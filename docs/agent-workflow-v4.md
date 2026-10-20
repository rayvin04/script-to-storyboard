# Current Workflow Architecture — One Script, Background Plates

This file now describes the simplified implementation and supersedes the older `v4` planning/storage/delivery architecture. See [`fred-agent-context.md`](fred-agent-context.md) for the product rules and source references.

## Sequence

```mermaid
flowchart LR
  UI[One full script] --> Hook[One n8n webhook]
  Hook --> Route{action}
  Route -->|plan| Validate[Validate full script]
  Validate --> Refs[Read Planner Context once from Google Sheets]
  Refs --> Rank[Select relevant CSV examples]
  Rank --> Planner[GPT-5-mini + structured parser]
  Planner --> Package[Full storyboard; dedupe Background values]
  Package --> First10[Return up to 10 unique settings]
  First10 --> UI
  UI -->|action=image, one setting at a time| Hook
  Route -->|image| Style[Read one Drive style anchor]
  Style --> Flare[OpenRouter GPT Image 2.5 Flare]
  Flare --> Return[Return image data URL]
  Return --> UI
```

There is one user input: the full script. The browser orchestrates the image loop and displays each plate as it completes. n8n never holds a multi-image batch in one execution.

## Webhook contract

Both calls use `POST /webhook/fred-image-generation-stage-1` with `Content-Type: text/plain;charset=UTF-8` to avoid a browser preflight. The JSON text body includes an `action` discriminator.

### Plan once

```json
{"action":"plan","script":"The complete narration script..."}
```

The plan branch validates 20–30,000 characters. It reads `Planner Context` from the external reference workbook once, ranks up to 10 relevant rows from each example CSV, sends the full script and compact reference context to `openai/gpt-5-mini`, and parses the full storyboard. Code groups scenes only when normalized `Background` values match exactly and returns at most 10 unique backgrounds.

Expected response:

```json
{
  "ok": true,
  "totalScenes": 20,
  "totalUniqueBackgrounds": 12,
  "generatedBackgroundLimit": 10,
  "remainingBackgrounds": 2,
  "backgrounds": [
    {"backgroundId":"BG001","sceneNumbers":[1,8],"backgroundPrompt":"White background"}
  ]
}
```

The complete storyboard is generated in the planner; this image-first demo returns only the unique Background entries needed by the UI. The image limit does not truncate the story plan.

### Generate one image

```json
{"action":"image","background":"Warm yellow living room with a green sofa, one plant, and a landscape picture","backgroundId":"BG001","sceneNumbers":[2,6]}
```

The image branch combines the Background value with fixed art-style constraints, downloads one style reference from Drive, and calls `openai/gpt-image-2.5-flare` through OpenRouter’s Images API. Use `quality: "low"`, `aspect_ratio: "16:9"`, and `n: 1`. Return one image data URL and optional reported cost. No text-model call occurs in this branch.

## Limits and error handling

- Up to 10 unique images per script, requested sequentially by the browser.
- Each image is one independent n8n execution; do not create an n8n loop or parallel branch.
- No script/job/image persistence; the external Planner Context sheet is read-only.
- If planning fails, make no image calls. If an image fails, preserve completed gallery cards and stop the remaining sequence. Do not retry automatically.
- Bounded Google Sheets retries are configured on the planner read. Report rate-limit failures clearly.
- No n8n Data Tables, n8n Memory, CSV/SVG exports, Drive uploads, email/Slack notifications, or review feedback in this stage.
