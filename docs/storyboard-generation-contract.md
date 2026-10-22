# Storyboard Generation Contract

## Purpose

Turn one complete narration into an animator-ready storyboard, then use its Background descriptions to generate up to six matching background plates.

## Storyboard planning

- Read the complete submitted script. Do not silently truncate, reorder, paraphrase, or omit narration.
- Consult the approved storyboard examples and planner context in Google Sheets for every run.
- Return a complete scene-by-scene CSV using these exact columns and order:
  Scene, Timestamp, Voiceover, What's happening, Background, Hand-drawn characters & props, On-screen text, Transitions/Motion.
- Preserve supplied timecodes. When none are supplied, estimate continuous timestamps from the narration.
- Make scene beats specific and useful to animators. Split scenes when the setting or visual beat changes.
- Keep transitions concise. Use short notes such as "Hard cut", "Zoom on icon", "Text fades in", or "Static".
- On-screen text should identify meaningful labels, headings, comparison terms, or short emphasis words that fit the narration and the reference style.

## Background generation

- Select up to six distinct settings from the complete storyboard.
- Generate each image as one separate full-frame landscape 16:9 environment, sequentially.
- Maintain a consistent hand-drawn 2D look with bold slightly irregular outlines, simplified shapes, flat colors, and restrained shading.
- Let the scene determine its location, palette, architecture, and composition.
- Generate backgrounds only. Exclude people, characters, animals, faces, bodies, hands, movable props, diagrams, symbols, readable text, captions, logos, watermarks, interface elements, borders, panels, and motion effects.
- Leave clear space for animators to add characters and props by hand.

## Persistent storage

Use Google Sheets for approved storyboard examples, planner context, delivery settings, and the process log. Use Google Drive for approved visual references and generated PNG and CSV files. Do not use n8n Data Tables or workflow memory for persistent storage.
