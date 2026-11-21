# Changelog

## 0.2.0 (unreleased)

- Free path: `tubetranscript-setup` starts with connecting the TubeTranscript MCP server with a sign-in (OAuth) in
  Claude Code, Cursor, VS Code and Claude; free accounts with a verified email get 15 transcripts per 24 hours, 3 of
  them from audio. It explains the `EMAIL_VERIFICATION_REQUIRED`, `PLAN_UPGRADE_REQUIRED` and `RATE_LIMIT_EXCEEDED`
  answers. The API key (Pro) stays the path for timestamps, SRT/VTT and the creator scripts.
- `youtube-transcript`: tries the script, falls back to the MCP tools (`get_transcript`, `transcribe_url`) when no key
  is set, joins long transcripts from their 60,000-character parts and saves them to `transcripts/<id>.md`.
- Timed skills (`youtube-chapters`, `youtube-shorts-finder`, `youtube-edit-list`, `youtube-retention-analyzer`,
  `youtube-to-srt`) say what to do with a transcript without times. Plan refusals in the scripts point to the free
  connection.

## 0.1.0 (unreleased)

- Published as `TubeTranscript-IO/awesome-youtube-ai-skills`; README rewritten as the directory of all skills and the two MCP
  servers. Scripts also read `TUBETRANSCRIPT_API_KEY` from `./.env`.

- `youtube-transcript`: save a transcript as `transcripts/<id>.<lang>.md` with timestamps; waits for audio
  transcription; TikTok, Instagram and Facebook links through the MCP `transcribe_url` tool.
- `video-to-notes`: summaries, notes, quotes and drafts from a saved transcript with `youtu.be/…?t=` citations.
- `tubetranscript-setup`: check or save the API key in `~/.config/tubetranscript/credentials`.
- `youtube-to-srt`: `transcript.mjs --format srt|vtt` writes subtitle files with non-overlapping cues.
- `youtube-to-newsletter`, `youtube-shorts-finder`, `youtube-to-mindmap`, `youtube-content-gap`: repurposing skills
  that work from the saved transcript. `--via <skill>` tags requests with the skill that ran them.
- Creator skills: `youtube-script-writer`, `youtube-thumbnail-brief`, `youtube-edit-list` (`edit-list.mjs`: ffmpeg
  silences, fillers and retakes to a CSV cut list), `youtube-chapters` (`check-chapters.mjs` validates YouTube's chapter
  rules), `youtube-retention-analyzer` (`retention.mjs`: dips and spikes from a YouTube Studio CSV with the transcript
  lines), `youtube-community-posts`, `youtube-sponsor-kit`. `transcript.mjs --format json` for these scripts.
- Creator skills ship `evals/` cases too (fixtures: a raw-take transcript JSON and a retention CSV). Eval: 94% with
  skill vs 72% without; follow-ups: dense-chapter warning, no copied competitor wording, no guessing a creator's look.
- Each writing skill ships an `evals/` case (prompt, transcript fixture, graders) runnable with `claude plugin eval`.
