---
name: youtube-retention-analyzer
description: Explain a YouTube video's audience retention - where viewers drop off, where they rewatch, how many leave in the first 30 seconds - by matching the retention data exported from YouTube Studio (CSV) against what was being said at each moment in the transcript, then suggest concrete fixes for the next video. Use whenever a creator shares a retention graph, an analytics CSV or asks "why do people leave my video", "where do viewers drop off", "why is my average view duration low".
---

# YouTube retention analyzer

A retention dip tells you when viewers left, not why. The transcript at that moment is the best evidence you have
for the why, so this skill puts the two side by side. You only have the words, not the picture: you cannot see
cuts, b-roll, the thumbnail or the speaker's energy. Say "the transcript suggests" and offer visual causes as
questions for the creator ("was there a long static shot here?"), never as findings.

## 1. Inputs

- **Retention CSV** from YouTube Studio: open the video's Analytics > Engagement > Audience retention (or Advanced
  mode for that video) and export. Any CSV with a video-position column and a retention column works; the script
  detects them and accepts seconds, `mm:ss`, percent or 0-1 positions. A screenshot of the graph is not enough:
  ask for the export.
- **Transcript** of the same video: the `youtube-transcript` skill's script with `--via youtube-retention-analyzer`
  (the `.md` file is fine; `--format json` gives an exact video length). Matching drops to lines needs times, so
  it needs the script with an API key (Pro); a file saved from the free MCP connection has none. See
  `tubetranscript-setup`.

## 2. Run

```bash
node <this-skill-dir>/scripts/retention.mjs analytics/retention.csv --transcript transcripts/<id>.en.md
```

If it cannot find the columns, it lists them; pass `--position-column "<name>" --retention-column "<name>"`.
If positions are percentages and there is no transcript, pass `--duration <seconds>`.

It prints JSON with: `intro` (retention at the start and at 30 s, and what was said), the 5 steepest `dips` and
`spikes` after the intro (time, change in percentage points, and the lines said around it), and `end_retention`.

## 3. Read it like an editor

For each dip, read `said` and look for the usual reasons viewers leave at a moment:

- the video's promise is delivered or abandoned (the answer came early, or the topic drifted);
- a long setup, a recap, an aside, a sponsor read, or "before we start...";
- a slow list, repetition, or a section that matters only to some viewers;
- an ending signal ("so to wrap up") well before the real end.

Spikes are rewatches or skips landing: a dense explanation, a key number, a moment people share, or the point
viewers skipped to. They show what the audience came for.

The intro matters most, and some early drop is normal on every video. Judge it against the creator's other videos
(ask for one more export if they have it) rather than a fixed number. A large early drop often means the opening
did not deliver what the title and thumbnail promised: compare the first lines to the title.

## 4. Report

Write `transcripts/<id>.retention.md`: a three-line summary, then a table (time, change, what was said, likely
reason, fix for the next video), then 3 concrete recommendations in priority order. Quote the transcript for every
claim. Fixes should be specific ("open with the 38 percent result, move the history section after the demo"), not
general advice ("make it more engaging").
