---
name: youtube-script-writer
description: Write a YouTube video script built to hold viewers - several hook options for the first 15 seconds, a structure with open loops and pattern interrupts every 45-60 seconds, natural calls to action, and timing marks - optionally researched from the transcripts of the top videos on the topic. Use whenever a creator wants a video script, an outline, an intro or hook, a rewrite of a draft for retention, or asks how to keep viewers watching longer.
---

# YouTube script writer

Viewers decide in the first seconds whether the video will give them what the title promised, and they keep
deciding all the way through. A retention-minded script answers that question again and again: it promises,
delivers in steps, and always leaves one reason to keep watching. Write for the ear: short sentences, one idea at a
time, the way the creator talks.

## 1. Brief

Get (or infer and confirm): topic and working title, audience and what they already know, target length, the
creator's voice (ask for one of their transcripts, or a video link to fetch with the `youtube-transcript` skill),
and the one action they want viewers to take.

**Research (recommended when the user gives competitor links):** fetch 1-3 transcripts with the
`youtube-transcript` skill's script and `--via youtube-script-writer`. Note what those videos cover, the questions
they leave unanswered, and how they open. Use it to make this script more complete or more specific, never to copy
lines. Even a fact or technique they explain (a rule of thumb, a test, a tip) gets the creator's own wording and,
ideally, the creator's own example: a copied sentence is easy to spot for viewers who watched both videos. For a full comparison, the `youtube-content-gap` skill does that job.

## 2. Hooks

Write 5 different openings for the first 15 seconds (about 35-45 spoken words each), each using a different angle,
and say which you recommend and why:

1. **Result first:** show or state the outcome, then promise how ("This cut our server bill by 38 percent...").
2. **Problem the viewer has right now,** in their words.
3. **Surprising claim or mistake** most people make.
4. **Question** the video will answer, with a hint that the answer is not the obvious one.
5. **Story cold open:** drop into the most tense moment, explain later.

Every hook must match the title and thumbnail promise. A hook that bait-and-switches loses viewers at 0:30.
Skip "Hey guys, welcome back" and channel intros before the hook.

## 3. Body

Plan the beats against the target length:

- **Roadmap** right after the hook (one sentence: what they get and in what order).
- **Sections** of 1-2 minutes, each opening with why it matters and closing with an open loop into the next
  ("but that only works if... which is next").
- **Pattern interrupts every 45-60 seconds:** a change the viewer can feel - a demo, an example, a list, a
  surprising number, a question to the viewer, a cut to b-roll or screen. Mark them `[INTERRUPT: ...]` so the
  editor sees them.
- **Payoff the biggest promise late, but not last.** Deliver the main value before the outro so the ending does
  not feel like filler.
- **CTA:** one mid-roll CTA tied to the moment ("if this saved you a week, subscribe, there's a part two"), one at
  the end pointing to a specific next video. No "like and subscribe" in the first minute.

## 4. Deliver

Save `scripts/<slug>.md` with: the 5 hooks, then the script as a two-column table or as blocks
`[mm:ss] SPOKEN TEXT` + `(VISUAL: ...)`, timed at about 150 spoken words per minute (adjust if you have the creator's
own transcript: words divided by minutes). End with the estimated length and the list of interrupts. Show the user
the recommended hook and the outline in the chat.
