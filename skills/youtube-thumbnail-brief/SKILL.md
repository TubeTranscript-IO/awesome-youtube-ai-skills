---
name: youtube-thumbnail-brief
description: Act as an art director for YouTube thumbnails - turn a video title (and its transcript) into 3 distinct thumbnail concepts with composition, facial expression, colours and 2-4 words of text, plus ready-to-paste prompts for Midjourney, DALL-E, Ideogram, Flux or Stable Diffusion, and check that the text stays readable on a phone. Use whenever a creator wants thumbnail ideas, a thumbnail prompt, a design brief for a designer, or asks why a thumbnail is not getting clicks.
---

# YouTube thumbnail brief

A thumbnail has one job: make the right viewer curious enough to click, in the half second they look at it on a
small screen. Title and thumbnail work as a pair, so the thumbnail should add to the title rather than repeat it.

## 1. Understand the video

Get the title (or candidates) and the audience. If there is a video link or a draft, fetch the transcript with the
`youtube-transcript` skill's script (`--via youtube-thumbnail-brief`) and find the single most visual promise: a
result, a before/after, a surprising object, a mistake, a number. Ask for a photo of the creator if a face is
wanted and they want a designer or image tool to match them.

## 2. Three concepts

Make the three genuinely different (different subject or angle), not three colourways of one idea. For each:

- **Idea in one line** and why it creates curiosity.
- **Composition:** one focal subject, big; at most 3 elements; leave the bottom-right corner empty (YouTube puts the
  duration there).
- **Face (if any):** describe the person from the creator's photo or their own description, never from their name
  or voice: don't guess gender, age or ethnicity. Without a photo, write the prompt with a neutral placeholder
  ("the creator, from the reference photo") and suggest Midjourney's `--cref <photo URL>` to match them.
  Pick an emotion that matches the content, not a generic shocked face: focused for a tutorial, a
  skeptical look for a debunk, real surprise only for a real reveal. Eyes visible, face large.
- **Text:** 2-4 words that add to the title (the title says "How I fixed caching", the thumbnail says "38% CHEAPER").
  Bold sans-serif, high contrast, with an outline or a solid box behind it.
- **Colour:** one dominant colour and one accent that contrast with each other and with YouTube's white and dark
  backgrounds; avoid a background that is mostly white, red or black.

## 3. Image prompts

Image models are bad at rendering words, so generate the image without text and add the text in an editor (Canva,
Figma, Photoshop). Write one prompt per concept, in this order: subject and action, expression, setting, camera and
lens, lighting, colour palette, style, and `--ar 16:9`. Example:

```
close-up of a software engineer smiling at a laptop showing a falling cost graph, relieved expression,
modern home office, shot on 35mm, shallow depth of field, soft key light from the left, teal and orange palette,
high contrast, clean background, photorealistic --ar 16:9 --style raw
```

Drop `--ar` and `--style` for tools that do not use Midjourney syntax and say "16:9 aspect ratio" in words instead.

## 4. Readability check

Thumbnails are mostly seen small. The final image is 1280x720; tell the user to check it scaled down to about 320
pixels wide (the size in a phone feed or the suggested-videos column) and to squint: if the text or the subject
cannot be read at that size, enlarge it or cut words. Offer to check an image they share by looking at it at that
size yourself.

Save `thumbnails/<slug>.md` with the three concepts and prompts, and recommend one with a reason.
