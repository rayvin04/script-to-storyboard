# Drive Delivery and Notification Workflow

This workflow is the delivery stage used by the live demo.

## Image upload

The generation workflow calls it once for each completed background. It prepares the PNG, uploads the file to the configured Google Drive output folder, and returns the file name and link to the generation workflow.

## Editing-team notification

The Vercel UI calls the notification route when the operator selects Notify editing team. The workflow:

1. Reads the configured recipient from Workflow Settings in Google Sheets.
2. Uploads the storyboard CSV to the background output folder.
3. Appends a delivery record to the Process Log sheet.
4. Sends an email with the title, processing date, CSV link, and generated background links.

## Storage

Google Sheets stores settings and process records. Google Drive stores generated PNG files and storyboard CSV files. The workflow does not use n8n Data Tables or workflow memory.
