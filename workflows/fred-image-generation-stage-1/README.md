# Fred image generation — Stage 1

This is the deliberately small first working slice of the storyboard demo. It accepts one scene description, downloads two approved visual references from Fred's Google Drive folder, sends one low-quality 16:9 image request to OpenRouter's dedicated Images API, and returns the PNG to the web UI.

## Live workflow

- Name: **Fred Image Generation - Stage 1**
- Workflow ID: **QRPeaK5ayX9ZC5Zx**
- n8n editor: https://n8n-rayv-742595626609.herokuapp.com/workflow/QRPeaK5ayX9ZC5Zx
- Production webhook: POST /webhook/fred-image-generation-stage-1
- Public UI: https://script-to-storyboard-six.vercel.app/
- Reference backup of the former workflow: **Script to Image Paid Demo - Reference Backup**, ID **wGOMRtREoqFDUgqj**

The reference backup preserves the old 79-node workflow as a guide. It remains inactive and was not edited. The former **Script to Image Paid Demo** workflow remains separate.

## Request and response

Send JSON with a prompt field. The workflow accepts 20–2,500 characters and creates exactly one image per call.

    {"prompt":"A young man sits on a green sofa in a yellow living room, looking at a silent phone with a puzzled expression."}

On success, the webhook returns the fields ok, model, mimeType, costUsd, and imageData. imageData is a PNG data URL that the browser can render directly. The formatter also emits the PNG as n8n binary data, visible in the execution's Binary view.

## Workflow path

1. Image Test Webhook accepts the browser request.
2. Prepare Image Request validates the prompt and appends the fixed style rules.
3. Download Style References fetches normal man.png and yellow living room.png through the saved Google Drive credential.
4. Build Flare Image Request embeds those two actual image files as input_references.
5. Generate with GPT Image Flare calls openai/gpt-image-2.5-flare through OpenRouter's image-generation endpoint using the saved GPT 2.5 Image Flare credential. This endpoint is used only to generate images.
6. Format Image Result returns the image data URL, cost, and a binary preview.
7. Respond with Image JSON returns the result to the UI.

The request uses n=1, quality=low, and aspect_ratio=16:9. The optional output_compression value was removed after the provider rejected the request unless a JPEG/WebP output format is also selected.

## Storage and scope

This workflow has no n8n Data Table, n8n storage, database, job polling, storyboard planner, review loop, Drive upload, or notification nodes. Google Drive is only used to read the two approved reference images. Google Sheets will be used for any later persistent review or feedback data; no storage is needed for this image-only stage.

The web page submits one image prompt, shows the returned image, and downloads the PNG. CSV export, batch scenes, ratings, Google Drive delivery, Slack/email notifications, and the Agent review loop are later stages.

## Verified test

Manual execution 2340 succeeded on 20 October 2026. Both Drive references were downloaded; OpenRouter returned HTTP 200 from provider OpenAI with a PNG. n8n created a 1.29 MB binary preview and returned a base64 PNG data URL to the response node. Reported provider cost: **$0.028384** for that image.

Manual execution 2339 did not generate an image. It surfaced the unsupported optional compression parameter; the workflow was corrected before execution 2340.

## Credentials and access

Credentials remain saved inside n8n and are not included as secrets in this repository. The workflow's browser CORS setting allows https://script-to-storyboard-six.vercel.app. CORS does not authenticate direct API clients. The webhook is publicly callable when the workflow is published, so keep requests to one image while the demo endpoint has no authentication or rate limit.

## Import

workflow.json is the latest n8n export for this stage. Import it into n8n and select the saved Google Drive and OpenRouter credentials if n8n does not map their credential IDs on import. The workflow is kept in its own folder so it can be managed separately from the reference backup and the older storyboard workflow.

