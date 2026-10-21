# Storyboard Style Guide

## Product behavior

The user pastes one complete script. The planning model creates the full storyboard first. The image stage then creates up to six unique, full-frame background plates from the selected storyboard settings, sequentially. The storyboard is never capped to the image limit.

Only environments are generated. Animators draw characters, movable props, words, diagrams, overlays, and motion. Every background should fit its specific story beat while sharing the approved hand-drawn 2D art treatment.

## Storyboard CSV format

Use these exact columns in this order:

1. `Scene`
2. `Timestamp`
3. `Voiceover`
4. `What's happening`
5. `Background`
6. `Hand-drawn characters & props`
7. `On-screen text`
8. `Transitions/Motion`

Keep the complete narration in order across the `Voiceover` cells. Do not truncate, paraphrase, or omit source wording. Preserve supplied timing. If no timecodes are supplied, estimate continuous `mm:ss-mm:ss` ranges from the narration at approximately 145 words per minute.

Follow the example storyboards’ compact animator-facing style. `What's happening` is one clear sentence. `Background` names one place and a specific composition. `Hand-drawn characters & props` contains the elements that animators will add. `On-screen text` includes only words actually shown. `Transitions/Motion` stays short: “Hard cut.”, “Hard cut. Zoom on icon.”, “Text fades in.”, “Wheel spins.”, or “Static.” Avoid long camera choreography and detailed animation directions.

When a visual beat moves to a different location, make a new scene and split the narration at that change. Do not put multiple locations or alternatives in one background description. Reuse a background description only when the same setting genuinely recurs.

## Background-only image rules

- Draw one full-frame 16:9 environment per image, never a split panel or collage.
- Preserve a consistent hand-drawn 2D cartoon look: bold, slightly irregular black outlines, readable simple shapes, flat color fills, and restrained shading.
- Change palette, architecture, setting, and composition to match each scene. The style guide must not force every background to look like a living room.
- Include fixed environmental features named in the selected `Background` description.
- Leave clear space where animators can add drawn characters and movable props.
- Exclude people, characters, animals, faces, bodies, hands, organs, clothing, loose props, diagrams, symbols, readable text, captions, logos, watermarks, interface elements, borders, motion lines, and animation effects.

The approved reference image establishes linework and color treatment only. CSV examples guide pacing, scene detail, and animator-facing formatting. Neither source changes the one-empty-environment-per-image rule.
