#!/usr/bin/env node
// Fetches a video transcript from TubeTranscript and saves it as a Markdown file with timestamps.
// Zero dependencies (Node 18+). Prints ONE JSON line on stdout; progress goes to stderr.
// Usage: node transcript.mjs <youtube-url-or-id | tiktok/instagram/facebook-url> [--out DIR] [--wait SECONDS]
//          [--format md|srt|vtt|json] [--via SKILL-NAME]
// --format srt|vtt writes a subtitle file, --format json the timed segments for other scripts (both need timestamps,
// so YouTube only). --via names the skill that ran
// the script (e.g. youtube-to-srt), sent in the X-TubeTranscript-Client header.
// Exit codes: 0 saved, 1 usage/other, 2 API key missing/invalid, 3 plan or quota, 4 video error, 5 still processing.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = '0.1.0';
const SKILL = 'youtube-transcript';
const BASE_URL = (process.env.TUBETRANSCRIPT_BASE_URL || 'https://tubetranscript.io').replace(/\/+$/, '');
const UTM = `utm_source=agent-skills&utm_medium=${SKILL}`;
const EXIT = { ok: 0, other: 1, auth: 2, quota: 3, video: 4, processing: 5 };
const FORMATS = ['md', 'srt', 'vtt', 'json'];
let clientSkill = SKILL;

class Stop extends Error {
  constructor(exit, code, message, extra = {}) { super(message); this.exit = exit; this.code = code; this.extra = extra; }
}

const log = message => process.stderr.write(`${message}\n`);
const sleep = ms => new Promise(done => setTimeout(done, ms));

export function parseArgs(argv) {
  const args = { input: null, out: 'transcripts', wait: 600, format: 'md', via: SKILL };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--out') args.out = argv[++i];
    else if (arg === '--wait') args.wait = Number(argv[++i]);
    else if (arg === '--format') args.format = argv[++i];
    else if (arg === '--via') args.via = argv[++i];
    else if (arg === '-h' || arg === '--help') args.help = true;
    else if (!args.input) args.input = arg;
    else throw new Stop(EXIT.other, 'USAGE', `Unexpected argument: ${arg}`);
  }
  if (!args.help && !args.input) throw new Stop(EXIT.other, 'USAGE', 'Pass a video URL or an 11-character YouTube video id.');
  if (!args.out || !Number.isFinite(args.wait) || args.wait < 0) throw new Stop(EXIT.other, 'USAGE', '--out needs a directory, --wait a number of seconds.');
  if (!FORMATS.includes(args.format)) throw new Stop(EXIT.other, 'USAGE', `--format must be one of ${FORMATS.join(', ')}.`);
  if (!/^[a-z0-9-]{1,32}$/.test(args.via ?? '')) throw new Stop(EXIT.other, 'USAGE', '--via must be a skill folder name.');
  return args;
}

