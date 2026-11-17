#!/usr/bin/env node
// Checks or saves the TubeTranscript API key for the agent skills. Zero dependencies (Node 18+).
//   node setup.mjs --check      Is a key configured, and does the API accept it? (free: no transcript is fetched)
//   node setup.mjs --save       Prompt for a key without echoing it (needs a terminal), check it, save it.
//   node setup.mjs --save --stdin   Same, reading the key from piped stdin (e.g. from a password manager).
//   node setup.mjs --from-env   Save the key from $TUBETRANSCRIPT_API_KEY to the credentials file.
// The key is never printed. Prints ONE JSON line on stdout. Exit codes: 0 ok, 1 usage/other, 2 key missing/invalid, 3 plan.
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = '0.1.0';
const SKILL = 'tubetranscript-setup';
const BASE_URL = (process.env.TUBETRANSCRIPT_BASE_URL || 'https://tubetranscript.io').replace(/\/+$/, '');
const UTM = `utm_source=agent-skills&utm_medium=${SKILL}`;
const KEY_PATTERN = /^tt_live_[A-Za-z0-9_-]{32}$/;

export function credentialsPath(env = process.env) {
  return join(env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'tubetranscript', 'credentials');
}

function readSavedKey(env) {
  try {
    const line = readFileSync(credentialsPath(env), 'utf8').split(/\r?\n/).map(l => l.trim()).find(l => l && !l.startsWith('#'));
    return line?.replace(/^TUBETRANSCRIPT_API_KEY\s*=\s*/, '').replace(/^["']|["']$/g, '') || null;
  } catch {
    return null;
  }
}

function keyFromDotenv(path) {
  try {
    const line = readFileSync(path, 'utf8').split(/\r?\n/).find(l => /^\s*(export\s+)?TUBETRANSCRIPT_API_KEY\s*=/.test(l));
    return line?.replace(/^\s*(export\s+)?TUBETRANSCRIPT_API_KEY\s*=\s*/, '').replace(/\s+#.*$/, '').trim().replace(/^["']|["']$/g, '') || null;
  } catch {
    return null;
  }
}

/** Where the key would come from, in the order the other skills read it: environment, ./.env, credentials file. */
export function currentKey(env = process.env, cwd = process.cwd()) {
  if (env.TUBETRANSCRIPT_API_KEY?.trim()) return { key: env.TUBETRANSCRIPT_API_KEY.trim(), source: 'env' };
  const dotenv = keyFromDotenv(join(cwd, '.env'));
  if (dotenv) return { key: dotenv, source: 'dotenv' };
  const saved = readSavedKey(env);
  return saved ? { key: saved, source: 'file' } : { key: null, source: null };
}

/** MCP tools/list: authenticates the key without spending any quota. */
export async function verifyKey(key) {
  const response = await fetch(`${BASE_URL}/api/mcp`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'User-Agent': `tubetranscript-skills/${VERSION} (${SKILL})`,
      'X-TubeTranscript-Client': `skills/${VERSION}/${SKILL}`,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
  });
  if (response.ok) return { valid: true };
  let body = {};
  try { body = await response.json(); } catch { /* not JSON */ }
  if (response.status === 402 && body.reason === 'PLAN_UPGRADE_REQUIRED') return { valid: false, exit: 3, code: body.reason, message: 'The key is valid but its team is not on a plan with API access.', upgrade_url: `https://tubetranscript.io/pricing?${UTM}` };
  if (response.status === 402) return { valid: false, exit: 2, code: body.reason || 'INVALID_API_KEY', message: 'The API key is invalid or revoked. Create a new one in the dashboard.' };
  return { valid: false, exit: 1, code: `HTTP_${response.status}`, message: `TubeTranscript is unavailable (HTTP ${response.status}). Try again later.` };
}

export function saveKey(key, env = process.env) {
  const path = credentialsPath(env);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, `TUBETRANSCRIPT_API_KEY=${key}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
  return path;
}

function promptHidden(question, { fromStdin = false } = {}) {
  return new Promise((done, fail) => {
    const input = process.stdin;
    if (!input.isTTY && !fromStdin) {
      fail(new Error('No terminal to type the key in. Ask the user to run "setup.mjs --save" in their own terminal.'));
      return;
    }
    if (!input.isTTY) {
      let data = '';
      input.setEncoding('utf8');
      input.on('data', chunk => { data += chunk; });
      input.on('end', () => done(data.trim()));
      input.on('error', fail);
      return;
    }
    process.stderr.write(question);
    input.setRawMode(true);
    input.resume();
    input.setEncoding('utf8');
    let value = '';
    const onData = chunk => {
      for (const char of chunk) {
        const finish = () => { input.setRawMode(false); input.pause(); input.off('data', onData); process.stderr.write('\n'); };
        if (char === '\r' || char === '\n') { finish(); done(value.trim()); return; }
        if (char === '\u0003') { finish(); fail(new Error('Cancelled')); return; }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else value += char;
      }
    };
    input.on('data', onData);
  });
}

const dashboard = `https://tubetranscript.io/dashboard/api?${UTM}`;

export async function run(argv, env = process.env, ask = promptHidden) {
  const mode = argv[0];
  if (mode === '--check') {
    const { key, source } = currentKey(env);
    if (!key) return { exit: 2, output: { ok: false, code: 'MISSING_API_KEY', message: 'No API key configured.', create_key_url: dashboard, credentials_path: credentialsPath(env) } };
    const verdict = await verifyKey(key);
    if (!verdict.valid) return { exit: verdict.exit, output: { ok: false, source, ...verdict, valid: undefined, exit: undefined, create_key_url: dashboard } };
    return { exit: 0, output: { ok: true, source, key_hint: `…${key.slice(-4)}` } };
  }
  if (mode === '--save' || mode === '--from-env') {
    const key = mode === '--from-env' ? env.TUBETRANSCRIPT_API_KEY?.trim() : await ask('Paste your TubeTranscript API key (input hidden): ', { fromStdin: argv.includes('--stdin') });
    if (!key) return { exit: 2, output: { ok: false, code: 'MISSING_API_KEY', message: mode === '--from-env' ? 'TUBETRANSCRIPT_API_KEY is not set.' : 'No key entered.', create_key_url: dashboard } };
    if (!KEY_PATTERN.test(key)) return { exit: 2, output: { ok: false, code: 'MALFORMED_API_KEY', message: 'That does not look like a TubeTranscript key (tt_live_ followed by 32 characters).', create_key_url: dashboard } };
    const verdict = await verifyKey(key);
    if (!verdict.valid) return { exit: verdict.exit, output: { ok: false, ...verdict, valid: undefined, exit: undefined, create_key_url: dashboard } };
    return { exit: 0, output: { ok: true, saved_to: saveKey(key, env), key_hint: `…${key.slice(-4)}` } };
  }
  return { exit: 1, output: { ok: false, code: 'USAGE', message: 'Use --check, --save or --from-env.' } };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const { exit, output } = await run(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(output)}\n`);
    process.exitCode = exit;
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ ok: false, code: 'ERROR', message: error.message })}\n`);
    process.exitCode = 1;
  }
}
