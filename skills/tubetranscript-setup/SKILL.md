---
name: tubetranscript-setup
description: Set up, check or replace the TubeTranscript API key used by the youtube-transcript skill. Use when a TubeTranscript script reports a missing, invalid or revoked API key (exit code 2), when the user wants to connect TubeTranscript, or asks which plan or allowance their key has.
---

# TubeTranscript setup

The other TubeTranscript skills read the API key from the `TUBETRANSCRIPT_API_KEY` environment variable, else from
a `.env` file in the current directory, else from `~/.config/tubetranscript/credentials` (outside any project, so
it is never committed). If the user keeps the key in `.env`, check that `.env` is listed in `.gitignore` and say so
if it is not; `--check` reports `"source": "dotenv"` in that case.

## 1. Check what is configured

```bash
node <this-skill-dir>/scripts/setup.mjs --check
```

It prints one JSON line. `"ok": true` means a working key is configured, and you can go back to the user's task.
The check costs nothing: no transcript is fetched.

## 2. If there is no working key

1. Tell the user to create a key at https://tubetranscript.io/dashboard/api?utm_source=agent-skills&utm_medium=tubetranscript-setup
   (sign in or sign up first). API keys currently need the Pro plan:
   https://tubetranscript.io/pricing?utm_source=agent-skills&utm_medium=tubetranscript-setup
2. **Do not ask the user to paste the key into the chat.** Ask them to run this in their own terminal, where the
   input is hidden:

   ```bash
   node <this-skill-dir>/scripts/setup.mjs --save
   ```

   It checks the key with the API and saves it with owner-only permissions. Without a terminal it stops at once
   instead of waiting; `--save --stdin` reads a piped key (for example from a password manager CLI).
   If the user has already exported `TUBETRANSCRIPT_API_KEY` in your shell, you can run `--from-env` yourself
   to save it for later sessions.
3. Run `--check` again, then continue with the original request.

## Exit codes

| Exit | Meaning |
|---|---|
| 0 | Key works (or was saved). |
| 2 | No key, malformed key, or the API rejected it. Ask for a new key from the dashboard. |
| 3 | The key is valid but its team has no API access on its plan. Share `upgrade_url`. |
| 1 | Bad arguments or the service is unavailable. |

## Rules

- Never print, log or echo the key. The scripts only show its last 4 characters.
- Never write the key into the user's project (`.env`, source files, notebooks) unless they explicitly ask.
- To remove the key, delete `~/.config/tubetranscript/credentials` and revoke it in the dashboard.
