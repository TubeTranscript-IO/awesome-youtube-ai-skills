---
name: youtube-content-gap
description: Compare your YouTube video (or script) with competitors' videos on the same topic and list what they cover that you miss - topics, questions answered, examples, terms and structure - with timestamps as evidence. Use whenever a creator or marketer wants a content gap analysis, competitor video comparison, "what did they cover that I didn't", or ideas to make a better video than the ones ranking for a topic.
---

# YouTube content gap

A gap is something viewers of this topic get from a competitor's video and not from yours. Claims about gaps are
only useful if they can be checked, so every gap points to the moment in the competitor's video where it is covered.

## 1. Collect the videos

You need the user's video (a link, or their script or outline as a file) and 1 to 3 competitor video links. If the
user did not give competitor links, ask for them: this skill has no search data, so it cannot know which videos rank.

Fetch each video with the `youtube-transcript` skill's script and `--via youtube-content-gap`. Each one costs one
request from the user's daily allowance, so say how many you are about to fetch.

## 2. Map each video

For each transcript, read it in parts of about 300 lines and list:

- topics covered, in order, with the start time;
- questions the video answers (explicitly or implicitly);
- concrete examples, numbers, tools or names used;
- how it opens (the first 30 seconds) and how it ends (call to action).

Keep these lists short and factual. They are the evidence for the next step.

## 3. Compare and report

Write `transcripts/content-gap.md`:

```markdown
# Content gap: <topic>

Videos compared: yours (<id>), <competitor 1 title> (<id>), ...

## Gaps (covered by competitors, missing in yours)
| Gap | Who covers it | Where | Suggested addition |
|---|---|---|---|
| Explains cache invalidation | Competitor 1 | [07:40](https://youtu.be/<id>?t=460) | 60-90 s section after your Cache-Control part |

## Your advantages (covered only by you)
## Shared topics, different depth
## Structure notes (hook, length, ending)
```

Rank gaps by how central they are to the topic (covered by several competitors, or a question the topic clearly
raises), not by how many there are. Say plainly when a gap is a judgment call. Do not invent search volumes,
rankings or view counts; if the user wants keyword data, say it needs a separate SEO tool.
