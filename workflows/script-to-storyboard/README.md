# Script to Image Paid Demo

This folder contains the n8n workflow export for the first script-to-storyboard prototype.

## Import

In n8n, choose **Import from File** and select `workflow.json`. The export is inactive. Re-select the saved **GPT 2.5 Flare** Vercel AI Gateway credential if n8n does not resolve the credential reference on import. The workflow file contains credential reference metadata only; it does not contain the API secret.

## Workflow behavior

- `POST /webhook/script-to-storyboard` receives `script`, `maxScenes`, and `aspectRatio`.
- The request validator limits the script to 30,000 characters and the batch to 1–3 scenes.
- `openai/gpt-5.6-luna` plans the scenes; `openai/gpt-image-2.5-flare` generates each image sequentially through Vercel AI Gateway.
- The workflow returns a scene array with image data or per-scene failure state. No shared database, Drive upload, external notification, or feedback retrieval is wired yet.

## Current limits

- The workflow is inactive and has not been run against the paid image endpoint.
- The image request uses 1536×1024 (3:2) output while the planner prompt asks for 16:9 composition.
- The webhook has wildcard CORS and no caller authentication. Add authentication and restrict allowed origins before exposing an active webhook to the public Vercel UI.
- The UI is not connected automatically. Add the webhook URL in the UI settings only after the workflow is safe to activate.
