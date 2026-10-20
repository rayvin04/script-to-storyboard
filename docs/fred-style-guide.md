# Fred's Background Storyboard Visual Brief

**Version:** simplified one-script prototype · **Updated:** 20 October 2026

## Product contract

The user pastes one full script once. AI 1 plans the complete, scene-by-scene storyboard using Fred's eight-column format. AI 2 makes **background plates only** for up to **10 distinct settings**, serially. If the complete plan has more than 10 unique settings, the UI reports how many remain for a later run. The UI offers the full storyboard as a CSV download without persisting it.

The goal is to remove the animator's manual work of figuring out where each beat happens and painting its environment. Animators still draw every character, body part, prop that moves, overlay, and animation layer.

## Two-stage sequence

1. **Storyboard planner (text model):** read the consolidated `Planner Context` reference tab once; segment the entire supplied script into visual beats; build the full eight-column storyboard. Preserve exact script excerpts and supplied timecodes. For script-only input, leave timestamps empty.
2. **Background generator (image model):** use only each selected row's `Background` field plus the shared art-style rules. Generate no more than 10 distinct plates, one request at a time. Return each image to the browser; do not store it in this prototype.

GPT Image 2.5 Flare is for images only. Text planning and reference retrieval use the text model or deterministic code.

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

These eight fields are the planner's internal structured output. The current UI displays generated backgrounds and offers the full storyboard as a downloadable CSV.

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

- The storyboard always covers the full script. Do not truncate it to fit an image quota. Before image requests, verify that the ordered Voiceover words cover the submitted script without omissions, repeats, or reordering.
- Identify a background plate for each scene. Reuse a plate only when both setting and framing truly match; do not merge scenes just because both say “yellow wall.”
- Assign temporary IDs (`BG001`, `BG002`, …) to distinct plates and attach their scene numbers.
- Generate at most 10 unique backgrounds sampled across the full storyboard. Report the remaining count in the UI.
- The browser requests one image at a time. One failure should not remove images already shown; stop the remaining requests and display the error.
- Do not claim that a later batch, file export, or image persistence is implemented in this prototype.

## Retrieval and persistence

The current workflow reads the consolidated external reference data on every planning run:

1. [Fred Storyboard Style and Reference Index](https://docs.google.com/spreadsheets/d/1RL7C_3kg7Ua47R7BnQFi4YvsgDyecIQS7yi1uCAT-gg/edit): the `Planner Context` tab contains 17 style-guide rows, 18 reference-index rows, 81 example-01 rows, and 166 example-03 rows.

Use Google Sheets only as read-only reference material in this stage. Do not write scripts or generated results to any database. This is an auditable sheet-backed retrieval step, not vector RAG; rows from both CSV examples are ranked by keyword overlap before a compact selection is passed to the text model.

## Acceptance checklist

- [ ] Full supplied script is represented in sequential, understandable rows.
- [ ] All eight Fred CSV fields are present and in order.
- [ ] Exact quotes/timecodes are preserved; missing timestamps are blank.
- [ ] `Background` is specific to the scene; other scene columns remain animator metadata.
- [ ] The output art style looks consistent while environments vary appropriately.
- [ ] Generated plates contain no people, animals, bodies, props, overlays, or motion.
- [ ] One batch produces no more than 10 distinct images.
- [ ] If more than 10 unique settings exist, the UI reports the remaining count.
- [ ] Each generated background appears in the UI as soon as its serial request succeeds.
- [ ] The CSV download contains the complete storyboard and the exact eight headers in the required order.
- [ ] Image cost is visible when the provider returns usage data; no image model call is used for text.

## Source ledger

- [EverythingProfessor](https://www.youtube.com/@EverythingProfessor), [The Historian Professor](https://www.youtube.com/@TheHistorianProfessor), [WildlifeProfessor](https://www.youtube.com/@WildlifeProfessor), [EverythingProfessor Compilations](https://www.youtube.com/@EverythingProfessorComps).
- [Earlier reference video](https://drive.google.com/file/d/1eRmvxfh5Ju4cOmTdWt4FSQCsohyM4ISW/view?usp=sharing), [script/voiceover folder](https://drive.google.com/drive/u/1/folders/1q_BkGppDA4k189FXZxXewRWi9yJF_r4H), and [character/style folder](https://drive.google.com/drive/folders/1KLTxXSsptR9OguL30DCBLX72GX2rtUBo?usp=sharing).
- [Every Weird Body Glitch video](https://www.youtube.com/watch?v=meH-Q1XgLBs), [matching script](https://docs.google.com/document/d/19D5RIF-E3ZB-fs_esrgCIw65Mt3jPjBAc2YzREyOvKE/edit?tab=t.0), and the workbook above.
- [Strangest Things Your Body Does to Keep You Alive video](https://www.youtube.com/watch?v=7tPPGl6Q_9I), [matching script](https://docs.google.com/document/d/1vtfXQZaVTlnAxQ4tUsJ2QuKrXiQl7PR4kdYjMc-gsKY/edit?tab=t.0#heading=h.gzdctbyeq5dv), and the workbook above.
- [Rayvin's portfolio](https://rayvingianan.r4yv.tech/), [Shop Floor Agent repository](https://github.com/rayvin04/shop-floor-ai-rayvin-gianan), and [Shop Floor Agent demo](https://shop-floor.r4yv.tech/).
- [OpenRouter GPT Image 2.5 Flare](https://openrouter.ai/openai/gpt-image-2.5-flare) and [OpenRouter Images API guide](https://openrouter.ai/blog/tutorials/image-generation/).