/** TUBETRANSCRIPT_API_KEY from a dotenv file (`KEY=value`, optional `export` and quotes), or null. */
export function keyFromDotenv(path) {
  try {
    const line = readFileSync(path, 'utf8').split(/\r?\n/).find(l => /^\s*(export\s+)?TUBETRANSCRIPT_API_KEY\s*=/.test(l));
    return line?.replace(/^\s*(export\s+)?TUBETRANSCRIPT_API_KEY\s*=\s*/, '').replace(/\s+#.*$/, '').trim().replace(/^["']|["']$/g, '') || null;
  } catch {
    return null;
  }
}

/**
 * The API key: TUBETRANSCRIPT_API_KEY in the environment, else in `.env` of the current directory (Node does not load
 * .env files by itself), else the credentials file written by the tubetranscript-setup skill.
 */
export function readApiKey(env = process.env, cwd = process.cwd()) {
  if (env.TUBETRANSCRIPT_API_KEY?.trim()) return env.TUBETRANSCRIPT_API_KEY.trim();
  const dotenv = keyFromDotenv(join(cwd, '.env'));
  if (dotenv) return dotenv;
  const file = join(env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'tubetranscript', 'credentials');
  try {
    const line = readFileSync(file, 'utf8').split(/\r?\n/).map(l => l.trim()).find(l => l && !l.startsWith('#'));
    const key = line?.replace(/^TUBETRANSCRIPT_API_KEY\s*=\s*/, '').replace(/^["']|["']$/g, '');
    if (key) return key;
  } catch { /* no file */ }
  return null;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOST = /(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/i;

/** 'youtube' (REST endpoint with timestamps) or 'link' (any other platform, through the MCP tool). */
export function classify(input) {
  if (YOUTUBE_ID.test(input)) return { kind: 'youtube', query: `video_id=${input}`, id: input };
  let url;
  try { url = new URL(input); } catch { throw new Stop(EXIT.other, 'USAGE', 'Not a video URL or an 11-character YouTube video id.'); }
  if (YOUTUBE_HOST.test(url.hostname)) return { kind: 'youtube', query: `video_url=${encodeURIComponent(input)}`, id: null };
  return { kind: 'link', url: input };
}

function headers(key, extra = {}) {
  return {
    Authorization: `Bearer ${key}`,
    'User-Agent': `tubetranscript-skills/${VERSION} (${clientSkill})`,
    'X-TubeTranscript-Client': `skills/${VERSION}/${clientSkill}`,
    ...extra,
  };
}

async function readJson(response) {
  try { return await response.json(); } catch { return {}; }
}

/** Turns a non-2xx answer into a Stop with the right exit code and a next step. */
function failure(status, body, retryAfter) {
  if (status === 402) {
    const reason = body.reason;
    const pricing = `${body.invoice?.payment_url || 'https://tubetranscript.io/pricing'}${(body.invoice?.payment_url || '').includes('?') ? '&' : '?'}${UTM}`;
    if (reason === 'MISSING_API_KEY' || reason === 'INVALID_API_KEY') {
      return new Stop(EXIT.auth, reason, 'The TubeTranscript API key is missing, invalid or revoked. Run the tubetranscript-setup skill.', { setup_url: `https://tubetranscript.io/dashboard/api?${UTM}` });
    }
    if (reason === 'PLAN_UPGRADE_REQUIRED') {
      return new Stop(EXIT.quota, reason, 'This API needs a Pro plan for this key.', { upgrade_url: pricing });
    }
    const wait = retryAfter ? ` Try again in about ${Math.ceil(Number(retryAfter) / 60)} minutes,` : '';
    return new Stop(EXIT.quota, reason || 'RATE_LIMIT_EXCEEDED', `The daily transcript allowance is used up.${wait} or upgrade for more.`, { upgrade_url: pricing, retry_after_seconds: retryAfter ? Number(retryAfter) : undefined });
  }
  if (status === 429) return new Stop(EXIT.quota, body.error || 'RATE_LIMIT_EXCEEDED', body.message || 'Too many requests. Wait and try again.', { retry_after_seconds: retryAfter ? Number(retryAfter) : undefined });
  if (status === 400) return new Stop(EXIT.other, body.error || 'INVALID_INPUT', body.message || 'That link is not a single video. Pass a video URL or ID.');
  if (status >= 400 && status < 500) return new Stop(EXIT.video, body.error || `HTTP_${status}`, body.message || `The request was refused (HTTP ${status}).`);
  return new Stop(EXIT.other, body.error || `HTTP_${status}`, body.message || `TubeTranscript is unavailable (HTTP ${status}). Try again later.`);
}

async function fetchYouTube(key, target) {
  const response = await fetch(`${BASE_URL}/api/mcp/transcript?${target.query}&chunks=1`, { headers: headers(key) });
  const body = await readJson(response);
  if (response.status === 202) return { status: 'processing', jobId: body.job_id, retryAfter: Number(response.headers.get('retry-after')) || 30 };
  if (!response.ok) throw failure(response.status, body, response.headers.get('retry-after'));
  return { status: 'completed', jobId: body.job_id, text: body.content?.[0]?.text ?? '', chunks: body.chunks ?? [], language: body.language ?? null, title: body.video_title ?? null };
}

let rpcId = 0;
async function fetchLink(key, target) {
  const response = await fetch(`${BASE_URL}/api/mcp`, {
    method: 'POST',
    headers: headers(key, { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }),
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method: 'tools/call', params: { name: 'transcribe_url', arguments: { url: target.url } } }),
  });
  const body = await readJson(response);
  if (!response.ok) throw failure(response.status, body.error && typeof body.error === 'object' ? { error: 'INVALID_ARGUMENTS', message: body.error.message } : body, response.headers.get('retry-after'));
  const result = body.result;
  if (!result) throw new Stop(EXIT.other, 'BAD_RESPONSE', 'Unexpected answer from TubeTranscript.');
  if (result.isError) throw new Stop(EXIT.video, 'TOOL_ERROR', result.content?.[0]?.text || 'The video could not be transcribed.');
  const data = result.structuredContent ?? {};
  if (data.status === 'processing') return { status: 'processing', jobId: data.job_id, retryAfter: 60, id: data.video_id, platform: data.platform };
  return { status: 'completed', jobId: data.job_id, text: data.transcript ?? '', chunks: [], language: null, title: null, id: data.video_id, platform: data.platform };
}

/** Asks until the transcript is ready. A new job id means the previous job ended without a transcript: stop, never loop. */
export async function getTranscript(key, target, { wait = 600, now = Date.now, pause = sleep } = {}) {
  const fetchOnce = target.kind === 'youtube' ? fetchYouTube : fetchLink;
  const deadline = now() + wait * 1000;
  let firstJob = null;
  let told = false;
  for (;;) {
    const result = await fetchOnce(key, target);
    if (result.status === 'completed') return result;
    if (firstJob && result.jobId && result.jobId !== firstJob) {
      throw new Stop(EXIT.video, 'TRANSCRIPTION_FAILED', 'Audio transcription finished without a transcript (no speech, video too long for the plan, or the AI transcription allowance is used up).', { job_id: firstJob });
    }
    firstJob ??= result.jobId;
    if (!told) { log('No captions: the video is being transcribed from audio. This can take a few minutes...'); told = true; }
    const delay = Math.min(Math.max(result.retryAfter || 30, 10), 60) * 1000;
    if (now() + delay > deadline) {
      throw new Stop(EXIT.processing, 'STILL_PROCESSING', 'Still transcribing. Run the same command again later; it resumes the same job and costs no extra request.', { job_id: firstJob });
    }
    await pause(delay);
  }
}

export function stamp(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const two = n => String(n).padStart(2, '0');
  return h ? `${h}:${two(m)}:${two(r)}` : `${two(m)}:${two(r)}`;
}

export function toMarkdown({ id, url, title, language, jobId, chunks, text }) {
  const lines = [
    `# ${String(title || id).replace(/\s+/g, ' ').trim()}`,
    '',
    `- URL: ${url}`,
    `- Language: ${language || 'unknown'}`,
    `- Job: ${jobId || 'unavailable'}`,
    '- Source: TubeTranscript (https://tubetranscript.io)',
    '',
  ];
  if (chunks.length) for (const chunk of chunks) lines.push(`[${stamp(chunk.start)}] ${String(chunk.text).replace(/\s+/g, ' ').trim()}`);
  else lines.push(text.trim());
  return `${lines.join('\n')}\n`;
}

/** SRT or WebVTT cue time: hh:mm:ss,mmm (SRT) or hh:mm:ss.mmm (VTT). */
export function cueTime(seconds, format) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const two = n => String(n).padStart(2, '0');
  const time = `${two(Math.floor(ms / 3600000))}:${two(Math.floor(ms / 60000) % 60)}:${two(Math.floor(ms / 1000) % 60)}`;
  return `${time}${format === 'srt' ? ',' : '.'}${String(ms % 1000).padStart(3, '0')}`;
}

/**
 * Subtitle file from timed chunks. A cue ends at start + duration, cut at the next cue's start so cues never
 * overlap (CapCut and Premiere import overlaps badly), and lasts at least 0.5 s.
 */
export function toSubtitles(chunks, format) {
  const cues = chunks
    .map(chunk => ({ start: Number(chunk.start) || 0, duration: Number(chunk.duration) || 0, text: String(chunk.text).replace(/\s+/g, ' ').trim() }))
    .filter(cue => cue.text);
  const blocks = cues.map((cue, i) => {
    const next = cues[i + 1]?.start;
    let end = cue.start + (cue.duration > 0 ? cue.duration : 3);
    if (next !== undefined && next > cue.start) end = Math.min(end, next);
    end = Math.max(end, cue.start + 0.5);
    const timing = `${cueTime(cue.start, format)} --> ${cueTime(end, format)}`;
    return format === 'srt' ? `${i + 1}\n${timing}\n${cue.text}` : `${timing}\n${cue.text}`;
  });
  return `${format === 'vtt' ? 'WEBVTT\n\n' : ''}${blocks.join('\n\n')}\n`;
}

function videoIdFromUrl(input) {
  const url = new URL(input);
  if (/youtu\.be$/i.test(url.hostname)) return url.pathname.split('/')[1];
  return url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop();
}

export async function run(argv, env = process.env) {
  const args = parseArgs(argv);
  if (args.help) { log('Usage: node transcript.mjs <video-url-or-id> [--out DIR] [--wait SECONDS] [--format md|srt|vtt|json] [--via SKILL]'); return { exit: EXIT.ok, output: null }; }
  clientSkill = args.via;
  const key = readApiKey(env);
  if (!key) throw new Stop(EXIT.auth, 'MISSING_API_KEY', 'No TubeTranscript API key found. Run the tubetranscript-setup skill.', { setup_url: `https://tubetranscript.io/dashboard/api?${UTM}` });
  const target = classify(args.input);
  const result = await getTranscript(key, target, { wait: args.wait });
  const id = target.kind === 'youtube' ? (target.id || videoIdFromUrl(args.input)) : `${result.platform || 'video'}-${result.id || 'unknown'}`;
  const url = target.kind === 'youtube' ? `https://www.youtube.com/watch?v=${id}` : target.url;
  const safeId = String(id).replace(/[^A-Za-z0-9_-]/g, '_');
  const dir = resolve(args.out);
  mkdirSync(dir, { recursive: true });
  if (args.format !== 'md' && !result.chunks.length) {
    throw new Stop(EXIT.video, 'NO_TIMESTAMPS', `This transcript has no timestamps, so no ${args.format.toUpperCase()} file can be made. Use --format md for plain text.`, { job_id: result.jobId });
  }
  const path = join(dir, `${safeId}.${(result.language || 'auto').replace(/[^A-Za-z0-9-]/g, '_')}.${args.format}`);
  const meta = { id, url, title: result.title, language: result.language, jobId: result.jobId, chunks: result.chunks, text: result.text };
  writeFileSync(path, args.format === 'md' ? toMarkdown(meta)
    : args.format === 'json' ? `${JSON.stringify({ video_id: id, url, title: result.title, language: result.language, job_id: result.jobId, chunks: result.chunks }, null, 1)}\n`
      : toSubtitles(result.chunks, args.format));
  const last = result.chunks.at(-1);
  return {
    exit: EXIT.ok,
    output: {
      ok: true, path, format: args.format, video_id: id, url, title: result.title, language: result.language, job_id: result.jobId,
      segments: result.chunks.length, duration_seconds: last ? Math.round(last.start + (last.duration || 0)) : null,
      timestamps: result.chunks.length > 0, characters: result.text.length,
    },
  };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const { exit, output } = await run(process.argv.slice(2));
    if (output) process.stdout.write(`${JSON.stringify(output)}\n`);
    process.exitCode = exit;
  } catch (error) {
    if (error instanceof Stop) {
      process.stdout.write(`${JSON.stringify({ ok: false, code: error.code, message: error.message, ...error.extra })}\n`);
      process.exitCode = error.exit;
    } else {
      process.stdout.write(`${JSON.stringify({ ok: false, code: 'NETWORK_ERROR', message: `Could not reach TubeTranscript: ${error.message}` })}\n`);
      process.exitCode = EXIT.other;
    }
  }
}

export { Stop, EXIT };
