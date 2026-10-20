# Background Delivery and Storyboard Exports

Updated 20 October 2026. This is the implementation plan for moving reviewed background plates to the editing team's Drive folder, notifying them by email, and exporting the storyboard as a visual SVG.

## Current status

- The storyboard CSV is already generated and downloadable inside the n8n workflow.
- The UI source now has a client-side **Download SVG** action. It creates a vector review sheet from the full scene plan already in the browser; it does not call n8n or send image bytes.
- The workflow SDK source now prepares scene-aware file names before the Drive upload. The change is local and has not been published to n8n while the Heroku host is unstable.
- The main Google Sheet now has a `Workflow Settings` tab. `editingTeamEmail` is intentionally blank for Rayvin to fill in; the target and staging folder IDs and a 10-file delivery cap are recorded there.
- The current live workflow still uploads previews to the private staging folder. The combined Drive delivery and email action is not live yet.

## Drive folders and file names

The workflow stages generated plates privately in folder `1CcdOgXEwhyXJ1Dnonzv4AVFWloztgTGn`. The destination supplied for the editing team is folder `153VPM-IBR1T5UIq-TthqtpklyAGwi-UU` (`Demo Test Upload`). The saved n8n Drive credential must be confirmed to have write access to that destination before enabling delivery.

The workflow should assign each plate one stable name using the job's random suffix, the unique background ID, and scene numbers:

```text
fred-{job-suffix}-BG{background-number}-SC-{scene-numbers}.{extension}
```

Example:

```text
fred-12345678-BG001-SC-001-007.png
```

For a plate reused by more than four scenes, the name includes the first four zero-padded scene numbers and a `PLUS-NN` suffix. The spreadsheet remains the complete mapping from that background ID to every scene. Example: `fred-12345678-BG003-SC-001-004-006-009-PLUS-03.jpg`.

The file name is created from the workflow's existing scene-number list before converting and uploading the image. It is reused as the binary name, Drive name, and `imageFileName` in Sheets, so the UI's individual download and ZIP export use the same name.

## Combined delivery and notification

Keep delivery in the existing storyboard workflow. Add a delivery webhook and label its canvas area with a sticky note. The UI action should be **Send to Drive & notify team** and appear after images are ready for review. The browser sends only the job ID; it cannot select an arbitrary folder, email, or Drive file.

The route should:

1. Read `Workflow Settings`, `Storyboard Jobs`, and `Job Results` from Google Sheets and validate that the job exists.
2. Select generated, not-yet-delivered background file IDs for that job. Leave failed and deferred backgrounds visible and report their counts.
3. Move each Drive file from private staging into `teamDriveFolderId`, serially. Moving an existing Drive file keeps its ID and avoids re-uploading image bytes. Confirm that the n8n credential can still serve the UI's private image proxy after the move.
4. Stop after at most 10 files in one execution. If more are ready, return a partial-delivery status and let the UI continue with the next set. Send one email only after all currently generated plates for the job are in the team folder.
5. Use `editingTeamEmail` from `Workflow Settings`; reject an empty or malformed address. Do not accept a `to` address from the public webhook body. Use a saved Gmail credential only after confirming the correct existing credential in n8n.
6. Include the storyboard title, scene count, delivered file names with scene mapping, shared folder link, and counts of failed or deferred plates in the email.
7. Record per-plate delivery state and job-level notification state in Google Sheets. A retry must skip already-moved files and must not send a second email after a recorded successful notification.

This design keeps all image data in Drive and avoids loading a batch of binaries into memory. The workflow sends the email only after the user chooses the combined delivery action, not automatically after image generation.

### Data fields to add when the live workflow can be updated

Add delivery fields to the existing external Sheets records:

- Per background: `deliveryStatus`, `deliveryError`, `teamDriveFileId`, `deliveredAt`.
- Per job: `notificationStatus`, `notificationSentAt`, `notificationError`.

The current sheets are `Job Results` and `Storyboard Jobs`. Do not use n8n Data Tables, Memory, static workflow data, or execution history as the delivery database. Do not add image base64 to Sheets.

There is an unavoidable failure window between a successful Gmail send and saving its success marker. Keep the default retry behavior conservative: if a notification is left in `sending`, show it for review rather than automatically sending another email.

## CSV and SVG exports

- **CSV** remains the structured animator handoff. n8n builds it from the saved scene rows and includes Fred's eight columns plus the background ID, image status, and generation-batch note.
- **SVG** is a visual review sheet created in the browser from the same complete scene data. Each scene card shows timestamp, voiceover, what's happening, background, animator-only notes, on-screen text, transitions, and background ID/status. It contains no embedded generated images and is not a replacement for the CSV.
- Both exports include the complete storyboard. Deferred plate counts stay visible, including the note that more background plates remain for a later batch.
- SVG creation runs locally in the page. It does not trigger text or image generation, use API credits, or add load to n8n.

## Low-load safeguards

- Keep image generation and Drive moves serial, with no more than 10 items per request.
- Move Drive files rather than downloading and re-uploading them for delivery.
- Return a small accepted/status response; keep binaries out of webhook JSON and Sheets.
- Save each file's delivery state before moving to the next item.
- Do not test delivery or publish workflow changes until n8n is healthy and the exact Drive/Gmail credentials and node settings have been verified.
