# Releasing the agent skills

Developed in the main repository under `sdk/agent-skills/` (source of truth, reviewed with the API changes it
depends on) and published from `TubeTranscript-IO/awesome-youtube-ai-skills`, a separate checkout next to the main
repository. `npx skills add TubeTranscript-IO/awesome-youtube-ai-skills` installs from that repository's default
branch (`main`), so every push to `main` there is a release to users, tagged or not.

## Setup (once, per machine)

```bash
git clone https://github.com/TubeTranscript-IO/awesome-youtube-ai-skills.git ../awesome-youtube-ai-skills
```

Commits to the public repository use the GitHub noreply address, not a personal email:

```bash
git -C ../awesome-youtube-ai-skills config user.email "<id>+<login>@users.noreply.github.com"
```

Repository secret `TUBETRANSCRIPT_TEST_KEY` (once, on GitHub): a Pro key of an internal team. Each tagged release
spends one request, or none when the video is already cached for that team.

## Each release

1. In the main repository: bump `version` in `package.json` and `const VERSION` in every `skills/*/scripts/*.mjs`
   (`npm test` fails if they disagree), add a CHANGELOG entry, and run `npm test` in `sdk/agent-skills`.
2. Merge and deploy the main repository first when the skills rely on a new API behaviour (the scripts call
   production). Publishing before the deploy ships skills that fail for every user.
3. Optional live check with your own key: `node skills/youtube-transcript/scripts/transcript.mjs jNQXAC9IVRw --out /tmp/t`.
4. Sync and push (`--delete` removes files deleted in the main repository; `.git` is kept):

   ```bash
   rsync -a --delete --exclude .git --exclude node_modules --exclude .DS_Store sdk/agent-skills/ ../awesome-youtube-ai-skills/
   cd ../awesome-youtube-ai-skills && npm test && git add -A && git commit -m "<version>: <summary>" && git push
   ```

5. Tag `v<version>` and push the tag. CI runs the tests on Node 18-24 and, on tags, one live call against production.

`.gitignore` of the public repository lives in `sdk/agent-skills/.gitignore` and is synced like any other file.

## Compatibility rules

- The scripts follow the public contract of `GET /api/mcp/transcript` (`?chunks=1`: `chunks`, `language`,
  `video_title`) and the MCP `transcribe_url` / `tools/list` methods. Server changes to them must be additive.
- The `X-TubeTranscript-Client` value must keep matching the server pattern in `lib/agent/client.ts`
  (`skills/<x.y.z>/<skill-folder>`, folder names up to 32 lowercase characters).
- The key format check (`tt_live_` + 32 characters) mirrors the API, as in the Python SDK.
