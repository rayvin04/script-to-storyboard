> Historical workflow notes. Current implementation is [Fred Image Generation - Stage 1](../fred-image-generation-stage-1/README.md). The old complex workflow was preserved as an inactive reference backup; do not mistake its Data Tables, reviews, polling, or CSV routes for the current image-only path.

# Script to Storyboard Paid Demo

This folder documents the n8n workflow behind Fred's script-to-storyboard demo. The live n8n workflow is **Script to Image Paid Demo**, ID `rV2JjknCieGGXRNL`.

## Current live draft

On 20 October 2026, the live workflow draft was updated to **CSV storyboard planner v2.1**. It has 20 nodes and remains synchronous. The active production version is older; draft v2.1 is not published, so the deployed UI still calls the earlier version.

The live host returned HTTP 503 after a successful manual test. Check the workflow and execution before further edits:

- [Open the workflow](https://n8n-rayv-742595626609.herokuapp.com/workflow/rV2JjknCieGGXRNL)
- Execution `2021` stopped in the HTTP Request node because its JSON Body expression was invalid; it did not reach the image provider.
- The expression was corrected. Execution `2022` successfully generated one low-quality 16:9 image and preserved its scene metadata. The PNG was about 1.25 MB and appeared under `Restore Scene JSON with Binary` → **Binary** → `data`.
- The provider `usage.cost` for execution `2022` was not retrieved. Earlier execution `2014` reported $0.00575 for one image; don't assume that is the exact cost of `2022`.

The local `workflow.json` now contains the 20-node v2.1 storyboard schema, CSV examples, image prompt, and binary preview path. It is inactive by default; reselect the saved OpenRouter credential if n8n cannot resolve the credential reference during import. The Heroku host returned HTTP 503 after the test, so compare the local file with the live draft and refresh it from n8n when the host recovers.

## Storyboard record contract

The planner follows the CSV columns from the two provided storyboard spreadsheets:

| Source column | JSON field | Rule |
| --- | --- | --- |
| Scene | `sceneNumber`, `id` | Keep scene order and a stable ID. |
| Timestamp | `timestamp` | Preserve exact supplied range; blank for script-only input. |
| Voiceover | `narration` | Exact concise excerpt from the script. |
| What's happening | `whatHappening` | One frozen moment; split multi-cut rows as needed. |
| Background | `background` | Describe the setting or diagram canvas. |
| Hand-drawn characters & props | `handDrawnElements` | Specify visible characters, anatomy, and props. |
| On-screen text | `onScreenText` | Exact overlay metadata; don't generate it inside the image. |
| Transitions/Motion | `transitionsMotion` | Editing metadata; don't render cuts, zooms, or motion effects. |

Additional fields are `visualFamily`, `characterPresent`, `visualBeat`, `styleNotes`, `styleVersion`, and `imagePrompt`. `characterPresent` means the recurring approved Fred host/professor appears; a generic person in a story vignette does not count.

Each image is a complete storyboard frame combining its setting/background with the listed drawn subjects/props. It is not an empty background plate. One frame depicts one clear visual moment. For script-only input, do not invent timing, overlay labels, or transition cues.

## Workflow behavior

- The UI calls the fixed production route `POST /webhook/script-to-storyboard`; users do not enter a webhook URL.
- `Normalize Request` validates the script, limits it to 30,000 characters, clamps the first batch to 1–3 scenes, selects the aspect ratio, and builds the planner input.
- `Plan Storyboard Scenes` uses `openai/gpt-5-mini` through Vercel AI Gateway for text planning only. It must call `Fred Style Reference Search` before producing the CSV-inspired scene records.
- `Fred Style Reference Search` ranks curated style rules and selected examples from both CSV workbooks by keyword overlap. It is a lightweight text retrieval tool, not semantic/vector search, and it does not retrieve Drive image binaries.
- `Generate Scene Image` calls OpenRouter's dedicated Images API with `openai/gpt-image-2.5-flare`, `quality: low`, one image per scene, and the selected aspect ratio. OpenRouter is reserved for image generation.
- The image prompt uses narration, the one still action, background, drawn characters/props, family-specific style notes, and the scene-specific description. It excludes on-screen text and editing transitions from rendered pixels.
- `Format Scene Result` → `Convert Scene Image to Binary Preview` → `Restore Scene JSON with Binary` keeps the response scene fields alongside the PNG binary. `Record Failed Scene` handles a provider error without hiding other scene results.
- `Build Storyboard Response` returns `status`, `sceneCount`, `failedCount`, an optional error, and scenes with all CSV-inspired metadata plus image status/data.
- Rayvin chose same-workflow failure handling. Do not create a separate Error Trigger workflow unless the choice changes.

## Planned work; not live yet

- Publish the v2.1 draft after the Heroku host returns, then verify one frame through the deployed UI.
- Add async job/status, persistent feedback, Drive delivery, and the one-shot Slack completion notice in the same workflow. The existing Data Tables are not yet wired into the live workflow.
- Curate actual Drive image references by scene family and character role, fetch approved image bytes, and pass them via OpenRouter `input_references` after verifying model/provider endpoint support.
- Verify Drive upload access before presenting delivery as ready. The selected destination is `153VPM-IBR1T5UIq-TthqtpklyAGwi-UU`; the saved Slack channel is `social`.
- Add semantic vector search only when the small tagged/text manifest stops scaling. Feedback remains human-governed prompt retrieval, not automatic model training.

## Spend, security, and reliability

- Keep the first test to one image and inspect provider `usage.cost` before raising the scene cap. No automatic regeneration loop.
- Keep OpenRouter credentials and all provider keys in n8n credentials; never put secrets in the web app.
- The allowed CORS origin is `https://script-to-storyboard-six.vercel.app`. CORS is not authentication; add an authenticated, rate-limited server-side proxy before wider public sharing.
- Retry only transient provider errors with a small limit; return per-scene error state for failed frames.

See [`docs/fred-style-guide.md`](../../docs/fred-style-guide.md) for the visual brief, CSV analysis, retrieval rules, and prompt template. See [`docs/fred-agent-context.md`](../../docs/fred-agent-context.md) for project instructions and architecture context.

