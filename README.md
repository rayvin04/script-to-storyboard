# Script to Storyboard Lab

This demo takes one complete narration script and produces a full scene-by-scene storyboard plus up to six sequentially generated, scene-matched background plates. The storyboard is retained in full even when the image run is limited to six backgrounds.

## What it does

- The planning workflow reads the entire script and the approved CSV examples/style notes from the Google Sheets reference workbook.
- It returns the storyboard with the eight required columns, continuous timestamps when no source timecodes exist, and concise animator notes.
- The image workflow creates one full-frame 16:9 background image per selected setting, one request at a time.
- Completed backgrounds are saved to the shared Google Drive folder with title, date, background ID, and scene numbers in each filename.
- The storyboard CSV is saved to that folder, and the Process Log tab tracks each completed or partial run.
- The UI supports a single ZIP download for all generated images, CSV download, email notification, and per-image thumbs up/down feedback.

Only background environments are generated. Animators add characters, movable props, text, diagrams, and motion by hand. The approved reference image guides linework and color treatment; it does not lock scenes to one location or composition.

## Live project resources

- Vercel UI: [Script to Storyboard Lab](https://script-to-storyboard-six.vercel.app/)
- Generation workflow: ID `QRPeaK5ayX9ZC5Zx` ([open in n8n](https://n8n.47-131-239-128.sslip.io/workflow/QRPeaK5ayX9ZC5Zx))
- Delivery and feedback workflow: ID `KNBiOwM2a2SXvgK2` ([open in n8n](https://n8n.47-131-239-128.sslip.io/workflow/KNBiOwM2a2SXvgK2))
- Reference and operations workbook: [Google Sheets workbook](https://docs.google.com/spreadsheets/d/1RL7C_3kg7Ua47R7BnQFi4YvsgDyecIQS7yi1uCAT-gg/edit)
- Shared output folder: [Google Drive](https://drive.google.com/drive/folders/153VPM-IBR1T5UIq-TthqtpklyAGwi-UU)

## Workflow files

- Generation and delivery workflow exports are stored in `workflows/`.
- `docs/storyboard-style-guide.md` — storyboard and background image rules.
- `docs/agent-context.md` — planner and image-stage contract.
- `docs/delivery-and-export-plan.md` — Drive, email, feedback, and process-log requirements.

All persistent reference and process data belongs in Google Sheets/Drive. Do not use n8n Data Tables or workflow memory for storage.
