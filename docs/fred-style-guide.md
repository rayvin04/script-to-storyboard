# Fred's Background Storyboard Visual Brief

**Version:** background-first prototype v4 · **Updated:** 20 October 2026

## Product contract

The user pastes a full script. AI 1 builds the complete, scene-by-scene storyboard using Fred's eight-column CSV format. AI 2 makes **background plates only** for selected storyboard rows. This prototype can generate at most **10 distinct background plates per batch**; a longer storyboard remains complete, and any remaining plates are clearly marked for a later batch.

The goal is to remove the animator's manual work of figuring out where each beat happens and painting its environment. Animators still draw every character, body part, prop that moves, overlay, and animation layer.

## Two-stage sequence

1. **Storyboard planner (text model):** read the style guide, reference index, and both imported example sheets; segment the entire supplied script into visual beats; return the full CSV-shaped storyboard. Preserve exact script excerpts and supplied timecodes. For script-only input, leave timestamps empty.
2. **Background generator (image model):** after the plan is available for review, use only each selected row's `Background` field plus the shared art-style rules. Generate no more than 10 distinct plates in one batch. Save the image file to Drive and record its ID and status in Google Sheets.

GPT Image 2.5 Flare is for images only. Text planning, retrieval, CSV creation, validation, and cost/scene bookkeeping use the text model or deterministic code.

## Fred's scene CSV contract

Keep these source fields, in this exact order:

| CSV column | Planner rule | Image-generator rule |
| --- | --- | --- |
| `Scene` | Sequential number for every visual beat in the full script. | Never used to invent image content. |
| `Timestamp` | Copy exact provided timecode. Empty when none was supplied. Never estimate. | Never used to draw a clock, timeline, or time label. |
| `Voiceover` | Exact excerpt from the supplied script. Do not paraphrase facts. | Never sent as visual subject matter. |
| `What's happening` | One concise, animator-readable action for that beat. Split if narration changes visual idea or the source CSV shows a cut. | Never sent to the image model. |
| `Background` | A custom-fit setting, environment, or abstract field that makes the beat easy to animate. | The **only scene-specific visual description** sent to image generation. |
| `Hand-drawn characters & props` | People, anatomy, loose props, diagrams, and moving layers the animator draws. | Excluded completely from the image request. |
| `On-screen text` | Exact overlay copy, otherwise blank. | Excluded completely; no letters, labels, captions, or UI in the plate. |
| `Transitions/Motion` | Preserve edit cues such as hard cut, zoom, fade, or movement. | Excluded completely; render a static environment. |

Workflow-only fields may follow the eight source fields: `Background ID`, `Background image status`, and `Generation batch note`. Keep the original eight columns intact so the team can review or export the plan in Fred's format.

## What the references show

The two source workbooks are native Google Sheets used as the planner's examples:

- `01_every_weird_body_glitch`: **81 rows**, ending at **17:14**. Median scene span is 11 seconds; mean 12.7 seconds; longest 39 seconds. Rows alternate topic menus, living-room and city vignettes, chalkboard explanations, abstract gradients, anatomy inserts, and diagrams. Some long rows contain multiple cuts and should become multiple storyboard beats.
- `03_strangest_things_your_body_does`: **166 rows**, ending at **15:18**. Median span is 5 seconds; longest 14 seconds. Yellow infographic panels recur alongside kitchens, streets, rooms, and office environments.

The first storyboard includes examples such as a yellow-wall/green-couch room, gray city, white kitchen, green chalkboard, blue and pink gradients, dark hospital corridor, and open field. These are **different settings in one shared drawing style**. The living room is not a universal background template.

Reference priority: Fred's supplied CSV rows and topic-matched videos establish scene pacing and background choices. The channel pages provide broader packaging context. Drive character sheets are evidence for line style only; do not copy a person or character into a generated background.

## Shared art style; scene-specific setting

- Use the same hand-drawn cartoon language throughout: bold, slightly irregular black outlines; clear simple shapes; flat color fills; sparse details; restrained, simple shading.
- Use a palette that fits the specific setting: warm yellow/cream/ochre, amber and brown, charcoal, green, coral, or blue. Do not force every scene into yellow and green.
- Use simple perspective and recognizable environmental shapes. A background can be a complete location (room, street, kitchen, classroom, hospital, field) or a deliberately simple color/gradient field when that is what the storyboard calls for.
- Static environmental architecture and built-in set dressing may appear **only when stated in `Background`**: walls, floor, window, shelves, chalkboard, landscape, sofa, table, plants, lamps, and similar fixed elements.
- Exclude people, faces, animals, silhouettes, body parts, hands, organs, clothing, phones, pills, handheld objects, diagram symbols, text, logos, borders, UI, and anything the storyboard places in `Hand-drawn characters & props`, `On-screen text`, or `Transitions/Motion`.
- Keep the plate static and clean. Do not add animation trails, arrows, zoom effects, split-screen dividers, or motion blur.
- A Drive image that contains a character may only guide line weight and flat-color treatment. It is not a subject reference. The planner must not ask the image model to reproduce any subject in that source image.

## Background prompt template

Use the shared style plus the exact `Background` value. Do not add story action from adjacent storyboard fields.

