# Planner and Image Stage Context

## Goal

Turn a complete narration into a useful, animator-ready storyboard, then create a small set of scene-fit background images. The full storyboard comes first; image generation uses its `Background` column.

## Stage 1: storyboard

Return all scenes in this exact eight-column order:

`Scene, Timestamp, Voiceover, What's happening, Background, Hand-drawn characters & props, On-screen text, Transitions/Motion`

Preserve the full script verbatim and in order in `Voiceover`. Keep timestamps provided by the source. If no timing exists, estimate continuous `mm:ss-mm:ss` timestamps at approximately 145 words per minute. Make each row a clear visual beat. Use one location per `Background` cell, and keep the animator direction concise.

Select up to six distinct settings from the complete storyboard for image generation. The storyboard itself remains complete regardless of how many image prompts are selected.

## Stage 2: backgrounds

Generate one separate full-frame 16:9 environment image per selected setting, sequentially. No collages, triptychs, split screens, or scene panels. The approved reference image supplies a consistent 2D hand-drawn look—bold irregular ink outlines, simple forms, flat colors, and modest shading—while backgrounds vary to match the script.

Generate the empty environment only. Animators add people, characters, movable props, labels, diagrams, and movement. The prompt may include fixed architectural or environmental details from the setting but must not add invented characters or text.

## External data and operations

Use the Google Sheets reference workbook for the example CSVs, style notes, workflow settings, process ledger, and image ratings. Use the shared Google Drive folder for the generated PNG files and storyboard CSV. Do not use n8n Data Tables or n8n memory for persistent storage.

After successful processing, the UI can download the storyboard CSV and all available background images as a single ZIP. The editing-team email includes the script title, processed date, storyboard CSV link, image links, and shared folder link. Each rating records `backgroundId` and `rating` (`up` or `down`) in Google Sheets.
