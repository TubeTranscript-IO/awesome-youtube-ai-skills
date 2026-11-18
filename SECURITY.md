# Security policy

This repository holds agent skills and their scripts. The TubeTranscript API and MCP servers they call are hosted services and are not in this repository.

## Supported versions

Security fixes go into the `main` branch. Update installed skills with `npx skills add TubeTranscript-IO/awesome-youtube-ai-skills` again.

## Reporting a vulnerability

Email **support@tubetranscript.io** with "Security" in the subject, a description of the problem and the steps to reproduce it. Please do not open a public issue for a vulnerability, whether it is in a skill (for example a script that could leak the API key saved in `~/.config/tubetranscript/credentials`, write outside the project, or run a command built from a video's title or transcript) or in the hosted service. We will reply by email.

A bug that does not expose keys, files, data or accounts can go in a normal issue.

## Never post your API key

Do not paste a real API key (`tt_live_...`) into an issue, a discussion, a pull request, an agent transcript or a screenshot. Replace it with the placeholder `tt_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` first.

If a key was exposed, revoke it in your TubeTranscript dashboard and create a new one.
