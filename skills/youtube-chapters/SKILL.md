---
name: youtube-chapters
description: Write YouTube chapters (video timestamps) for a video from its transcript - "0:00 Intro" lines for the description that YouTube turns into chapters on the progress bar and Google shows as Key Moments - and check them against YouTube's rules. Use whenever a creator wants chapters, timestamps for the description, a table of contents, key moments, or asks why their chapters are not showing up, even if they just say "add timestamps to my description".
---

# YouTube chapters

YouTube only shows chapters when the list in the description follows its rules: the first timestamp is `0:00`,
there are at least 3 chapters, times go up, and each chapter lasts at least 10 seconds. One mistake and YouTube
silently ignores the whole list, so check every list with the script before giving it to the user.

## 1. Get the transcript

If there is no saved transcript for this video yet, run the `youtube-transcript` skill's script with
`--via youtube-chapters`. Add `--format json` as a second run if you want an exact video length for the check.

## 2. Find the sections

Read the file in parts of about 300 lines. A chapter starts where the topic changes: "next", "step two", "now let's
talk about", a new question in an interview, a demo starting. Aim for one chapter every 1 to 3 minutes of video;
a 10-minute video usually has 5 to 8. The first chapter is always `0:00`, even if the intro is short.

Use the `[mm:ss]` time of the line where the new topic starts, not the line before.

Resist splitting every sub-point into its own chapter. Chapters are a map, not an index: on the progress bar each
one is a segment, and segments under a minute are too small to hover or tap on a phone. If the talk has four parts
with sub-points, make the four parts chapters and mention the sub-points in their titles. The script warns when a
list is dense for the video's length; take that warning as a reason to merge.

## 3. Title each chapter

Titles help viewers jump and help search, because Google can show chapters as Key Moments:

- Say what the viewer gets in that part, in 2 to 6 words: `How ETags work`, not `Part 3`.
- Use the words people search for (the tool, the problem, the question), the way the speaker says them.
- Keep each under about 40 characters so it fits on the progress bar.
- Avoid clickbait and emoji; a chapter title is a label, not a hook.

## 4. Check, then deliver

Save the list as `transcripts/<video_id>.chapters.txt`, one `0:00 Title` per line, and run:

```bash
node <this-skill-dir>/scripts/check-chapters.mjs transcripts/<video_id>.chapters.txt --transcript transcripts/<video_id>.<lang>.md
```

It prints one JSON line. If `ok` is false, fix every item in `errors` (merge or move chapters that are too short)
and run it again. Pass `--duration <seconds>` instead of `--transcript` if you know the exact length.

Give the user the final list in a code block, ready to paste at the start or end of the description, with one
reminder: chapters appear once the description is saved and YouTube has processed it.

## Notes

- Fixing chapters that do not show: paste the user's current list into a file and run the same check; the errors say why.
- Web versions: https://tubetranscript.io/youtube-chapter-generator?utm_source=agent-skills&utm_medium=youtube-chapters
  and the format validator https://tubetranscript.io/tools/youtube-chapters-validator?utm_source=agent-skills&utm_medium=youtube-chapters
