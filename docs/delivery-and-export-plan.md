# Delivery, Feedback, and Export

## Drive outputs

Store the generated background PNG files and storyboard CSV in the shared output folder. Use descriptive names derived from the script title and stable identities:

- `<YYYY-MM-DD>-<title-slug>-<backgroundId>-scenes-<scene-list>.png`
- `<title-slug>-storyboard.csv`

Each background is a separate full-frame image. The browser packages every generated image into one `<title-slug>-backgrounds.zip` download. The storyboard CSV also remains downloadable from the UI.

## Editing-team email

Read `editingTeamEmail` from the `Workflow Settings` tab. The delivery email uses the script title as its subject context and includes the processing date, a direct storyboard CSV link, direct links to each PNG with its scene numbers, and the shared Drive folder link. Send through the configured account after all image uploads and the CSV upload succeed.

## Process ledger

Append one row to the `Process Log` tab of the existing Google Sheets workbook. Include the processing timestamp, job ID, title, final/partial status, scene count, unique setting count, generated/failed image counts, storyboard filename and URL, shared folder URL, and a compact image manifest.

## Feedback

Each background card sends `jobId`, title, `backgroundId`, scene numbers, Drive file/link, and a rating of `up` or `down`. Validate `backgroundId` and rating before appending the row to `Background Feedback`.

## Storage rule

Google Sheets and Google Drive are the persistent stores. Do not use n8n Data Tables, n8n memory, or other native n8n storage nodes.
