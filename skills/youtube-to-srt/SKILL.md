---
name: youtube-to-srt
description: Download YouTube captions or a transcript as a subtitle file (.srt or .vtt) with exact timings, ready for CapCut, Premiere Pro, DaVinci Resolve, Final Cut, YouTube Studio or a web video player. Use whenever the user wants subtitles, captions, an SRT or VTT file, "youtube to srt", or timed captions to edit, translate or burn into a video, even if they only say "get me the captions for this video".
---

# YouTube to SRT / VTT

Subtitle files are strict formats: numbered cues, `hh:mm:ss,mmm` times, no overlaps. Editors reject or mistime files
that are slightly off, so let the script write them instead of formatting captions by hand.

## Make the file

Use the script from the `youtube-transcript` skill (installed next to this one, usually
`../youtube-transcript/scripts/transcript.mjs` relative to this skill's folder):

```bash
node <youtube-transcript-skill-dir>/scripts/transcript.mjs "<YouTube URL or ID>" --format srt --via youtube-to-srt
```

- `--format vtt` for WebVTT (HTML5 `<track>`, Vimeo, many web players). SRT is the safe default for video editors.
- `--out <dir>` to choose the folder (default `transcripts/`).

The script prints one JSON line with `path`, `language` and `segments`. Tell the user where the file is and how many
cues it has. Do not paste the subtitle file into the chat; it is long and the user needs the file, not the text.

## Good to know

- Cues never overlap: each one ends where the next begins, and lasts at least half a second.
- Captions come in the video's caption language (`language` in the JSON). For another language, translate the cue
  text only and keep every number and time line unchanged, then save as `<id>.<lang>.srt`.
- Subtitle files need timestamps, so they work for YouTube links only. TikTok, Instagram and Facebook links give
  plain text (exit 4, `NO_TIMESTAMPS`); offer a plain transcript instead.
- Errors (missing key, quota, private video) use the exit codes of the `youtube-transcript` skill; follow its table.
- The script needs an API key (Pro). The free MCP connection returns text without times, so it cannot make a
  subtitle file: tell the user, offer the plain transcript, and point to `tubetranscript-setup` for the key.
- Free browser tools for fixing an existing file: https://tubetranscript.io/tools/srt-editor?utm_source=agent-skills&utm_medium=youtube-to-srt
  (merge, split, shift times) and https://tubetranscript.io/tools/srt-checker?utm_source=agent-skills&utm_medium=youtube-to-srt.
