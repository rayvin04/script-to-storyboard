# Fred's Storyboard Visual Brief (CSV-grounded v2)

**Purpose:** define how the script planner converts narration into timed storyboard records and how the image prompt uses those records. The two supplied CSVs are the storyboard-format examples; the paired videos and scripts provide the visual/editorial context. This is a working brief for Fred to review, not a claim that every channel uses one identical style.

## The pipeline contract

The script is the source of facts and narration. The CSVs show the storyboard rows the planner should create from it. Each row describes a visual beat, and the image model turns that beat into one complete still frame.

- **Generate a complete scene frame, not an empty background plate.** Combine the row's `Background` with its `Hand-drawn characters & props` and one clear action.
- **One image means one frozen visual moment.** A CSV row may describe several cuts or actions. Split it into separate beats when those moments would not read clearly in one still. For the paid demo, the current limit is 1–3 selected frames; label the result as a preview rather than implying the whole script was storyboarded.
- **Preserve narration exactly.** `Voiceover` maps to an exact concise script excerpt; don't rewrite it or add facts.
- **Preserve timecodes only when supplied.** `Timestamp` is an `mm:ss-mm:ss` string. If the input is just a script, leave it blank; do not estimate scene durations from prose.
- **Keep editorial metadata separate from the pixels.** Preserve exact `On-screen text` and `Transitions/Motion` in the scene record. Don't invent labels, cuts, zooms, fades, motion trails, or arrows when they were not supplied. Add actual text in the editing/compositing stage.
- **The image model remains image-only.** Text planning and retrieval use the text route or deterministic code; GPT Image is called only to make scene images.

### CSV column mapping

| CSV column | Scene JSON field | Use |
| --- | --- | --- |
| Scene | `sceneNumber` / `id` | Stable order and identifier. |
| Timestamp | `timestamp` | Exact supplied time range, or an empty string if unknown. |
| Voiceover | `narration` | Exact excerpt grounding the scene. |
| What's happening | `whatHappening` | Main visual action; reduce multiple actions to one frozen moment per frame. |
| Background | `background` | Setting, color field, or diagram canvas. |
| Hand-drawn characters & props | `handDrawnElements` | The people, character roles, anatomy, and objects visible. |
| On-screen text | `onScreenText` | Exact overlay text as metadata; never draw it into the generated image. |
| Transitions/Motion | `transitionsMotion` | Editing cue or motion note; keep separate from the still image. |

The planner also returns `visualFamily`, `characterPresent`, `visualBeat`, `styleNotes`, `styleVersion`, and `imagePrompt`. `characterPresent` means the approved recurring Fred host/professor is present; a generic person in a story vignette does not count as the host.

## What the two CSVs show

| Reference storyboard | Rows and timeline | Useful planning evidence |
| --- | --- | --- |
| `01_every_weird_body_glitch.csv.xlsx` | 81 rows, ending at 17:14; median scene span 11 seconds, mean 12.7 seconds, longest 39 seconds. One zero-duration row (scene 14, 02:24–02:24) and five gaps; no overlaps. | Rows mix character vignettes, topic menus, professor/chalkboard shots, metaphors, anatomy diagrams, split scenes, and transitions. Some long rows plainly contain several cuts and must be split for still-image generation. |
| `03_strangest_things_your_body_does.csv.xlsx` | 166 rows, ending at 15:18; median scene span 5 seconds, longest 14 seconds. No zero-duration rows, gaps, or overlaps found. | More frequent short visual beats. Yellow infographic backgrounds recur (60/166 rows), alongside streets, rooms, white/green fields, and office/kitchen settings. |

In both files, voiceover, action, and background are filled on every row. The first file has explicit on-screen text in 52/81 rows and transition/motion notes in every row, often just a hard cut. The second has on-screen text in 69/166 rows and a non-empty motion cue in 73/166. These values are editorial annotations, not instructions to render text or animation into a still.

### Reusable visual families

Select references by scene family; don't average unrelated compositions into a generic cartoon.

