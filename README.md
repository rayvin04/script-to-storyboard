# Fred’s Script-to-Storyboard Demo

An incremental prototype for Fred’s YouTube animation workflow. The current milestone checks one core path: a scene description and two approved Drive reference images go to GPT Image Flare, then the generated frame returns to the UI.

## Current milestone: Stage 1 image test

The live n8n workflow is **Fred Image Generation - Stage 1**, ID **QRPeaK5ayX9ZC5Zx**. Its export and node-by-node guide are in [the Stage 1 workflow folder](workflows/fred-image-generation-stage-1/README.md).

This workflow creates one low-quality 16:9 image per request. It reads the approved character and room references from Google Drive, calls OpenRouter's dedicated Images API for image generation only, and returns a PNG data URL plus an n8n binary preview. It does not use n8n Data Tables or other n8n storage.

Manual execution 2340 returned a PNG at a reported cost of $0.028384. The production UI test (execution 2341) also succeeded: the page displayed the generated PNG and confirmed the download action, at a reported cost of $0.028414. The stable URL now points to the Stage 1 UI.

The old 79-node workflow was duplicated as **Script to Image Paid Demo - Reference Backup**, ID **wGOMRtREoqFDUgqj**. Both it and the original complex workflow (**rV2JjknCieGGXRNL**) are inactive. The original is preserved unchanged; the new 8-node Stage 1 workflow is the only active storyboard workflow.

## What comes later

Once the single-image path is verified through the public UI, add the next workflow stages one at a time: a five-scene storyboard plan in Fred's CSV format, Google Sheets for review metadata, then Google Drive delivery and the editing-team notification. Do not add n8n Data Tables or use n8n's native storage for persistence. Keep Flare for images only.

## Project files

- public/ — static Vercel UI; workflow-api.js contains the fixed Stage 1 webhook route.
- workflows/fred-image-generation-stage-1/ — current workflow export and Stage 1 guide.
- workflows/script-to-storyboard/ — earlier storyboard workflow and its historical notes.
- docs/fred-agent-context.md and docs/fred-style-guide.md — Fred's reference analysis and project context.
- docs/agent-workflow-v3.md — historical design notes for the former complex workflow.
- docs/Freds_Storyboard_Analysis.docx — human-readable reference analysis.

## Local verification

Run Node syntax checks for the static UI files, then serve the public folder to inspect the page:

    node --check public/app.js
    node --check public/workflow-api.js

The Vercel project uses Framework Preset Other and Output Directory public. Provider credentials stay in n8n; do not place them in the browser code.

