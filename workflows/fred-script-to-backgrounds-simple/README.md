# Fred Script-to-Backgrounds — MVP

Live n8n workflow: `QRPeaK5ayX9ZC5Zx`
Editor: [open the workflow](https://n8n.47-131-239-128.sslip.io/workflow/QRPeaK5ayX9ZC5Zx)
Production endpoint: `POST /webhook/fred-image-generation-stage-1`

## One request, one result

The frontend sends the title and complete narration script once. This workflow first plans the entire storyboard, validates that every narration word is preserved in order, and packages the full CSV. Only after storyboard validation succeeds does it choose up to three distinct background settings and generate images sequentially.

The browser makes one webhook request. It does not send separate planning/image calls, poll for status, or retry automatically.

## Workflow sequence

1. Webhook receives `{ "title": "...", "script": "..." }`.
2. Validate the full script (20–30,000 characters) without truncating it.
3. Read Fred’s style rules and storyboard examples from the existing Google Sheets reference workbook.
4. Use the existing text model and structured output parser to create all storyboard scenes.
5. Validate full narration coverage and generate the complete CSV.
6. Select up to three distinct backgrounds spaced across the full storyboard.
7. For each selected background, in a batch-size-one loop, load the approved Drive style reference and call OpenRouter `openai/gpt-image-2.5-flare`.
8. Aggregate images with their background IDs and scene numbers and return one JSON response.

## Storyboard CSV

The CSV always uses these exact columns and order:

`Scene, Timestamp, Voiceover, What's happening, Background, Hand-drawn characters & props, On-screen text, Transitions/Motion`

It contains every planned scene. Timestamps stay blank when the input does not provide them. The workflow checks that the ordered Voiceover cells contain the entire source script; if that check fails, it returns an error and starts no image generation.

## Image selection and style

- Maximum: three images per request, generated one at a time.
- The selected settings are sampled from across the complete scene sequence, not simply the first three scenes.
- Each image is tied to a `backgroundId` and its storyboard `sceneNumbers`.
- Fred’s Drive reference controls drawing style only: hand-drawn 2D cartoon, bold slightly irregular black ink outlines, simplified shapes, flat color, and minimal shading.
- The scene’s `Background` field determines the environment and composition. The reference room is not copied unless that setting fits the script.
- Outputs are background plates only. Characters, animals, body parts, hands, movable foreground props, diagrams, lettering, logos, watermarks, and motion marks are excluded.

## Response

On success, the single webhook response includes `ok`, `title`, the complete `storyboardCsv`, scene and image counts, the deferred-background count, and an `images` array. Successful image entries include `imageData` as a data URL, `mimeType`, `backgroundId`, and `sceneNumbers`. Failed image entries retain their scene identity and include an error. A storyboard failure returns an error response before images are attempted.

The UI displays the returned images and provides a CSV download. It does not render the full storyboard table.

## Data handling

The workflow reads its reference materials from Google Sheets and Google Drive. It does not use n8n Data Tables or memory, store scripts or results in an application database, upload generated images to Drive, or duplicate the full storyboard inside each loop item. Successful execution payload saving is disabled to avoid retaining image base64 in execution history.

## AWS migration status

- Published graph: active version `1e27e289-e000-4448-b432-e08d87d4b7d6`; 21 nodes, one webhook trigger, and one final response node.
- Workflow graph validation returned no warnings.
- Frontend syntax and whitespace checks passed locally.
- The existing Heroku Postgres database was dumped and restored into the AWS-hosted Postgres instance. The restored database contains 30 workflows and 45 credentials; the original Heroku app and database remain untouched as rollback.
- The AWS n8n service is healthy at the HTTPS editor URL above. Its matching 2.44.4 external JavaScript/Python task runner has registered with the n8n task broker.
- The Caddy HTTPS health endpoint returned HTTP 200. A full storyboard-to-image request and the deployed UI image display still require an end-to-end check.
- AWS hosting is the approved $24/month Lightsail plan. The AWS deployment is temporary; Heroku remains available for rollback.

## Importing the snapshot

`workflow.json` is an inactive source snapshot of the published graph. Keep it inactive when importing so it does not register a duplicate webhook. Reconnect credentials in the destination n8n instance.
