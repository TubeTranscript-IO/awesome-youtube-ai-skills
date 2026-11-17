# HTTP Caching in 10 Minutes

- URL: https://www.youtube.com/watch?v=Hc4ch1ngT9x
- Language: en
- Job: 0f6c1d2e-0000-4000-8000-486334636831
- Source: TubeTranscript (https://tubetranscript.io)

[00:00] Hi everyone, I'm Ana, and today we're talking about HTTP caching, the single cheapest performance win most web apps leave on the table.
[00:14] Quick show of hands in the chat: who has shipped a site where the logo downloads again on every page view? Yeah, me too.
[00:29] So here's the plan. First, why caching matters. Second, the Cache-Control header. Third, validation with ETags. And last, invalidation, which is the hard part.
[00:47] Let's start with why. Every request that never leaves the browser costs you zero server time and zero bandwidth.
[01:03] In our own app, turning on proper caching for static assets cut our server bill by about 38 percent in one month.
[01:20] And latency drops too. A cached asset loads in a few milliseconds. A network round trip from Singapore to Virginia is about 230 milliseconds before the server even starts.
[01:41] There's also the CDN layer. If your CDN can cache a response, your origin never sees most of the traffic.
[01:58] Okay, part two, the Cache-Control header. This is the header that tells browsers and CDNs what they're allowed to do.
[02:14] The most important directive is max-age. Max-age equals 31536000 means keep this for a year.
[02:30] You only do that for files whose name changes when the content changes, like app.3f9a2c.js. That's called fingerprinting.
[02:48] If the file name never changes, a one-year max-age means users are stuck with the old file. I've seen that take down a checkout page for a week.
[03:07] Next, people mix up no-cache and no-store all the time. No-cache does not mean don't cache.
[03:22] No-cache means you may store it, but you must check with the server before using it. No-store means never write it anywhere. Use no-store for things like bank statements.
[03:43] Then there's private versus public. Private means only the user's browser may cache it, not a shared CDN. Anything with personal data should be private.
[04:04] And s-maxage lets you give the CDN a different lifetime than the browser. For example, browsers keep it 60 seconds, the CDN keeps it 10 minutes.
[04:26] Part three, validation. What happens when max-age runs out? The browser doesn't throw the file away, it asks the server: has this changed?
[04:44] It does that with an ETag. The server sends ETag, a fingerprint of the content, and the browser later sends If-None-Match with that value.
[05:02] If nothing changed, the server answers 304 Not Modified with an empty body. That's a few hundred bytes instead of the whole file.
[05:21] There's also Last-Modified and If-Modified-Since, which works on dates. ETags are more precise, so prefer them when you can.
[05:40] One gotcha: if you run several servers behind a load balancer, make sure they generate the same ETag for the same file, or every request misses.
[06:01] We had that bug. Our ETag included the inode number, which was different on each machine, so our cache hit rate was basically zero for months.
[06:22] Part four, invalidation. Phil Karlton said there are only two hard things in computer science: cache invalidation and naming things.
[06:39] The easiest invalidation is not needing it. Fingerprinted file names mean a new deploy gets new URLs, so nothing old is ever served.
[06:57] For HTML you can't fingerprint the URL, so keep max-age short, like zero with no-cache, and let the ETag do the work.
[07:16] For APIs, use stale-while-revalidate. The cache serves the old response instantly and fetches a fresh one in the background.
[07:35] And for CDNs, every provider has a purge API. Purge by tag if you can, not by URL, because one product change can touch hundreds of URLs.
[07:56] Let me summarize. Fingerprint your static files and cache them for a year. Use no-cache plus ETags for HTML.
[08:13] Use private for anything personal, no-store for anything sensitive, and stale-while-revalidate for APIs.
[08:30] If you do just the first one, fingerprinting plus a long max-age, you'll get most of the benefit this week.
[08:46] Thanks for watching. The checklist is in the description, and next week we're doing service workers.
