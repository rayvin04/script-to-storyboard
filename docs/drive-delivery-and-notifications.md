# Drive Delivery and Notifications

## Background images

Each generated image is sent to the delivery workflow. It uploads the PNG to the configured Google Drive output folder and returns the filename and direct Drive link to the web interface.

Use a date, title slug, background ID, and scene list in the filename:

YYYY-MM-DD-title-slug-bg001-scenes-01.png

Each file contains one complete background environment. No split layouts or collage panels are generated.

## Storyboard CSV and email

Select Notify editing team after the storyboard and image batch are ready. The delivery action:

1. Saves the storyboard CSV to the same Google Drive output folder.
2. Appends a process record to the Process Log sheet.
3. Sends an email to the recipient in Workflow Settings.

The email includes the script title, processing date, storyboard CSV link, and links to the generated background PNG files.

The CSV filename is derived from the first non-empty script line:

title-slug-storyboard.csv

## Data storage

Google Sheets stores planner context, approved storyboard references, delivery settings, and process records. Google Drive stores approved visual references and generated files. Persistent data is not stored in n8n tables or memory.