- **`topic_menu`** — white/light field, circular topic-icon grid, strong high-contrast title and short labels in the final edit. Generate icon art and reserve space for editorial typography.
- **`character_environment`** — a person acts in a living room, city, kitchen, office, cafe, or bar. The glitch CSV repeatedly uses the bald green-shirt protagonist, a green couch, plant, yellow wall, and landscape art for the phantom-phone beat.
- **`host_lecture`** — the professor explains one idea at a chalkboard or simple yellow teaching background. Preserve the approved professor's identity.
- **`single_action_vignette`** — one legible human pose/action, such as the person reaching into a pocket, sitting with a compressed foot, touching a stove, sneezing, or fainting.
- **`anatomy_insert`** — a close, simplified, non-graphic organ/body crop; the body-glitch screenshots show bold dark contours and coral/orange/brown organs.
- **`concept_metaphor`** — one concrete analogy grounded in the narration, such as the brain on a hamster wheel. Keep the analogy clearly illustrative.
- **`diagram_comparison`** — a labeled-mechanism layout, cutaway, split screen, before/after, or simple process diagram. Keep labels as separate metadata and only use arrows when the storyboard calls for them.

The first CSV's opening is a white topic grid with 12 circular icons. Its phantom-vibration rows then move to a yellow/green living room, a three-way split screen, explanatory brain/phone imagery, and professor-led explanation. The second CSV leans more heavily on yellow infographic panels for body mechanisms, with short kitchen, street, room, and office vignettes between them. Their editing language includes hard cuts, zooms, fades, flashes, arrows, and animated actions; for a generated still, represent the relevant pose or diagram only.

## Shared art direction

### Character and ink language

- Use bold, slightly irregular black hand-drawn contours and solid, readable color fills.
- Keep people simple and expressive with clear silhouettes; don't add ornamental detail.
- The recurring host has a large pale-cream oval head, sparse face marks, and the dark compact body/clothing seen in approved references. Keep glasses and outfit consistent with the selected anchor.
- Distinguish the professor/host from the green-shirt story protagonist and from other generic people. Don't substitute one role for another.

### Environments and diagrams

- Character backgrounds can include layered furniture, windows, shelves, bottles, plants, lamps, and street details when the row specifies them. The visual style ranges from warm, layered cafe/bar/room scenes to simpler yellow teaching and infographic fields.
- Use cream, yellow/ochre, amber, brown, charcoal, muted green, coral/orange, and blue where the matching reference family supports them.
- Anatomy is simplified and educational, with the organ or mechanism as the focal point. Keep medical imagery non-graphic and faithful to supplied narration.
- Keep health explanations grounded in the supplied script. Don't create diagnoses, new symptoms, labels, or medical advice.

## Prompt template

```text
STYLE VERSION: fred-style-v2-csv
VISUAL FAMILY: {{visualFamily}}

NARRATION GROUNDING (exact excerpt):
{{narration}}

WHAT IS HAPPENING (one frozen moment):
{{whatHappening}}

BACKGROUND / SETTING:
{{background}}

HAND-DRAWN CHARACTERS AND PROPS:
{{handDrawnElements}}

SCENE-SPECIFIC IMAGE DESCRIPTION:
{{imagePrompt}}

APPROVED STYLE NOTES RETRIEVED FOR THIS SCENE:
{{styleNotes}}

COMPOSITION
Create one complete 16:9 storyboard frame with one focal point, readable silhouettes, and important content in the central safe area. Include the described background and foreground subjects; don't make an empty background plate. Freeze one action. Match the selected visual family and approved character anchor.

EDITORIAL METADATA
Timestamp: {{timestamp}} (metadata only)
On-screen text: {{onScreenText}} (exact overlay metadata only; do not draw it)
Transitions/motion: {{transitionsMotion}} (editor cue only; do not draw a transition or sequence)

AVOID
Any invented text/labels; multiple moments or panels unless the row calls for a comparison; unrelated props; changing an approved character; thin corporate vector lines; generic clip art; photorealism; glossy 3D; anime; extra or malformed anatomy; gore; logos; watermarks; UI; borders.
```

The image request should include narration, action, background, hand-drawn subjects/props, family-specific style notes, and the scene-specific image description. Keep timestamps, on-screen text, and transitions in the returned scene metadata, not in the visual prompt. Do not pass raw reviewer comments as instructions; apply feedback through an approved, bounded summary.

## RAG and references

### Current n8n draft (20 October 2026)

