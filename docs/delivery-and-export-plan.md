# Background Delivery and Storyboard Exports

Updated 21 October 2026.

## Current status

- The storyboard/image flow remains a single script submission followed by up to nine sequential, full-frame background generations.
- The UI source adds **Save backgrounds to Google Drive**. It sends each completed image to `POST /webhook/fred-save-background-to-drive`, one image at a time.
- The upload route validates the image data URL and scene identity, limits each image to 12 MB, and uses the saved personal Google Drive credential to upload into the shared `Demo Test Upload` folder.
- Filenames use `YYYY-MM-DD-title-background-ID-scenes-NN.ext`. Each upload response returns a Drive file ID and link, which the UI adds to the matching image card.
- The credential and destination are configured in the workflow. The upload has not yet passed a live write check, so credential write access remains unverified.
- Team email notification, SVG export, and delivery logging are later steps. The current Drive button does not send an email or write a Google Sheet.

## Drive folders and file names

The current demo destination is `153VPM-IBR1T5UIq-TthqtpklyAGwi-UU` (`Demo Test Upload`). The workflow receives one generated image from the UI and uploads those bytes directly. It creates no staging rows and writes no image binaries to Google Sheets.

Each generated plate is named with the date, sanitized storyboard title, unique background ID, and related scene numbers:

```text
YYYY-MM-DD-{title}-BG{background-number}-scenes-{scene-numbers}.{extension}
```

Example:

```text
2026-10-21-coffee-beans-BG001-scenes-01-07.png
```

If a plate serves several scenes, all associated scene numbers are included in the name.

## Delivery route

The UI sends the storyboard title, background ID, scene numbers, MIME type, and generated image data. It does not accept a destination folder or email recipient from the browser.

The route handles one image per request, writes the file to the fixed demo folder, and returns the uploaded file's metadata. The route never calls the image model. The UI serializes uploads and remembers which cards already have a file ID, so a later attempt can continue with remaining images.

The button becomes available after at least one background is complete. The UI marks each card saved after receiving a file ID and link. A failed upload stops the sequence and asks the user to check Drive before retrying, because a slow request may have completed even if the response timed out.

## CSV and SVG exports

- **CSV** is generated in the n8n response from the complete storyboard and downloaded by the browser. It is not saved to Google Sheets.
- The browser derives the CSV filename from the script’s first line or topic sentence, sanitizes it, and appends `-storyboard.csv`.
- **SVG** export is not part of this delivery stage.

## Load and storage safeguards

- Generation is explicit, serial, and capped at 10 unique backgrounds per request.
- Saving is user-triggered and each image is uploaded separately.
- Image data is never written to Google Sheets. The project does not use n8n Data Tables or Memory.
- Email notifications are not enabled. No image generation is performed by a code/configuration check.
