# Storyboard and Background Generation

This workflow is the first stage of the live demo. It receives one complete script, creates a full storyboard CSV, selects up to six distinct background settings, and generates one full-frame background image at a time.

## Flow

1. Validate the script and derive a title from its first non-empty line.
2. Read storyboard examples and planner context from Google Sheets.
3. Create the full storyboard using the fixed eight-column format.
4. Select up to six unique settings from the Background column.
5. Request one background image per setting, sequentially.
6. Send each generated image to the delivery workflow for Google Drive upload.
7. Return the storyboard CSV and image details to the Vercel UI.

The text planner uses OpenAI GPT-5 mini through Vercel AI Gateway. Image requests use OpenAI GPT Image 2.5 Flare through OpenRouter. Google Drive style references guide a consistent hand-drawn 2D line treatment while the location and composition follow each scene.

The generated plates are empty environments only. Characters, movable props, diagrams, on-screen text, and motion are left for animators.

## Naming

Background PNG files use a date, title slug, background ID, and scene list. The storyboard CSV uses the title slug.

- YYYY-MM-DD-title-slug-bg001-scenes-01.png
- title-slug-storyboard.csv

## Persistent data

Google Sheets and Google Drive are the persistent stores. The workflow does not use n8n Data Tables or workflow memory.
