---
name: youtube-transcript
description: Get the transcript of a YouTube video (also TikTok, Instagram and Facebook videos) and save it to a local Markdown file with timestamps, so you can read only the parts you need. Use this whenever the user shares a YouTube link or video ID and wants to know, quote, search, summarize, translate or check what is said in it, even if they never say "transcript" - you cannot watch videos, and this is how you read them. Works on cloud servers where YouTube blocks direct requests, and transcribes videos without captions.
---

# YouTube transcript

Fetch a video's transcript with the TubeTranscript API and save it as a file. **Never paste a whole transcript into
the conversation.** Save it, then read only the parts you need. A one-hour video is about 10,000 words.

## 1. Fetch and save

Run the script that ships with this skill (Node 18+, no install):

```bash
node <this-skill-dir>/scripts/transcript.mjs "<video URL or 11-character YouTube ID>"
```

Options: `--out <dir>` (default `transcripts/` in the current directory), `--wait <seconds>` (default 600),
`--format srt|vtt` for a subtitle file instead (see the `youtube-to-srt` skill).

It prints one JSON line. On success:

```json
{"ok":true,"path":".../transcripts/jNQXAC9IVRw.en.md","video_id":"jNQXAC9IVRw","title":"Me at the zoo","language":"en","segments":6,"duration_seconds":19,"timestamps":true}
```

Tell the user the title, duration and where the file is. Do not print the transcript unless they ask for it.

## 2. Read only what you need

The file has a short header, then one line per segment: `[mm:ss] text` (or `[h:mm:ss]`).

- Questions about a topic: search the file (`grep -n -i "keyword"`) and read the lines around the hits.
- Summaries of long videos: read the file in parts of about 300 lines and summarize each part, then combine.
- Quote with a clickable timestamp: `https://youtu.be/<video_id>?t=<seconds>`. For example, `[12:05]` is `?t=725`.
- If `timestamps` is `false` (TikTok, Instagram and Facebook links), the file holds plain paragraphs.

Other skills build on the saved file: `video-to-notes` (summaries, study notes, quotes), `youtube-to-newsletter`
(newsletter, blog, posts), `youtube-shorts-finder` (clips), `youtube-to-mindmap`, `youtube-content-gap`.

## 3. When it does not work

The JSON then has `"ok": false`, a `code` and a `message`. The exit code tells you what to do:

| Exit | Meaning | What to do |
|---|---|---|
| 2 | No API key, or the key is invalid | Run the `tubetranscript-setup` skill, then retry. |
| 3 | Plan or daily allowance used up | Tell the user the `message` and share `upgrade_url`. Do not retry in a loop. |
| 4 | Problem with the video (private, removed, no speech, too long for the plan) | Tell the user the `message`. Do not retry. |
| 5 | Still transcribing a video without captions | Tell the user it is still being transcribed. Run the same command again in a few minutes: it picks up the same job and costs nothing extra. |
| 1 | Bad input or the service is unavailable | Check the link. If it was a network error, retry once. |

Videos without captions are transcribed from audio, which takes a few minutes. The script waits on its own and says so.

## Notes

- Quota: each new video counts as one request against the user's daily allowance. Fetching a video again,
  or waiting for a running job, costs nothing.
- The key is read from `TUBETRANSCRIPT_API_KEY`, else from `./.env`, else from `~/.config/tubetranscript/credentials`. Never print
  it, never write it into the project, never commit it.
- Agents with the TubeTranscript MCP server connected may call its `get_transcript` or `transcribe_url` tool
  instead. Still save the result to a file before working with it.
- Plans and limits: https://tubetranscript.io/pricing?utm_source=agent-skills&utm_medium=youtube-transcript
