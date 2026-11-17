# Changelog

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