> Create one clean, static 16:9 environment/background plate in Fred's consistent hand-drawn 2D cartoon style: bold, slightly irregular black ink outlines, simple readable shapes, flat color fills, and restrained shading. **Setting only:** `[Background]`. Make this setting specific to this storyboard beat, with simple perspective and enough clear space for hand-drawn characters to be added later. Include only fixed environmental features explicitly named in the setting. No people, characters, animals, faces, bodies, hands, organs, clothing, loose props, readable text, labels, logos, watermarks, UI, borders, motion, or animation effects. Use the scene's appropriate palette; do not default to the living-room palette when the setting differs.

The prompt is intentionally built from `Background` alone. Never concatenate `What's happening`, voiceover, character/prop instructions, overlay text, transitions, review comments, or arbitrary user prompt text.

## Full storyboard and 10-image cap

- The storyboard always covers the full script. Do not truncate it to fit an image quota.
- Identify a background plate for each scene. Reuse a plate only when both setting and framing truly match; do not merge scenes just because both say “yellow wall.”
- Assign stable IDs (`BG001`, `BG002`, …) to distinct plates and attach them to all scenes that use them.
- The first generation batch contains at most 10 unique IDs. Any further distinct plates keep their complete storyboard rows and are marked `deferred`.
- Show this message in the UI and in the CSV's batch-note column: **“This is the full storyboard. More background plates remain for a later batch.”** Include the actual deferred count when known.
- A later batch may request another set of at most 10 deferred IDs. Never exceed 10 image calls for one generation request.
- Generate sequentially, save each result to Google Drive, and write its status before moving to the next plate. One failure should not discard successful images or storyboard rows.

## Retrieval and persistence

On every planning run, read these external references:

1. [Fred Storyboard Style and Reference Index](https://docs.google.com/spreadsheets/d/1RL7C_3kg7Ua47R7BnQFi4YvsgDyecIQS7yi1uCAT-gg/edit?ouid=112934907610360798465): `Style Guide` and `Reference Index` tabs.
2. [Storyboard example 01](https://docs.google.com/spreadsheets/d/1LTU3tWF92dzKXzMDPZtV09uQhTqeBGFfDj3TxhJ-xq0/edit?usp=drivesdk): `01_every_weird_body_glitch`.
3. [Storyboard example 03](https://docs.google.com/spreadsheets/d/1z3zC8r8Ew93j22QvGRQXcqfeHF-vEMlUa9hDsA_5QOc/edit?usp=drivesdk): `03_strangest_things_your_body_d`.

Use Google Sheets for style, source index, storyboard, and job/status rows; use Google Drive for image files. **Do not use n8n Data Tables, n8n Memory, or n8n storage as the database.** A CSV download must be assembled by a node in the same n8n workflow, then returned to the UI.

The first retrieval version is an auditable sheet-backed reference lookup with a small number of relevant source rows. It is not vector RAG. Add embeddings/vector search only if tested retrieval misses useful examples. Feedback can later become human-approved prompt examples; it is not model-weight training.

## Acceptance checklist

- [ ] Full supplied script is represented in sequential, understandable rows.
- [ ] All eight Fred CSV fields are present and in order.
- [ ] Exact quotes/timecodes are preserved; missing timestamps are blank.
- [ ] `Background` is specific to the scene; other scene columns remain animator metadata.
- [ ] The output art style looks consistent while environments vary appropriately.
- [ ] Generated plates contain no people, animals, bodies, props, overlays, or motion.
- [ ] One batch produces no more than 10 distinct images.
- [ ] Deferred plates are named in the UI and in the downloaded CSV.
- [ ] Images reach Google Drive and are previewable through the UI without publishing the Drive files publicly.
- [ ] Image cost is visible when the provider returns usage data; no image model call is used for text.

## Source ledger

- [EverythingProfessor](https://www.youtube.com/@EverythingProfessor), [The Historian Professor](https://www.youtube.com/@TheHistorianProfessor), [WildlifeProfessor](https://www.youtube.com/@WildlifeProfessor), [EverythingProfessor Compilations](https://www.youtube.com/@EverythingProfessorComps).
- [Earlier reference video](https://drive.google.com/file/d/1eRmvxfh5Ju4cOmTdWt4FSQCsohyM4ISW/view?usp=sharing), [script/voiceover folder](https://drive.google.com/drive/u/1/folders/1q_BkGppDA4k189FXZxXewRWi9yJF_r4H), and [character/style folder](https://drive.google.com/drive/folders/1KLTxXSsptR9OguL30DCBLX72GX2rtUBo?usp=sharing).
- [Every Weird Body Glitch video](https://www.youtube.com/watch?v=meH-Q1XgLBs), [matching script](https://docs.google.com/document/d/19D5RIF-E3ZB-fs_esrgCIw65Mt3jPjBAc2YzREyOvKE/edit?tab=t.0), and the workbook above.
- [Strangest Things Your Body Does to Keep You Alive video](https://www.youtube.com/watch?v=7tPPGl6Q_9I), [matching script](https://docs.google.com/document/d/1vtfXQZaVTlnAxQ4tUsJ2QuKrXiQl7PR4kdYjMc-gsKY/edit?tab=t.0#heading=h.gzdctbyeq5dv), and the workbook above.
- [Rayvin's portfolio](https://rayvingianan.r4yv.tech/), [Shop Floor Agent repository](https://github.com/rayvin04/shop-floor-ai-rayvin-gianan), and [Shop Floor Agent demo](https://shop-floor.r4yv.tech/).
- [OpenRouter GPT Image 2.5 Flare](https://openrouter.ai/openai/gpt-image-2.5-flare) and [OpenRouter Images API guide](https://openrouter.ai/blog/tutorials/image-generation/).
