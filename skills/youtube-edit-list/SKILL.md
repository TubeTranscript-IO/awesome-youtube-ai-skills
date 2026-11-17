---
name: youtube-edit-list
description: Speed up a rough cut by listing what to remove from a talking-head recording - dead air (silences), filler words like "um" and "uh", and retakes where the speaker restarts a sentence - as a CSV cut list with exact timecodes for Premiere, DaVinci Resolve, Final Cut or CapCut. Use whenever a creator or editor wants to cut silences, remove ums, tighten pacing, find bloopers or retakes, or make an edit decision list from raw footage or an uploaded video.
---

# YouTube edit list

The cut list is only useful if the timecodes are right, and the two inputs are good at different things:

- **The media file** tells you exactly where it is silent. ffmpeg measures it to the millisecond.
- **The transcript** tells you what was said: filler words and restarted sentences. Its times come from caption
  segments, so a filler's position inside a segment is an estimate. That is why those rows say `review`.

Use both when you can.

## 1. Inputs

- **Raw footage on disk** (the common case for an edit): pass it with `--media`. Needs ffmpeg; if the script
  answers `FFMPEG_MISSING`, give the user the install command from its message.
- **The video is on YouTube** (unlisted is fine): fetch its timed transcript with the `youtube-transcript` skill's
  script, `--format json --via youtube-edit-list`. Uploads get captions or audio transcription; either works.

YouTube's captions often drop "um" and "uh". If the transcript has few fillers, say so rather than implying the
recording is clean.

## 2. Run

```bash
node <this-skill-dir>/scripts/edit-list.mjs --media raw/take1.mp4 --transcript transcripts/<id>.en.json --fps 30
```

- `--fps` must match the edit timeline (24, 25, 30, 60...), or the frame part of each timecode is off. Ask if unsure.
- `--min-silence 0.8` (seconds) and `--noise -35` (dB) suit a quiet room. Noisy room or music bed: try `--noise -30`.
  Fast-paced edits: `--min-silence 0.5`.
- Without `--media`, silences come from gaps between captions: rough, marked `low` confidence.
- Non-English fillers: the default list covers English and Vietnamese hesitations; pass `--fillers "eh,este,pues"` for others.

The script writes `transcripts/<name>.edits.csv` with the columns
`start_tc,end_tc,start_s,end_s,duration_s,type,confidence,note`, and prints a JSON line with its path, the counts and
the seconds each type would save. `<name>` is the input file name without its last extension
(`RawTake01ab.en.json` gives `RawTake01ab.en.edits.csv`); set it with `--name`.

## 3. Report

Tell the user how much each type would save ("about 1 min 40 s of silence, 23 fillers, 3 retakes"), where the
file is, and how to use it:

- Silences with `high` confidence can be cut as listed.
- `filler` and `retake` rows are suggestions to check by ear: jump to `start_tc`, listen, cut.
- Keep a little breathing room. Cutting every pause makes speech sound rushed, so suggest leaving pauses under about
  0.5 s and the ones that land a joke or a point.

Most editors can't import a CSV as cuts directly. Use the list to jump between timecodes, or ask whether they want
it converted to their editor's marker format.
