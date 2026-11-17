---
name: youtube-to-newsletter
description: Repurpose a YouTube video into written content - an email newsletter, a blog post, a LinkedIn post, an X/Twitter thread or show notes - faithful to what the speaker actually said. Use whenever the user wants to turn a video, podcast episode, webinar or talk into a newsletter, article, blog, post or thread, or asks to "repurpose" or "write up" a video, even if they only paste the link and say "make a post out of this".
---

# YouTube to newsletter, blog or post

Readers of a repurposed piece trust that it reflects the video. The value you add is structure and tightness, not
new claims. So write from the saved transcript, keep the speaker's points and examples, and cut the filler.

## 1. Get the transcript

If there is no saved transcript for this video yet, run the `youtube-transcript` skill's script with
`--via youtube-to-newsletter`. It saves `transcripts/<video_id>.<lang>.md`.

## 2. Find the spine

Read the file in parts of about 300 lines. Write down the one-sentence takeaway, the 3 to 5 supporting points in
order, and the best concrete example, number or quote for each (with its `[mm:ss]` time).

## 3. Write the format the user asked for

If they did not say, write a newsletter.

- **Newsletter (300-600 words):** subject line (under 60 characters) and preview text; a two-sentence opening that
  states why the reader should care; one short section per point with a bold lead sentence; a closing line and a
  link to the video. Plain, scannable, no headings deeper than `##`.
- **Blog post (800-1500 words):** SEO title, H2 per point, an intro that answers the main question early, and a
  short FAQ of 2-3 questions the video answers.
- **LinkedIn post (under 1300 characters):** a first line that works on its own before "see more", short
  paragraphs, one takeaway, no more than 3 hashtags.
- **X thread (5-10 posts, each under 280 characters):** post 1 is the hook and promise, one idea per post, last post
  links the video.
- **Show notes:** a 2-3 sentence summary, then a timestamped list of topics (`00:00 Intro`) and any links or names
  mentioned.

Link moments as `https://youtu.be/<video_id>?t=<seconds>`. Quote only exact words from the file. Attribute opinions
to the speaker ("Ana argues...") rather than stating them as fact. If the user gave a brand voice or example post,
match its tone and length.

Save the draft as `transcripts/<video_id>.<format>.md` and show the user the headline or first lines, plus the path.

## Optional

Pro users can call the server tool `generate_brand_voice_blog` (MCP) to write in a saved brand voice. Web version:
https://tubetranscript.io/youtube-to-blog-post?utm_source=agent-skills&utm_medium=youtube-to-newsletter
