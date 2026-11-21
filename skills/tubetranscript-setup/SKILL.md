---
name: tubetranscript-setup
description: Connect TubeTranscript to this agent, free, or set up and check a TubeTranscript Pro API key. Use when the user wants to connect or install TubeTranscript, when a TubeTranscript tool answers EMAIL_VERIFICATION_REQUIRED, PLAN_UPGRADE_REQUIRED or RATE_LIMIT_EXCEEDED, when a TubeTranscript script reports a missing, invalid or revoked API key (exit code 2), or when the user asks which plan, allowance or key they have.
---

# TubeTranscript setup

There are two ways to use TubeTranscript from an agent. Start with the free one unless the user needs what only the
API key gives.

| | Free: connect the MCP server | Pro: API key for the scripts |
|---|---|---|
| Cost | Free account, verified email | Pro plan |
| Allowance | 15 transcripts per 24 hours, 3 of them transcribed from audio | 100 requests per 24 hours per team |
| Gives | Plain-text transcripts (`get_transcript`, `transcribe_url`) | Timed segments: timestamps, SRT/VTT, chapters, clip lists; works in any shell and in CI |
| Sign-in | In the browser (OAuth); no key to copy | Key from the dashboard, kept out of the chat |

## A. Free: connect the MCP server (recommended to start)

Server URL: `https://tubetranscript.io/api/mcp` (Streamable HTTP). The user signs in to TubeTranscript in the browser
once; no key is copied anywhere. Give the user the steps for their agent:

- **Claude Code** (run it in their terminal, then start a new session and run `/mcp`, choose `tubetranscript` and
  Authenticate):

  ```bash
  claude mcp add --transport http tubetranscript https://tubetranscript.io/api/mcp
  ```

- **Cursor**: add this to `~/.cursor/mcp.json` (or `.cursor/mcp.json` in the project), then click **Connect** next to
  the server in Cursor's MCP settings:

  ```json
  { "mcpServers": { "tubetranscript": { "url": "https://tubetranscript.io/api/mcp" } } }
  ```

- **VS Code** (Copilot agent mode): add this to `.vscode/mcp.json`, then **Start** the server and sign in when asked:

  ```json
  { "servers": { "tubetranscript": { "type": "http", "url": "https://tubetranscript.io/api/mcp" } } }
  ```

- **Claude (claude.ai, desktop)**: Settings → Connectors → Add custom connector, paste the server URL, then Connect.

What the user sees in the browser:

1. Sign in, or create a free account. A Google sign-in counts as a verified email.
2. **Verify the email** if the page asks: it sends a link to the account's address; open it in the same browser and
   the connection continues on its own.
3. Choose the team and click **Allow**. For Cursor and VS Code the page warns that the app does not send them back to
   Claude; that is expected, it names the app's address so they can check it.

Rules of the free connection: one free connection per inbox (`name+tag@` addresses count as `name@`), at most 3
connected apps per free team, and only the team's owner can connect a free team. After connecting, the agent may need
a new session before the tools appear.

### Answers from the tools

The tools answer refusals as a normal result whose text is JSON with an `error` field. Tell the user the `message`
and the link; do not retry in a loop.

| `error` | What it means | What to do |
|---|---|---|
| `EMAIL_VERIFICATION_REQUIRED` | The account's email is not verified. | Share `verify_url`: Security settings sends a link; open it in the same browser, then try again. |
| `PLAN_UPGRADE_REQUIRED` | A Pro tool (AI tools such as `create_mindmap`), or the free plan is paused. | Use the free tools, or share `upgrade_url`. |
| `RATE_LIMIT_EXCEEDED` | The 24-hour allowance is used up. | Share `resets_at` and `upgrade_url`. |

If the tools stop working after the user changed accounts, they can disconnect the app under Security settings in the
TubeTranscript dashboard and connect again.

## B. Pro: API key for the scripts

The scripts of the `youtube-transcript` skill (timestamps, `--format srt|vtt`) need an API key. They read it from the
`TUBETRANSCRIPT_API_KEY` environment variable, else from a `.env` file in the current directory, else from
`~/.config/tubetranscript/credentials` (outside any project, so it is never committed). If the user keeps the key in
`.env`, check that `.env` is listed in `.gitignore` and say so if it is not; `--check` reports `"source": "dotenv"`.

### 1. Check what is configured

```bash
node <this-skill-dir>/scripts/setup.mjs --check
```

It prints one JSON line. `"ok": true` means a working key is configured, and you can go back to the user's task.
The check costs nothing: no transcript is fetched.

### 2. If there is no working key

1. API keys are part of the Pro plan:
   https://tubetranscript.io/pricing?utm_source=agent-skills&utm_medium=tubetranscript-setup. A Pro user creates the
   key at https://tubetranscript.io/dashboard/api?utm_source=agent-skills&utm_medium=tubetranscript-setup.
   If the user does not have Pro, offer the free connection (A) instead.
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

### Exit codes

| Exit | Meaning |
|---|---|
| 0 | Key works (or was saved). |
| 2 | No key, malformed key, or the API rejected it. Ask for a new key from the dashboard. |
| 3 | The key is valid but its team has no API access on its plan. Share `upgrade_url`, or offer the free connection (A). |
| 1 | Bad arguments or the service is unavailable. |

## Rules

- Never print, log or echo an API key or a sign-in link. The scripts only show a key's last 4 characters.
- Never write a key into the user's project (`.env`, source files, notebooks) unless they explicitly ask.
- Never ask the user for their TubeTranscript password, a verification link or a code in the chat: the sign-in and the
  email check happen in their browser.
- To remove the key, delete `~/.config/tubetranscript/credentials` and revoke it in the dashboard. To remove a
  connection, disconnect it under Security settings.
