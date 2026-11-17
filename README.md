# 🚀 Awesome YouTube AI Agent Skills & MCP Servers

[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)
[![Powered by TubeTranscript.io](https://img.shields.io/badge/Powered%20by-TubeTranscript.io-e11d48)](https://tubetranscript.io/?utm_source=github&utm_medium=awesome-youtube-ai-skills)

> An awesome collection of MCP servers and AI Agent skills (Claude Code, Cursor) to extract, summarize, and bypass blocked YouTube transcripts using Whisper API.

15 agent skills and 2 MCP servers that let coding agents read YouTube videos: fetch the transcript (even when a
video has no captions), save it with timestamps, and turn it into notes, subtitles, clips, chapters, scripts or a
retention report. Built for `agentic-workflows` in `claude-code`, `cursor-ide`, Codex and every agent the
[skills CLI](https://github.com/vercel-labs/skills) supports, on top of the
[TubeTranscript API](https://tubetranscript.io/youtube-transcript-api?utm_source=github&utm_medium=awesome-youtube-ai-skills).

```bash
npx skills add TubeTranscript-IO/awesome-youtube-ai-skills
```

## Contents

- [Why this repository is awesome?](#-why-this-repository-is-awesome)
- [MCP Servers & Agent Skills Directory](#️-mcp-servers--agent-skills-directory)
  - [MCP servers](#mcp-servers)
  - [Transcripts and subtitles](#transcripts-and-subtitles)
  - [Research and repurposing](#research-and-repurposing)
  - [YouTube creator workflow](#youtube-creator-workflow)
- [Quick Start & API Key](#-quick-start--api-key)
- [FAQ](#faq)

## 🌟 Why this repository is awesome?

**Transcripts for videos that have none.** Libraries built on YouTube's caption endpoint, like the popular Python
`youtube-transcript-api`, can only return captions that exist. When a creator disabled subtitles they raise
`TranscriptsDisabled` or `NoTranscriptFound`, and your agent gets nothing. TubeTranscript falls back to speech
recognition: the audio is transcribed with Whisper on TubeTranscript's servers and returned through the same API
call (the `whisper-api` fallback). Your agent waits for the job and gets a timestamped transcript.

**Works from servers YouTube blocks.** The same libraries raise `RequestBlocked` / `IpBlocked` on AWS, GCP, Azure,
Vercel and most VPS providers, because YouTube blocks cloud IP ranges. The API makes the request for you, so your
agent can bypass blocked YouTube subtitles from CI runners and cloud sandboxes. Python user? The
[`tubetranscript`](https://pypi.org/project/tubetranscript/) package is a drop-in replacement for
`youtube-transcript-api` that falls back to the API only when YouTube blocks the direct request.

**Built for agents, not for copy-paste.**

- Transcripts are saved to `transcripts/<video_id>.<lang>.md` with `[mm:ss]` lines and read in parts, so a 10,000-word
  transcript never floods the context window.
- Every claim can point to its moment: skills cite `https://youtu.be/<id>?t=<seconds>` links.
- The parts that must be exact are code, not prompts: subtitle files, YouTube chapter rules, cut lists and retention
  math are zero-dependency Node scripts with tests.
- No invented data. Skills say when they cannot know something (search volume, market CPM, what is on screen)
  instead of guessing.
- Each writing skill ships evaluation cases (`evals/`) runnable with `claude plugin eval`.

| | `youtube-transcript-api` | TubeTranscript skills and `mcp-server` |
|---|---|---|
| Video with captions | ✅ | ✅ |
| Captions disabled | ❌ `TranscriptsDisabled` | ✅ Whisper transcription |
| From AWS, GCP, Vercel, CI | ❌ often `RequestBlocked` | ✅ |
| TikTok, Instagram, Facebook links | ❌ | ✅ (speech transcription) |
| SRT / VTT with clean cue times | Formatter for existing captions | ✅ `youtube-to-srt` |
| Summaries, chapters, clips, scripts | ❌ | ✅ 15 skills |

## 🛠️ MCP Servers & Agent Skills Directory

Install everything with `npx skills add TubeTranscript-IO/awesome-youtube-ai-skills`, or one skill with `--skill <name>`.
Add `-a claude-code` or `-a cursor` to pick the agent, and `-g` to install for all your projects. Each skill folder
is a standard `SKILL.md` with its scripts, so you can also copy it into your agent's skills directory by hand.

### MCP servers

Two remote `mcp-server` endpoints (Streamable HTTP), listed in the MCP Registry as `io.tubetranscript/transcripts`
and `io.tubetranscript/ai-tools`. Use them when your agent cannot run scripts, or alongside the skills.

| Server | URL | Tools |
|---|---|---|
| `io.tubetranscript/transcripts` | `https://tubetranscript.io/api/mcp` | `get_transcript` (YouTube URL or ID), `transcribe_url` (YouTube, TikTok, Instagram, Facebook) |
| `io.tubetranscript/ai-tools` | `https://tubetranscript.io/api/mcp/tools` | `extract_hooks`, `create_mindmap`, `generate_brand_voice_blog` and creator tools, by `job_id` |

Claude Code:

```bash
claude mcp add --transport http tubetranscript https://tubetranscript.io/api/mcp \
  --header "Authorization: Bearer $TUBETRANSCRIPT_API_KEY"
claude mcp add --transport http tubetranscript-ai https://tubetranscript.io/api/mcp/tools \
  --header "Authorization: Bearer $TUBETRANSCRIPT_API_KEY"
```

Cursor (`.cursor/mcp.json`) and other clients that take a URL and headers:

```json
{
  "mcpServers": {
    "tubetranscript": {
      "url": "https://tubetranscript.io/api/mcp",
      "headers": { "Authorization": "Bearer tt_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" }
    },
    "tubetranscript-ai": {
      "url": "https://tubetranscript.io/api/mcp/tools",
      "headers": { "Authorization": "Bearer tt_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" }
    }
  }
}
```

Guide: [YouTube transcript MCP server](https://tubetranscript.io/youtube-transcript-mcp?utm_source=github&utm_medium=awesome-youtube-ai-skills).

### Transcripts and subtitles

### youtube-transcript

Fetches the transcript of a YouTube video (also TikTok, Instagram and Facebook) and saves it as Markdown with
`[mm:ss]` timestamps, or as JSON with exact segment timings. Videos without captions are transcribed from audio;
the script waits for the job and resumes it if you run it again. Every other skill builds on it.

```bash
npx skills add TubeTranscript-IO/awesome-youtube-ai-skills --skill youtube-transcript
```

Ask: *"What does this video say about rate limiting? https://youtu.be/…"*

### youtube-to-srt

Exports YouTube captions as `.srt` or `.vtt` subtitle files with non-overlapping cue times, ready for CapCut,
Premiere Pro, DaVinci Resolve, Final Cut or YouTube Studio.

```bash
npx skills add TubeTranscript-IO/awesome-youtube-ai-skills --skill youtube-to-srt
```

Ask: *"Get me an SRT of this video for Premiere."*

### tubetranscript-setup

Checks or saves your TubeTranscript API key (`--check`, `--save` with hidden input, `--from-env`) and verifies it
without spending a request. The other skills use it when no key is configured.

```bash
npx skills add TubeTranscript-IO/awesome-youtube-ai-skills --skill tubetranscript-setup
```

Ask: *"Set up TubeTranscript."*

### Research and repurposing

### video-to-notes

Summaries, study notes, key takeaways, quote lists and FAQs from a video, every point linked to the moment it was
said. Quotes are copied word for word and attributed only when the transcript makes the speaker clear.

```bash
npx skills add TubeTranscript-IO/awesome-youtube-ai-skills --skill video-to-notes
```

Ask: *"Summarize this lecture for my team with timestamps."*

### youtube-to-newsletter

Turns a video, podcast episode or webinar into an email newsletter, blog post, LinkedIn post, X thread or show
notes, faithful to what the speaker said.

```bash
npx skills add TubeTranscript-IO/awesome-youtube-ai-skills --skill youtube-to-newsletter
```

Ask: *"Turn this talk into this week's newsletter for backend devs."*

### youtube-shorts-finder

Finds 3 to 7 moments in a long video to cut into YouTube Shorts, TikToks or Reels: 20 to 60 seconds each, starting
on the speaker's strongest line, with cut times, a verbatim hook and a caption.

```bash
npx skills add TubeTranscript-IO/awesome-youtube-ai-skills --skill youtube-shorts-finder
```

Ask: *"Find Shorts in this podcast episode and give me cut times."*

### youtube-to-mindmap

Builds a mind map of a lecture, course or talk as Mermaid (renders in Obsidian, Notion, GitHub), Markmap or OPML,
with branch start times.

```bash
npx skills add TubeTranscript-IO/awesome-youtube-ai-skills --skill youtube-to-mindmap
```

Ask: *"Make a mind map of this course video, I use Obsidian."*

### youtube-content-gap

Compares your video with competitors' videos on the same topic and lists what they cover that you miss, with
timestamp evidence from each video. It works from transcripts you choose and never invents search data.

```bash
npx skills add TubeTranscript-IO/awesome-youtube-ai-skills --skill youtube-content-gap
```

Ask: *"My video gets fewer views than this one. What am I missing?"*

### YouTube creator workflow

### youtube-script-writer

Writes a video script built for retention: 5 hook options for the first 15 seconds, a roadmap, sections with open
loops, pattern interrupts every 45 to 60 seconds, natural calls to action and timing marks. It can research
competitor videos first and rewrites what it learns in your voice.

```bash
npx skills add TubeTranscript-IO/awesome-youtube-ai-skills --skill youtube-script-writer
```

Ask: *"Write an 8-minute script for my beginner running video."*

### youtube-thumbnail-brief

Art-directs thumbnails: 3 distinct concepts with composition, expression, colours and 2 to 4 words of text, plus
text-free prompts for Midjourney, DALL-E, Ideogram, Flux or Stable Diffusion, and a phone-size readability check.

```bash
npx skills add TubeTranscript-IO/awesome-youtube-ai-skills --skill youtube-thumbnail-brief
```

Ask: *"Thumbnail ideas for 'HTTP Caching in 10 Minutes', I use Midjourney."*

### youtube-edit-list

Makes a cut list for a rough edit: silences measured with ffmpeg on the raw footage, filler words ("um", "uh",
"ờ", "ừm") and restarted sentences from the transcript, as a CSV with frame-accurate timecodes for your timeline's
frame rate.

```bash
npx skills add TubeTranscript-IO/awesome-youtube-ai-skills --skill youtube-edit-list
```

Ask: *"Cut the dead air and ums from raw/take1.mp4, 25 fps timeline."*

### youtube-chapters

Writes YouTube chapters for the description and checks them with a script against YouTube's rules (first chapter
at 0:00, at least 3 chapters, each at least 10 seconds), so they show on the progress bar and can appear as Google
Key Moments.

```bash
npx skills add TubeTranscript-IO/awesome-youtube-ai-skills --skill youtube-chapters
```

Ask: *"Add chapters to my description. Last time YouTube didn't show them."*

### youtube-retention-analyzer

Reads the audience retention CSV exported from YouTube Studio, finds the steepest drop-offs and rewatch spikes, and
shows what was being said at each moment, with specific fixes for the next video.

```bash
npx skills add TubeTranscript-IO/awesome-youtube-ai-skills --skill youtube-retention-analyzer
```

Ask: *"Why do viewers leave my video around 3 minutes? The export is in analytics/retention.csv."*

### youtube-community-posts

Plans a week of YouTube Community tab posts around a video: teaser, poll, quiz with the answer from the video,
behind-the-scenes post and a follow-up with a timestamp link.

```bash
npx skills add TubeTranscript-IO/awesome-youtube-ai-skills --skill youtube-community-posts
```

Ask: *"My video goes live Friday. Plan my community tab for the week."*

### youtube-sponsor-kit

Builds a media kit from your own channel stats, a rate card with the pricing formula shown (CPM from your past deals,
not made-up market rates), a short pitch email and an ad read in your voice with a disclosure reminder.

```bash
npx skills add TubeTranscript-IO/awesome-youtube-ai-skills --skill youtube-sponsor-kit
```

Ask: *"Help me pitch an app-monitoring sponsor: 48k subs, 21k average views."*

## 🚀 Quick Start & API Key

1. **Get an API key** at [tubetranscript.io](https://tubetranscript.io/dashboard/api?utm_source=github&utm_medium=awesome-youtube-ai-skills)
   (sign in, then Dashboard > API). API access is part of the
   [Pro plan](https://tubetranscript.io/pricing?utm_source=github&utm_medium=awesome-youtube-ai-skills). Keys look like `tt_live_…`.
2. **Install the skills** in your project:

   ```bash
   npx skills add TubeTranscript-IO/awesome-youtube-ai-skills
   ```

3. **Set the key** in a `.env` file at the root of the project your agent works in:

   ```bash
   # .env
   TUBETRANSCRIPT_API_KEY=tt_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

   Keep it out of git:

   ```bash
   echo ".env" >> .gitignore
   ```

   The scripts read the key from the `TUBETRANSCRIPT_API_KEY` environment variable first, then from `./.env`, then
   from `~/.config/tubetranscript/credentials`. To set it once for every project instead, run the setup script in
   your own terminal (input is hidden and never shown to the agent):

   ```bash
   node .claude/skills/tubetranscript-setup/scripts/setup.mjs --save
   ```

   The path depends on your agent and on whether you installed with `-g`.
4. **Ask your agent** about a video: *"Summarize https://www.youtube.com/watch?v=jNQXAC9IVRw with timestamps."*

The scripts need Node 18+ (you already have it if `npx` works) and have no dependencies. `youtube-edit-list` uses
[ffmpeg](https://ffmpeg.org) for silences in media files.

| Plan | Price | Transcripts per 24 h (per team) | Of which from audio (Whisper) |
|---|---|---|---|
| Pro | $4.99/month | 100 | 30 |
| Enterprise | $19/month | 1,000 | 100 |

Fetching a video your team already has costs nothing, and all the writing (summaries, scripts, clips, chapters) is
done by your agent's own model from the saved transcript, so one video is one request.

## FAQ

**How do I get the transcript of a YouTube video that has no captions?**
Use the `youtube-transcript` skill or the `get_transcript` MCP tool. When a video has no captions, TubeTranscript
transcribes the audio with Whisper and returns a timestamped transcript once the job finishes (usually a few minutes).

**Why does `youtube-transcript-api` fail on AWS, Vercel or GitHub Actions?**
YouTube blocks many cloud IP ranges, so the direct request raises `RequestBlocked` or `IpBlocked`. The TubeTranscript
API makes the request for you; the Python package `tubetranscript` keeps the `youtube-transcript-api` interface and
falls back to it only when YouTube blocks you.

**Do these skills work in Cursor, Codex and other agents, not only Claude Code?**
Yes. They are plain `SKILL.md` files installed by the skills CLI for the agent you choose (`-a`). Agents that use
MCP instead can connect to the two MCP servers above.

**Does the agent see my API key?**
The scripts never print it (only its last 4 characters), and `setup.mjs --save` takes it as hidden input in your own
terminal, so it never enters the chat. An agent with file access can still open `.env` or the credentials file, so
don't ask it to show them, and revoke the key in the dashboard if it ever ends up in a transcript or a commit.

**What data leaves my machine?**
The video link and your API key go to `tubetranscript.io`. Requests carry an `X-TubeTranscript-Client` header with
the skill name and version so usage of these skills can be counted. See the
[privacy policy](https://tubetranscript.io/privacy).

## License

MIT
