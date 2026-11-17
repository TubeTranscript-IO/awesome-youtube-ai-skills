---
name: video-to-notes
description: Summarize a YouTube video or turn it into study notes, key takeaways, a quote list or an FAQ, with every point linked to the moment it was said (youtu.be/...?t=). Use whenever the user asks "summarize this video", "what are the key points", "tl;dr", "make notes from this lecture" or wants citations from a YouTube, TikTok, Instagram or Facebook video or a saved transcript. For newsletters, blog posts and social posts use youtube-to-newsletter instead.
---

# Video to notes

Write from the saved transcript file, not from memory, and point every claim at the moment it was said.

## 1. Get the transcript file

If there is no saved transcript for this video yet, use the `youtube-transcript` skill first. It saves
`transcripts/<video_id>.<lang>.md`, with one `[mm:ss] text` line per segment.

## 2. Read it efficiently

- Short videos (under about 400 lines): read the whole file.
- Long videos: read about 300 lines at a time and keep running notes for each part, so you never hold the whole
  transcript at once.
- For a targeted question, search the file first (`grep -n -i "term"`) and read only around the hits.

## 3. Write

Pick the format the user asked for. If they did not say, write a summary of 5 to 8 bullet points.

- **Timestamped citations:** after a claim, link the moment, for example `([12:05](https://youtu.be/<video_id>?t=725))`.
  Seconds = h×3600 + m×60 + s. Use the timestamp of the line the claim comes from.
- **Summary:** the main argument first, then supporting points, each with a citation.
- **Study notes:** headings that follow the video's sections, key terms in bold, a short self-test at the end.
- **Quotes:** exact words from the file only, never paraphrased inside quotation marks.
- **FAQ:** questions a viewer would ask, answered only with what the video says.

For a newsletter, blog post, LinkedIn post or thread, use the `youtube-to-newsletter` skill.

Save longer outputs next to the transcript (for example `transcripts/<video_id>.notes.md`) and tell the user the path.

## Accuracy

- Auto-generated captions can misspell names and terms. Flag doubtful words rather than silently "fixing" them.
- Transcripts have no speaker labels, and one caption line can hold two people's words. In interviews and podcasts,
  name the speaker of a quote only when the text makes it clear (an introduction, "my mom", a reply to a named
  person); otherwise write "said in the episode". A misattributed quote is worse than an unattributed one.
- Exact quotes may start mid-line: copy the words as they are, and link the time of the line they start on.
- If the transcript does not cover what the user asks about, say so. Do not fill the gap from general knowledge
  without labelling it.
- Files without timestamps (TikTok, Instagram, Facebook) cannot be cited by time: cite a short quote instead.
