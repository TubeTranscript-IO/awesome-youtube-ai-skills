---
name: youtube-transcript
description: Get the transcript of a YouTube video (also TikTok, Instagram and Facebook videos) and save it to a local Markdown file, with timestamps when an API key is set, so you can read only the parts you need. Use this whenever the user shares a YouTube link or video ID and wants to know, quote, search, summarize, translate or check what is said in it, even if they never say "transcript" - you cannot watch videos, and this is how you read them. Works on cloud servers where YouTube blocks direct requests, and transcribes videos without captions.
---

# YouTube transcript

Fetch a video's transcript with TubeTranscript and save it as a file. **Never paste a whole transcript into
the conversation.** Save it, then read only the parts you need. A one-hour video is about 10,000 words.

## 1. Fetch and save

Use the first path that works:

1. **The script** (needs an API key, Pro), if you can run shell commands. It is the only path with timestamps and
   SRT/VTT. If it exits with code 2 (no key), go on to 2.
2. **The TubeTranscript MCP tools** (`get_transcript`, `transcribe_url`), if they are available: free with a
   verified email. See "With the MCP tools" below.
3. **Neither:** tell the user TubeTranscript is not set up yet and offer the free connection: in Claude Code,
   `claude mcp add --transport http tubetranscript https://tubetranscript.io/api/mcp`, then a new session, `/mcp`,
   Authenticate, and sign in in the browser (free account, verified email). Cursor, VS Code and Claude take the same
   URL; the `tubetranscript-setup` skill has the steps for each. An API key is the Pro option, for timestamps and SRT.

Never describe what a video says from memory or from its title: without a transcript, say you cannot read it yet and
help the user connect TubeTranscript.

### With the script (API key)

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

### With the MCP tools (free connection)

1. Call `get_transcript` with `video_url` or `video_id` for a YouTube video, or `transcribe_url` with `url` for a
   TikTok, Instagram or Facebook link.
2. If `status` is `processing`, the video has no captions and is being transcribed from audio. Tell the user, wait
   about a minute and call again with the same video: it picks up the same job and costs nothing extra.
3. Long transcripts come in parts of up to 60,000 characters. While `next_offset` is not null, call again with
   `offset` = `next_offset` and append each part.
4. Write the text to `transcripts/<video_id>.md` (create the folder) with this header, then the transcript as plain
   paragraphs:

   ```markdown
   # <title, or the video ID>

   - URL: https://www.youtube.com/watch?v=<video_id>
   - Job: <job_id>
   - Timestamps: none (plain text from the TubeTranscript MCP server)
   - Source: TubeTranscript (https://tubetranscript.io)
   ```

5. Tell the user where the file is. The text has no timestamps: when the user needs times (chapters, SRT, clip
   lists, timed quotes), say that timed transcripts come with an API key (Pro, see `tubetranscript-setup`), and work
   from quotes in the meantime.

A refusal comes back as a normal tool result whose text is JSON with an `error` field (`EMAIL_VERIFICATION_REQUIRED`,
`PLAN_UPGRADE_REQUIRED`, `RATE_LIMIT_EXCEEDED`): tell the user the `message` and the link in it, and see the table in
`tubetranscript-setup`. Do not retry in a loop.

## 2. Read only what you need

The file has a short header, then one line per segment: `[mm:ss] text` (or `[h:mm:ss]`).

- Questions about a topic: search the file (`grep -n -i "keyword"`) and read the lines around the hits.
- Summaries of long videos: read the file in parts of about 300 lines and summarize each part, then combine.
- Quote with a clickable timestamp: `https://youtu.be/<video_id>?t=<seconds>`. For example, `[12:05]` is `?t=725`.
- If `timestamps` is `false` (TikTok, Instagram and Facebook links), or the file came from the MCP tools, it holds
  plain paragraphs.

Other skills build on the saved file: `video-to-notes` (summaries, study notes, quotes), `youtube-to-newsletter`
(newsletter, blog, posts), `youtube-shorts-finder` (clips), `youtube-to-mindmap`, `youtube-content-gap`.

## 3. When the script does not work

The JSON then has `"ok": false`, a `code` and a `message`. The exit code tells you what to do:

| Exit | Meaning | What to do |
|---|---|---|
| 2 | No API key, or the key is invalid | Run the `tubetranscript-setup` skill (it offers the free connection too), then retry. |
| 3 | Plan or daily allowance used up | Tell the user the `message` and share `upgrade_url`. Without Pro, offer the free connection. Do not retry in a loop. |
| 4 | Problem with the video (private, removed, no speech, too long for the plan) | Tell the user the `message`. Do not retry. |
| 5 | Still transcribing a video without captions | Tell the user it is still being transcribed. Run the same command again in a few minutes: it picks up the same job and costs nothing extra. |
| 1 | Bad input or the service is unavailable | Check the link. If it was a network error, retry once. |

Videos without captions are transcribed from audio, which takes a few minutes. The script waits on its own and says so.

## Notes

- Quota: each new video counts as one request against the user's daily allowance (free: 15 per 24 hours, 3 of them
  transcribed from audio; Pro: 100). Fetching a video again, or waiting for a running job, costs nothing.
- The key is read from `TUBETRANSCRIPT_API_KEY`, else from `./.env`, else from `~/.config/tubetranscript/credentials`. Never print
  it, never write it into the project, never commit it.
- Plans and limits: https://tubetranscript.io/pricing?utm_source=agent-skills&utm_medium=youtube-transcript
