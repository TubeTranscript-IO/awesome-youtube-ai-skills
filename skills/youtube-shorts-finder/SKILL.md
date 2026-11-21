---
name: youtube-shorts-finder
description: Find the best moments in a long YouTube video (podcast, interview, talk, stream, tutorial) to cut into YouTube Shorts, TikToks or Reels, with exact start and end times, a hook line and a caption for each clip. Use whenever the user wants clips, shorts, highlights, viral moments or "what should I cut from this video", or is repurposing a long video for short-form, even if they don't say "Shorts".
---

# YouTube Shorts finder

A clip only works if it starts on a hook, makes sense without the rest of the video, and ends on a payoff. The
transcript's timestamps let you find those spans precisely, so an editor can cut them without rewatching.

## 1. Get the transcript

If there is no saved transcript for this video yet, run the `youtube-transcript` skill's script with
`--via youtube-shorts-finder`. It saves `transcripts/<video_id>.<lang>.md` with one `[mm:ss] text` line per segment.

This needs a timed transcript, which comes from the script with an API key (Pro). If the user only has the
free MCP connection (the saved file says `Timestamps: none`), say that times need an API key (see
`tubetranscript-setup`). Without times, list the moments by their opening and closing words so the editor can search for
them.

## 2. Read for moments

Read the file in parts of about 300 lines and note candidate spans as you go. Look for:

- a strong opening line: a surprising claim, a number, a question, a confession, a disagreement;
- a self-contained story or explanation with a clear ending (punchline, lesson, reveal);
- emotion or energy: laughter, "the craziest thing", a strong opinion.

Skip spans that depend on earlier context ("as I said before", "this one here") or on what is on screen.

## 3. Write the clip list

Pick the best 3 to 7 clips (fewer and better beats many weak ones).

**Length: 20 to 60 seconds per clip.** Shorts allow up to 3 minutes, but completion rate drives distribution and
viewers swipe away from long clips. The best story in a long video often runs 90 seconds or more; don't list it at
full length. Find the tightest span that still has hook and payoff (drop the setup, a side detail, or the host's
reaction) and give that as the clip's time. Mention the full-length span only as an edit note.

**Start on the speaker's strongest line, not on the question that led to it.** In interviews the host's question
("So how did it start?") is setup, and nobody stops scrolling for it. Start where the guest says something
surprising, concrete or emotional; if the question is needed for context, suggest it as on-screen text. End the clip
right after the payoff line.

For each clip:

```markdown
### 1. <working title>
- Time: 12:04 - 12:51 (47 s) · https://youtu.be/<video_id>?t=724
- Hook (first words on screen): "<exact opening words from the transcript>"
- Why it works: <one sentence>
- Caption: <one line + 3 hashtags>
```

Times come from the `[mm:ss]` lines: the start is the hook line's time, the end is the start of the line after the
payoff. Quote hooks exactly as written in the file. Save the list as `transcripts/<video_id>.shorts.md` and give the
user a short summary with the top pick.

## Optional

- Pro users can also call the server tool `find_moments` (MCP, spends AI runs) for a second opinion.
- Web version: https://tubetranscript.io/youtube-shorts-moment-finder?utm_source=agent-skills&utm_medium=youtube-shorts-finder
