---
name: youtube-community-posts
description: Write YouTube Community tab posts (text posts, polls, quizzes, image post captions) that keep a channel active between uploads - teasers for an upcoming video, follow-ups that send viewers back to the latest video, and questions that get comments - drafted from the video's transcript. Use whenever a creator wants community posts, a poll or quiz for their channel, a week of posts between uploads, or ideas to engage subscribers without a new video.
---

# YouTube community posts

Community posts reach subscribers in their feed between uploads. The ones that work are short, ask for a tap or a
reply, and tie back to a video, so viewers have a reason to watch. Write them from the actual video so every
question and fact is right.

## 1. Source

For a published or upcoming video, fetch its transcript with the `youtube-transcript` skill's script
(`--via youtube-community-posts`). Pick the moments worth a post: a surprising fact, a disagreement, a mistake
people make, a result, a question the video leaves open.

## 2. A set of posts

Unless the user asks for something else, draft one week (5 posts) around one video:

1. **Teaser** (before release): one line about the problem, one curiosity gap, the release day.
2. **Poll** that people can answer without watching, whose answer the video reveals.
3. **Quiz** with one correct answer taken from the video; say which one in a note to the creator, and explain the
   answer in a follow-up comment pinned after people vote.
4. **Behind the scenes / opinion** text post that invites replies ("which would you pick and why?").
5. **Follow-up** after release: one key takeaway with its timestamp link (`youtu.be/<id>?t=<seconds>`).

Format each post as:

```markdown
### Day 1 - Teaser (text)
<post text, 1-3 short lines>
Image idea (optional): <what to show>
```

Polls and quizzes: a one-line question and 2 to 4 short, balanced options (a few words each; the last option can
be "Other, comment below"). Options must be mutually exclusive.

## 3. Tone and checks

Write in the creator's voice (use their transcript as the reference), one emoji at most, no all-caps, no
engagement bait like "comment YES". Facts in quizzes come from the transcript only.

Save `community/<video_id>.posts.md` and tell the user the schedule in one line. Community tab posting is done in
YouTube Studio or the YouTube app; the creator posts these themselves.