- Workflow **Script to Image Paid Demo** (`rV2JjknCieGGXRNL`) was updated to draft **CSV storyboard planner v2.1**. `Plan Storyboard Scenes` returns the CSV-inspired fields above. `Fred Style Reference Search` performs deterministic keyword retrieval over the style rules and curated examples from both supplied CSVs. `Generate Scene Image` uses those fields but excludes overlay text and editing transitions. `Format Scene Result`, `Restore Scene JSON with Binary`, and `Build Storyboard Response` carry the metadata through the image path.
- Manual execution `2021` stopped at the request body because of an expression-syntax error; it failed before an image call. That syntax was corrected.
- Manual execution `2022` succeeded for one low-quality 16:9 phantom-vibration frame. The planner used the CSV's yellow/green living-room composition, left unknown timing/text/transition fields blank, and marked the generic person as not the Fred host. The response retained the scene metadata and the image; `Restore Scene JSON with Binary` exposed a PNG binary of about 1.25 MB.
- `usage.cost` for execution `2022` was not retrieved, so do not assume it matches the earlier reported $0.00575 from execution `2014`.
- The workflow's saved draft and active published version are different. The latest draft has not been published, so the production UI still invokes the older active version. The Heroku n8n host returned HTTP 503 after execution `2022`; check the execution and publish only after service recovers. The local `workflow.json` export may also be behind the live draft.
- The retrieval tool contains text rules and CSV row examples, not the Drive image files. It is keyword-based context retrieval, not vector search or image retrieval; text alone cannot guarantee exact character consistency.

### Next reference-grounding stage

1. Review Fred's [character and art-style folder](https://drive.google.com/drive/folders/1KLTxXSsptR9OguL30DCBLX72GX2rtUBo?usp=sharing) and approve a separate host/professor anchor, green-shirt protagonist, and scene-family examples.
2. Store each file in Drive with metadata: `driveFileId`, `visualFamily`, `role`, caption, palette/framing tags, approval state, and `styleVersion`.
3. Retrieve the approved anchor for the matching character role plus one or two references for the visual family. If no match exists, use the guide and a known anchor rather than a random reference.
4. Fetch selected Drive image bytes and pass them to OpenRouter `input_references` only after confirming support for the chosen model/provider endpoint. Record reference IDs with the image result.
5. If the curated library grows beyond a small manifest, add semantic retrieval over text descriptions/metadata (for example, Supabase pgvector). Vector search chooses which image IDs to fetch; it does not replace sending image references to the image model. Embedding/indexing uses a text model, never GPT Image.

### Governed feedback

Persist each review with request/scene ID, exact prompt, scene family, style version, selected reference IDs, model settings, image ID, rating, and comment. Use approved likes as positive examples and recurring dislikes as candidate avoid-rules. Require human review before changing the canonical style guide. This is feedback-guided retrieval and prompt adjustment, not fine-tuning or automatic model-weight learning.

## Quality review

Check every sample for: correct CSV-to-scene mapping; exact narration and supplied timecodes; one readable action; background and props present; host/protagonist role correct; appropriate scene family; outline/palette match; accurate non-graphic anatomy; no invented text; and no rendering of transition cues. Compare a fixed set of frames after each guide or prompt change.

## References

- [Video: Every Weird Body Glitch You Can't Explain](https://www.youtube.com/watch?v=meH-Q1XgLBs) and its [script](https://docs.google.com/document/d/19D5RIF-E3ZB-fs_esrgCIw65Mt3jPjBAc2YzREyOvKE/edit?tab=t.0).
- [Video: The Strangest Things Your Body Does to Keep You Alive](https://www.youtube.com/watch?v=7tPPGl6Q_9I) and its [script](https://docs.google.com/document/d/1vtfXQZaVTlnAxQ4tUsJ2QuKrXiQl7PR4kdYjMc-gsKY/edit?tab=t.0#heading=h.gzdctbyeq5dv).
- Storyboard spreadsheets: `01_every_weird_body_glitch.csv.xlsx` and `03_strangest_things_your_body_does.csv.xlsx` (the uploaded source workbooks).
- [Original sample video](https://drive.google.com/file/d/1eRmvxfh5Ju4cOmTdWt4FSQCsohyM4ISW/view?usp=sharing), [scripts/voiceover folder](https://drive.google.com/drive/u/1/folders/1q_BkGppDA4k189FXZxXewRWi9yJF_r4H), and [character/style assets](https://drive.google.com/drive/folders/1KLTxXSsptR9OguL30DCBLX72GX2rtUBo?usp=sharing).
- [OpenRouter GPT Image 2.5 Flare](https://openrouter.ai/openai/gpt-image-2.5-flare) and [OpenRouter Images API guide](https://openrouter.ai/blog/tutorials/image-generation/).
- [n8n RAG guidance](https://docs.n8n.io/advanced-ai/rag-in-n8n/) and [Supabase Vector Store node](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoresupabase/).
