# Script to Storyboard — Delivery & Feedback

Live AWS workflow: `KNBiOwM2a2SXvgK2`

Editor: <https://n8n.47-131-239-128.sslip.io/workflow/KNBiOwM2a2SXvgK2>

The generation workflow calls this workflow once per image. It gives each plate a title-aware filename, uploads the image to the shared Google Drive folder, and returns the Drive URL with the image data for the Vercel UI.

The UI sends a completed batch to save the storyboard CSV in the same Drive folder and append one run to the `Process Log` tab. Each log row tracks the timestamp, title, status, scene and image counts, CSV link, folder link, and image manifest.

The editing-team notification uses `editingTeamEmail` from the Google Sheets `Workflow Settings` tab. It includes the script title, processing date, storyboard CSV link, each PNG link with its scene numbers, and the shared folder link. Background cards can submit thumbs-up or thumbs-down feedback to the `Background Feedback` tab.

Google Sheets and Google Drive handle persistent settings, process history, feedback, and generated files. No n8n Data Tables or memory nodes are used.
