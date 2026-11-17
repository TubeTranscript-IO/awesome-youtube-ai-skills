---
name: youtube-sponsor-kit
description: Help a YouTube creator work with sponsors - build a one-page media kit from their own channel stats, a rate card with the pricing math shown, a short cold pitch email to a brand, and a sponsor-read script that fits the creator's voice - using the channel's transcripts to describe its audience and content. Use whenever a creator asks about sponsorships, brand deals, a media kit, how much to charge, how to pitch a brand, or how to write an ad read.
---

# YouTube sponsor kit

Brands buy a creator's audience and trust. The kit has to show both with real numbers and real examples, so this
skill uses only figures the creator gives you and quotes from their own videos. It never makes up market rates.

## 1. Collect the facts

Ask for what you do not have, and do not fill gaps with guesses:

- Subscribers; average views per video over the last 90 days (long-form and Shorts separately); average view
  duration; audience countries, age and gender split (YouTube Studio > Analytics > Audience); engagement (likes and
  comments per video).
- Niche, upload schedule, and 3-5 representative videos (links).
- Past sponsors and results, if any; the brands they want to approach.

Fetch the representative videos' transcripts with the `youtube-transcript` skill's script
(`--via youtube-sponsor-kit`) to describe what the channel is about and how the creator talks, and to find any
existing sponsor reads to learn the style.

## 2. Media kit (one page)

`sponsor/media-kit.md`: who the channel is for (one sentence), the key numbers with the date they were taken,
audience breakdown, 3 content examples with a one-line description and a quote each, past partners, integration
options (dedicated video, 60-90 s integration, 30 s mention, Shorts, community post, link in description), contact.

## 3. Rate card, with the math shown

Price from the channel's own average views, not subscribers. Show the formula so the creator can adjust it:

```
price per integration = expected views x CPM / 1000
expected views        = average views of the last 10-20 long-form videos (not the best ones)
CPM                   = the rate the creator charges per 1,000 views
```

CPM varies widely with niche, audience country and format, and you do not have reliable market data. Ask the
creator for their past CPM or for quotes they have received; if they have none, present the card with the CPM as an
explicit input and suggest they compare against rates other creators in their niche publish or share, or a
creator-marketplace quote. Then give options: integration, dedicated video (often priced higher than an
integration because the whole video is about the brand), Shorts, and bundles. Note usage rights, exclusivity and
revisions as extra-cost items.

## 4. Pitch email and ad read

- **Cold pitch** (under 150 words): why this brand fits this audience (one specific overlap), one proof number, one
  concrete idea for how the product would appear in an upcoming video, a clear ask. Subject line under 50
  characters. No attachments in the first email; offer the media kit.
- **Ad read** (30-60 s, about 75-150 words): in the creator's voice from their transcripts, an honest personal use
  case, one key benefit, the offer and link, and a disclosure line. Remind the creator that paid promotions must be
  disclosed (YouTube's paid promotion setting, and local advertising rules).

Save everything under `sponsor/` and summarize what is still missing (numbers to confirm, CPM to decide).
