# Script to Image Paid Demo

This folder contains the n8n workflow export for the first script-to-storyboard prototype.

## Import

In n8n, choose **Import from File** and select `workflow.json`. The export is inactive by default. Re-select the saved **GPT 2.5 Flare** Vercel AI Gateway credential if n8n does not resolve the credential reference on import. The workflow file contains credential reference metadata only; it does not contain the API secret.

## Workflow behavior

- The UI calls the persistent production route `POST /webhook/script-to-storyboard`; there is no URL field in the app.
- The browser sends JSON as `text/plain` to avoid an `OPTIONS` preflight. `Normalize Request` parses that body and also accepts object bodies for manual n8n testing.
- CORS allows the stable app origin `https://script-to-storyboard-six.vercel.app`.
- The request validator limits the script to 30,000 characters and the batch to 1–3 scenes.
- `openai/gpt-5-mini` plans the scenes; `openai/gpt-image-2.5-flare` generates each image sequentially through Vercel AI Gateway. The text model node must use a language model; the image model is called separately through the image-generation endpoint.
- The workflow returns a scene array with image data or per-scene failure state. No shared database, Drive upload, external notification, or feedback retrieval is wired yet.

## Current limits

- The GitHub export remains inactive on import. The connected n8n instance uses the published workflow version. A paid end-to-end generation has not been run in this session.
- The image request uses 1536×1024 (3:2) output while the planner prompt asks for 16:9 composition.
- CORS is restricted to the stable Vercel UI origin, but CORS is not caller authentication. Before wider public use, put an authenticated, rate-limited server-side proxy in front of this paid webhook.
- The workflow uses the production webhook, so it does not depend on **Listen for test event**. Each requested scene can incur an image-generation charge.

