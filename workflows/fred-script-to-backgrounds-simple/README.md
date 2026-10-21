# Script to Storyboard — generation workflow

The UI sends one complete script to the storyboard planner. It returns the full eight-column storyboard CSV plus at most six distinct, scene-matched background settings.

The UI then requests one selected setting at a time, sequentially. Each request generates one full-frame 16:9 background and passes it to the delivery workflow for Google Drive upload. The returned image is displayed in the UI with its Drive link and feedback controls.

The planner reads examples and style guidance from the external Google Sheets workbook. Timestamps from the script are preserved; absent timestamps are estimated as continuous ranges. The complete storyboard remains intact even when only six backgrounds are selected for generation.

## Workflow behavior

- `Background` cells describe one concise environment and composition.
- Separate scene changes are represented by separate rows.
- The image model sees the selected setting and approved style reference, and generates an empty background only.
- Names follow `<date>-<title>-<backgroundId>-scenes-<scene-list>.png`.
- CSV output is named from the script title; the UI offers both CSV and all-images ZIP downloads.
- Google Sheets and Google Drive are the only persistent stores. No n8n Data Tables or memory nodes are used.
